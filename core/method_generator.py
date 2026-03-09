""" Database generating methods with schema support """

from core.logger import logger

from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import Any, Dict, Type
from functools import wraps
import threading
import sqlite3

SQL_TYPES = {
    int: "INTEGER",
    str: "TEXT",
    float: "REAL",
    bool: "INTEGER",
}


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
):
    """
    Wrapper around Pydantic Field for describing database columns.

    Args:
        primary_key: Marks column as PRIMARY KEY
        autoincrement: Enables AUTOINCREMENT
        unique: Adds UNIQUE constraint
        index: Creates SQL index
        default: Default value
    """

    return Field(
        default=default,
        json_schema_extra={
            "primary_key": primary_key,
            "autoincrement": autoincrement,
            "unique": unique,
            "index": index,
        },
    )


class Schema(BaseModel):
    pass


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

    def create_table_from_model(self, model: Type[BaseModel]):
        """ Creates a table from a Pydantic model schema """

        table = _table_name(model)
        cursor = self._get_cursor()

        cursor.execute(f"PRAGMA table_info({table})")
        existing_columns = {row["name"] for row in cursor.fetchall()}

        columns_sql_list = []
        indexes = []

        for name, field in model.model_fields.items():
            annotation = field.annotation
            sql_type = SQL_TYPES.get(annotation, "TEXT")
            column_sql = f"{name} {sql_type}"
            extra = field.json_schema_extra or {}

            if extra.get("primary_key"):
                column_sql += " PRIMARY KEY"
            if extra.get("autoincrement"):
                column_sql += " AUTOINCREMENT"
            if extra.get("unique"):
                column_sql += " UNIQUE"
            if extra.get("index"):
                indexes.append(name)

            if name in existing_columns:
                continue

            if existing_columns:
                alter_sql = f"ALTER TABLE {table} ADD COLUMN {column_sql}"
                logger.info("Adding missing column '%s' to table '%s': %s", name, table, alter_sql)
                cursor.execute(alter_sql)
            else:
                columns_sql_list.append(column_sql)

        if not existing_columns:
            columns_sql = ", ".join(columns_sql_list)
            create_sql = f"CREATE TABLE IF NOT EXISTS {table} ({columns_sql})"
            logger.debug("Executing SQL to create table '%s': %s", table, create_sql)
            cursor.execute(create_sql)

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

    def select(self, model: Type[BaseModel], where: Dict[str, Any] | None = None):
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
        if rows:
            return rows[0]
        return None

    def update(self, model: Type[BaseModel], values: Dict[str, Any], where: Dict[str, Any]):
        table = _table_name(model)
        set_clause = ", ".join(f"{k} = ?" for k in values)
        where_clause = " AND ".join(f"{k} = ?" for k in where)
        sql = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"
        params = list(values.values()) + list(where.values())
        logger.debug("UPDATE %s VALUES = %s WHERE = %s", table, values, where)
        cursor = self._get_cursor()
        cursor.execute(sql, params)
        self._get_connection().commit()
        return cursor.rowcount

    def delete(self, model: Type[BaseModel], **where):
        table = _table_name(model)
        clause = " AND ".join(f"{k} = ?" for k in where)
        sql = f"DELETE FROM {table} WHERE {clause}"
        logger.debug("DELETE FROM %s WHERE = %s", table, where)
        cursor = self._get_cursor()
        cursor.execute(sql, list(where.values()))
        self._get_connection().commit()
        return cursor.rowcount

    def execute(self, sql: str, params: tuple | None = None):
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
    def select_async(self, model: Type[BaseModel], where: Dict[str, Any] | None = None):
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
    def execute_async(self, sql: str, params: tuple | None = None):
        return self.execute(sql, params)


cm = ConnectionManager()
