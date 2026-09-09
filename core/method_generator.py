""" Database generating methods with schema support """

from core.logger import logger

from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from typing import Any, Dict, Type
from functools import wraps
import importlib.util
import threading
import sqlite3
import inspect
import os

SQL_TYPES = {
    int: "INTEGER",
    str: "TEXT",
    float: "REAL",
    bool: "INTEGER",
    bytes: "BLOB"
}

IGNORED_DIRS = {
    "venv",
    ".venv",
    "env",
    "__pycache__",
    ".git",
    ".idea",
    ".vscode"
}


def load_module_from_path(module_name, file_path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def ensure_schema(root_path="."):
    db = AutoDB(cm)
    for root, dirs, files in os.walk(root_path):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
        for file in files:
            if file == "schema.py":
                file_path = os.path.join(root, file)
                module_name = (
                    os.path.relpath(file_path, root_path)
                    .replace(os.sep, ".")
                    .replace(".py", "")
                )
                try:
                    module = load_module_from_path(module_name, file_path)
                except ImportError as e:
                    logger.error(f"Failed to import {file_path}: {e}")
                    continue
                logger.info(f"Loaded schema: {file_path}")
                for _, model in inspect.getmembers(module, inspect.isclass):
                    if issubclass(model, Schema) and model != Schema:
                        db.create_table_from_model(model)


def async_db_method(func):
    """ Decorator to convert sync db method to async """

    @wraps(func)
    async def wrapper(*args, **kwargs):
        return await run_in_threadpool(func, *args, **kwargs)

    return wrapper


def DBField(
        *,
        primary_key: bool = False,
        autoincrement: bool = False,
        unique: bool = False,
        index: bool = False,
        default=None,
        check: str = None,
):
    """
    Wrapper around Pydantic Field for describing database columns.

    Args:
        primary_key: Marks column as PRIMARY KEY
        autoincrement: Enables AUTOINCREMENT
        unique: Adds UNIQUE constraint
        index: Creates SQL index
        default: Default value
        check: SQL CHECK constraint
    """

    return Field(
        default=default,
        json_schema_extra={
            "primary_key": primary_key,
            "autoincrement": autoincrement,
            "unique": unique,
            "index": index,
            "check": check,
        },
    )


class Schema(BaseModel):
    __checks__: list[str] = []


class ConnectionManager:
    """
    Database connection manager using thread-local connections.

    Each worker thread receives its own SQLite connection.
    """

    def __init__(self, path: str = "database.db"):
        self.path = path
        self.local = threading.local()

    def get_connection(self) -> sqlite3.Connection:
        """ Returns thread-local connection or creates a new one. """

        if not hasattr(self.local, "connection"):
            logger.debug("Creating new SQLite connection")
            conn = sqlite3.connect(self.path)
            conn.row_factory = sqlite3.Row
            self.local.connection = conn

        return self.local.connection

    def dependency(self) -> "ConnectionManager":
        return self


def _table_name(model: Type[BaseModel]) -> str:
    return getattr(model, "__tablename__", model.__name__.lower())


def _get_column_definition(name: str, field, sql_type: str) -> str:
    extra = field.json_schema_extra or {}
    column_sql = f"{name} {sql_type}"

    if extra.get("primary_key"):
        column_sql += " PRIMARY KEY"
    if extra.get("autoincrement"):
        column_sql += " AUTOINCREMENT"
    if extra.get("unique"):
        column_sql += " UNIQUE"
    if extra.get("check"):
        column_sql += f" CHECK ({extra['check']})"

    default = field.default
    if default is not None and not extra.get("primary_key"):
        if isinstance(default, str):
            column_sql += f" DEFAULT '{default}'"
        else:
            column_sql += f" DEFAULT {default}"

    return column_sql


def _columns_match(pragma_row: dict, field, sql_type: str) -> bool:
    extra = field.json_schema_extra or {}

    if pragma_row["type"].upper() != sql_type:
        logger.debug(
            "Type mismatch: expected '%s', got '%s'",
            sql_type, pragma_row["type"].upper()
        )
        return False

    expected_default = field.default
    actual_default = pragma_row["dflt_value"]

    if expected_default is None:
        if actual_default is not None:
            logger.debug(
                "Default mismatch: expected None, got '%s'",
                actual_default
            )
            return False
    else:
        expected_str = f"'{expected_default}'" if isinstance(expected_default, str) else str(expected_default)
        if actual_default != expected_str:
            logger.debug(
                "Default mismatch: expected '%s', got '%s'",
                expected_str, actual_default
            )
            return False

    return True


class AutoDB:
    """
    Database with auto-generated methods and logging.
    Method-Driven Data Modeling (MDDM).

    Universal database access layer.

    - schema-based table generation
    - thread-local connections
    - async CRUD methods
    - automatic SQL generation
    """

    def __init__(self, connection_manager: ConnectionManager):
        self.cm = connection_manager

    def _get_connection(self) -> sqlite3.Connection:
        """ Returns thread-local connection """

        return self.cm.get_connection()

    def _get_cursor(self):
        return self._get_connection().cursor()

    def _recreate_table(self, model: Type[BaseModel], columns_definitions: list[str]):
        table = _table_name(model)
        temp_table = f"{table}_migration_new"

        columns_sql = ", ".join(columns_definitions)

        cursor = self._get_cursor()
        cursor.execute(f"PRAGMA table_info({table})")
        existing_columns = [row["name"] for row in cursor.fetchall()]

        new_column_names = [col.split()[0] for col in columns_definitions]
        shared_columns = [c for c in existing_columns if c in new_column_names]
        columns_list = ", ".join(shared_columns)

        logger.warning("Recreating table '%s' due to schema changes", table)
        logger.debug("Shared columns for data migration: %s", columns_list)

        cursor.execute(f"CREATE TABLE {temp_table} ({columns_sql})")
        logger.debug("Created temp table '%s'", temp_table)

        cursor.execute(f"INSERT INTO {temp_table} ({columns_list}) SELECT {columns_list} FROM {table}")
        logger.debug("Migrated data from '%s' to '%s'", table, temp_table)

        cursor.execute(f"DROP TABLE {table}")
        logger.debug("Dropped old table '%s'", table)

        cursor.execute(f"ALTER TABLE {temp_table} RENAME TO {table}")
        logger.info("Table '%s' recreated successfully", table)

        self._get_connection().commit()

    def create_table_from_model(self, model: Type[BaseModel]):
        table = _table_name(model)
        cursor = self._get_cursor()

        cursor.execute(f"PRAGMA table_info({table})")
        existing_columns = {row["name"]: row for row in cursor.fetchall()}
        logger.debug("Existing columns in '%s': %s", table, list(existing_columns.keys()))

        columns_definitions = []
        indexes = []
        needs_recreation = False

        for name, field in model.model_fields.items():
            if name == "__checks__":
                continue

            annotation = field.annotation
            sql_type = SQL_TYPES.get(annotation, "TEXT")
            column_def = _get_column_definition(name, field, sql_type)
            extra = field.json_schema_extra or {}

            if extra.get("index"):
                indexes.append(name)

            columns_definitions.append(column_def)

            if name in existing_columns:
                if not _columns_match(existing_columns[name], field, sql_type):
                    logger.warning(
                        "Column '%s.%s' is out of sync with schema — expected: [%s], got: type=%s default=%s",
                        table, name, column_def,
                        existing_columns[name]["type"],
                        existing_columns[name]["dflt_value"]
                    )
                    needs_recreation = True
                else:
                    logger.debug("Column '%s.%s' matches schema", table, name)
            else:
                if existing_columns:
                    alter_sql = f"ALTER TABLE {table} ADD COLUMN {column_def}"
                    logger.warning("Adding missing column '%s' to table '%s': %s", name, table, alter_sql)
                    cursor.execute(alter_sql)

        if not existing_columns:
            table_checks = getattr(model, "__checks__", [])
            checks_sql = [f"CHECK ({expr})" for expr in table_checks]
            all_parts = columns_definitions + checks_sql
            create_sql = f"CREATE TABLE IF NOT EXISTS {table} ({', '.join(all_parts)})"
            logger.warning("Table '%s' does not exist! Creating... %s", table, create_sql)
            cursor.execute(create_sql)
        elif needs_recreation:
            self._recreate_table(model, columns_definitions)

        for column in indexes:
            index_sql = f"CREATE INDEX IF NOT EXISTS idx_{table}_{column} ON {table}({column})"
            logger.debug("Executing SQL to create index '%s': %s", column, index_sql)
            cursor.execute(index_sql)

        self._get_connection().commit()
        logger.info("Table '%s' is up to date", table)

    def insert(self, model: Type[BaseModel], **values):
        table = _table_name(model)
        columns = ", ".join(values.keys())
        placeholders = ", ".join("?" for _ in values)
        sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
        logger.debug(sql)
        cursor = self._get_cursor()
        cursor.execute(sql, tuple(values.values()))
        self._get_connection().commit()
        row_id = values.get("id") or cursor.lastrowid
        return self.select_one(model, id=row_id)

    def select(self, model: Type[BaseModel], where: Dict[str, Any] = None):
        table = _table_name(model)
        sql = f"SELECT * FROM {table}"
        params = []
        if where:
            clause = " AND ".join(f"{k} = ?" for k in where)
            sql += f" WHERE {clause}"
            params = list(where.values())
        logger.debug(sql)
        cursor = self._get_cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def select_one(self, model: Type[BaseModel], **where):
        rows = self.select(model, where)
        return rows[0] if rows else None

    def update(self, model: Type[BaseModel], values: Dict[str, Any], where: Dict[str, Any]):
        table = _table_name(model)
        set_clause = ", ".join(f"{k} = ?" for k in values)
        where_clause = " AND ".join(f"{k} = ?" for k in where)
        sql = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"
        params = list(values.values()) + list(where.values())
        logger.debug(sql)
        cursor = self._get_cursor()
        cursor.execute(sql, params)
        self._get_connection().commit()
        return cursor.rowcount

    def delete(self, model: Type[BaseModel], **where):
        table = _table_name(model)
        clause = " AND ".join(f"{k} = ?" for k in where)
        sql = f"DELETE FROM {table} WHERE {clause}"
        logger.debug(sql)
        cursor = self._get_cursor()
        cursor.execute(sql, list(where.values()))
        self._get_connection().commit()
        return cursor.rowcount

    def delete_in(self, model: Type[BaseModel], **where):
        table = _table_name(model)
        clauses = []
        params = []
        for key, values in where.items():
            values = list(values)
            placeholders = ",".join("?" for _ in values)
            clauses.append(f"{key} IN ({placeholders})")
            params.extend(values)
        clause = " AND ".join(clauses)
        sql = f"DELETE FROM {table} WHERE {clause}"
        logger.debug(sql)
        cursor = self._get_cursor()
        cursor.execute(sql, params)
        self._get_connection().commit()
        return cursor.rowcount

    def execute(self, sql: str, params: tuple = None):
        params = params or ()
        logger.debug("Executing SQL: %s, params = %s", sql, params)
        cursor = self._get_cursor()
        cursor.execute(sql, params)
        self._get_connection().commit()
        try:
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except sqlite3.ProgrammingError:
            return []

    @async_db_method
    def insert_async(self, model: Type[BaseModel], **values):
        return self.insert(model, **values)

    @async_db_method
    def select_async(self, model: Type[BaseModel], where: Dict[str, Any] = None):
        return self.select(model, where)

    @async_db_method
    def select_one_async(self, model: Type[BaseModel], **where):
        return self.select_one(model, **where)

    @async_db_method
    def update_async(self, model: Type[BaseModel], values: Dict[str, Any], where: Dict[str, Any]):
        return self.update(model, values, where)

    @async_db_method
    def delete_async(self, model: Type[BaseModel], **where):
        return self.delete(model, **where)

    @async_db_method
    def delete_in_async(self, model: Type[BaseModel], **where):
        return self.delete_in(model, **where)

    @async_db_method
    def execute_async(self, sql: str, params: tuple = None):
        return self.execute(sql, params)


from core.config import config  # DO NOT REMOVE

DB_PATH = os.environ.get("DB_PATH", "data/database.db")

cm = ConnectionManager(path=DB_PATH)
