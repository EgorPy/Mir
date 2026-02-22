""" Database generating methods """

from core.logger import logger

from fastapi.concurrency import run_in_threadpool
from functools import wraps, partial
import inspect
import sqlite3
import re
import os
import threading


def async_db_method(func):
    """ Decorator to convert sync db method to async """

    @wraps(func)
    async def wrapper(*args, **kwargs):
        # args[0] - это self (экземпляр AutoDB)
        # Остальные args и kwargs - параметры метода
        return await run_in_threadpool(func, *args, **kwargs)

    return wrapper


class ConnectionManager:
    """ Database connection manager for FastAPI with thread-local storage """

    def __init__(self, path="database.db"):
        self.path = path
        self.local = threading.local()

    def get_connection(self) -> sqlite3.Connection:
        """ Get or create thread-local connection """
        if not hasattr(self.local, 'connection'):
            thread_id = threading.get_ident()
            logger.debug(f"Creating new connection in thread {thread_id}")
            conn = sqlite3.connect(self.path)
            conn.row_factory = sqlite3.Row
            self.local.connection = conn
        return self.local.connection

    def close_connection(self):
        """ Close thread-local connection if it exists """
        if hasattr(self.local, 'connection'):
            thread_id = threading.get_ident()
            logger.debug(f"Closing connection in thread {thread_id}")
            self.local.connection.close()
            delattr(self.local, 'connection')

    def dependency(self):
        """ Generator that yields connection manager (not connection itself) """
        try:
            yield self
        finally:
            # Не закрываем соединение здесь - оно будет жить пока жив поток
            pass


def _guess_table_from_method(name: str) -> str:
    """ Guesses table name from method name like get_image_by_id or set_image_by_user_id -> images """

    match = re.match(r"(?:get|set|insert|delete)_(\w+)_by_", name)
    if match:
        table = match.group(1)
        if not table.endswith("s"):
            table += "s"
        return table

    match = re.match(r"(?:get|set|insert|delete)_(\w+)$", name)
    if match:
        table = match.group(1)
        if not table.endswith("s"):
            table += "s"
        return table
    raise AttributeError(f"Cannot guess table name. Incorrect method name: {name}")


def _log_call_context(method_name: str):
    """ Log method name, line and file """

    frame = inspect.stack()[2]  # calling method
    filename = os.path.basename(frame.filename)
    lineno = frame.lineno
    func = frame.function

    logger.debug(f"Generated method '{method_name}' called from {filename}:{lineno} in {func}()")


class AutoDB:
    """
    Database with auto-generated methods and logging
    Method-Driven Data Modeling (MDDM)
    """

    OPERATION_KEYWORDS = {"get", "set", "update", "delete"}
    STATUS_KEYWORDS = {"uploaded", "pending", "processing", "waiting", "done", "error"}
    QUERY_KEYWORDS = {"with", "by"}

    def __init__(self, connection_manager: ConnectionManager):
        """
        Initialize with ConnectionManager instead of direct connection

        Args:
            connection_manager: ConnectionManager instance
        """
        self.connection_manager = connection_manager
        logger.debug("AutoDB initialized with connection manager")

    def _get_connection(self):
        """ Get thread-local connection """
        return self.connection_manager.get_connection()

    def _get_cursor(self):
        """ Get cursor from thread-local connection """
        return self._get_connection().cursor()

    def __getattr__(self, name: str):
        """ Dynamically create method based on its name """

        if name.startswith("set_"):
            for parser in (
                    self._parse_set_status_method,
                    self._parse_set_with_status_table,
                    self._parse_set_by_two_columns,
                    self._parse_set_by_column,
            ):
                method = parser(name)
                if method:
                    # Привязываем метод к экземпляру
                    bound_method = method.__get__(self, AutoDB)
                    return async_db_method(bound_method)

        if name.startswith("get_"):
            for parser in (
                    self._parse_get_with_status_table,
                    self._parse_get_by_column,
                    self._parse_get_column_from_table,
            ):
                method = parser(name)
                if method:
                    bound_method = method.__get__(self, AutoDB)
                    return async_db_method(bound_method)

        if name.startswith("is_"):
            for parser in (
                    self._parse_is_exists,
            ):
                method = parser(name)
                if method:
                    bound_method = method.__get__(self, AutoDB)
                    return async_db_method(bound_method)

        if name.startswith("insert_"):
            for parser in (
                    self._parse_insert_row,
            ):
                method = parser(name)
                if method:
                    bound_method = method.__get__(self, AutoDB)
                    return async_db_method(bound_method)

        if name.startswith("delete_"):
            for parser in (
                    self._parse_delete_row,
            ):
                method = parser(name)
                if method:
                    bound_method = method.__get__(self, AutoDB)
                    return async_db_method(bound_method)

        raise AttributeError(f"Unknown method format: {name}")

    # ------------------ Parsers ------------------
    def _parse_get_with_status_table(self, name: str):
        """ get_{column}_with_{status}_{table}() or get_{column}_and_{column}_with_{status}_{table}() """

        match = re.match(r"^(get|set|update|delete)_(.+)_with_(\w+)_(\w+)$", name)
        if not match:
            return None

        operation, columns_part, status, table = match.groups()
        if operation not in self.OPERATION_KEYWORDS or status not in self.STATUS_KEYWORDS:
            return None

        columns = columns_part.split("_and_")
        query = f"SELECT {', '.join(columns)} FROM {table} WHERE status = ?"
        _log_call_context(name)
        logger.debug(f"Prepared SQL query: {query} | Status: {status}")

        def method(self):
            """ Returns column(s) with specific status """
            _log_call_context(name)
            conn = self._get_connection()
            cursor = conn.cursor()

            self._ensure_table_and_columns(table, columns + ["status"])
            logger.debug(f"Executing query with status={status}")

            cursor.execute(query, (status,))
            result = cursor.fetchall()

            logger.info(f"Returned {len(result)} rows for columns: {columns}")
            return [dict(row) for row in result]

        return method

    def _parse_get_by_column(self, name: str):
        """ get_{column}_by_{column}(value) """

        match = re.match(r"^(get|set|update|delete)_(\w+)_by_(\w+)$", name)
        if not match:
            return None

        operation, column, by_column = match.groups()
        if operation not in self.OPERATION_KEYWORDS:
            return None

        table = _guess_table_from_method(name)
        query = f"SELECT {column} FROM {table} WHERE {by_column} = ?"
        _log_call_context(name)
        logger.debug(f"Prepared SQL query: {query}")

        def method(self, value):
            """ Returns column selected by another column """
            _log_call_context(name)
            conn = self._get_connection()
            cursor = conn.cursor()

            self._ensure_table_and_columns(table, [column, by_column])
            logger.debug(f"Executing query with {by_column}={value}")

            cursor.execute(query, (value,))
            result = cursor.fetchall()

            logger.info(f"Returned {len(result)} rows for column: {column}")
            return [dict(row) for row in result]

        return method

    def _parse_get_column_from_table(self, name: str):
        """ get_{column}_from_{table}(columns_as_keyword_arguments) """

        match = re.match(r"^get_(\w+)_from_(\w+)$", name)
        if not match:
            return None

        return_column, table = match.groups()

        def method(self, **columns):
            """ Returns column selected by columns """
            _log_call_context(name)
            conn = self._get_connection()
            cursor = conn.cursor()

            if not columns:
                raise ValueError(f"{name} must be called with keyword arguments for WHERE columns")

            where_columns = list(columns.keys())
            self._ensure_table_and_columns(table, [return_column] + where_columns)

            where_clause = " AND ".join(f"{col} = ?" for col in where_columns)
            query = f"SELECT {return_column} FROM {table} WHERE {where_clause}"

            logger.debug(query)

            values = tuple(columns[col] for col in where_columns)

            cursor.execute(query, values)
            rows = cursor.fetchall()

            if not rows:
                return None
            return rows[0][return_column]

        return method

    def _parse_set_with_status_table(self, name: str):
        """ set_{column}_with_{status}_{table}() or set_{column}_and_{column}_with_{status}_{table}() """

        match = re.match(r"^set_(.+)_with_(\w+)_(\w+)$", name)
        if not match:
            return None

        columns_part, status, table = match.groups()
        columns = columns_part.split("_and_")
        placeholders = ", ".join([f"{col}=?" for col in columns])
        query = f"UPDATE {table} SET {placeholders} WHERE status = ?"
        _log_call_context(name)
        logger.debug(f"Prepared SQL SET query: {query} | Status: {status}")

        def method(self, *values):
            """ Sets columns with status """
            _log_call_context(name)
            conn = self._get_connection()
            cursor = conn.cursor()

            if len(values) != len(columns):
                raise ValueError(f"Expected {len(columns)} values, got {len(values)}")

            self._ensure_table_and_columns(table, columns + ["status"])

            cursor.execute(query, (*values, status))
            conn.commit()

            cursor.execute(f"SELECT * FROM {table} WHERE status = ?", (status,))
            rows = cursor.fetchall()

            cursor.execute(f"PRAGMA table_info({table})")
            col_names = [row[1] for row in cursor.fetchall()]

            return [dict(zip(col_names, row)) for row in rows]

        return method

    def _parse_set_by_two_columns(self, name: str):
        """ set_{column}_by_{column}_and_{column}(value, filter1, filter2) """

        match = re.match(r"^set_(\w+)_by_(\w+)_and_(\w+)$", name)
        if not match:
            return None

        column, filter1, filter2 = match.groups()
        table = _guess_table_from_method(name)
        query = f"UPDATE {table} SET {column} = ? WHERE {filter1} = ? AND {filter2}=?"
        _log_call_context(name)
        logger.debug(f"Prepared SQL query: {query}")

        def method(self, value_to_set, filter1_value, filter2_value):
            """ Sets columns with two filters """
            _log_call_context(name)
            conn = self._get_connection()
            cursor = conn.cursor()

            self._ensure_table_and_columns(table, [column, filter1, filter2])

            cursor.execute(query, (value_to_set, filter1_value, filter2_value))
            conn.commit()

            cursor.execute(f"SELECT * FROM {table} WHERE {filter1}=? AND {filter2}=?",
                           (filter1_value, filter2_value))
            rows = cursor.fetchall()

            cursor.execute(f"PRAGMA table_info({table})")
            columns = [row[1] for row in cursor.fetchall()]

            return [dict(zip(columns, row)) for row in rows]

        return method

    def _parse_set_by_column(self, name: str):
        """ set_{column}_by_{column}(value, filter) """

        match = re.match(r"^set_(\w+)_by_(\w+)$", name)
        if not match:
            return None

        column, by_column = match.groups()
        table = _guess_table_from_method(name)

        if column.endswith("_status"):
            column = column.removesuffix("_status")

        if by_column.endswith("_status"):
            by_column = by_column.removesuffix("_status")

        if table.endswith("_status"):
            table = table.removesuffix("_status")
            if not table.endswith("s"):
                table += "s"
            query = f"UPDATE {table} SET status=? WHERE {by_column}=?"
        else:
            if not table.endswith("s"):
                table += "s"
            query = f"UPDATE {table} SET {column}=? WHERE {by_column}=?"

        _log_call_context(name)
        logger.debug(f"Prepared SQL query: {query}")

        def method(self, value_to_set, filter_value):
            """ Sets columns with filter """
            _log_call_context(name)
            conn = self._get_connection()
            cursor = conn.cursor()

            self._ensure_table_and_columns(table, [column, by_column, "status"])

            cursor.execute(query, (value_to_set, filter_value))
            conn.commit()

            cursor.execute(f"SELECT * FROM {table} WHERE {by_column}=?", (filter_value,))
            rows = cursor.fetchall()

            cursor.execute(f"PRAGMA table_info({table})")
            columns = [row[1] for row in cursor.fetchall()]

            return [dict(zip(columns, row)) for row in rows]

        return method

    def _parse_set_status_method(self, name: str):
        """ Parses methods like set_{table}_status(arg1, status) """

        match = re.fullmatch(r"set_(\w+)_status", name)
        if not match:
            return None

        table = match.group(1)
        if not table.endswith("s"):
            table += "s"

        query = f"UPDATE {table} SET status=? WHERE id=?"
        _log_call_context(name)
        logger.debug(f"Prepared SQL query: {query}")

        def method(self, id_value, status_value):
            """ Set status method """
            _log_call_context(name)
            conn = self._get_connection()
            cursor = conn.cursor()

            self._ensure_table_and_columns(table, ["status"])

            cursor.execute(query, (status_value, id_value))
            conn.commit()

            cursor.execute(f"SELECT * FROM {table} WHERE id=?", (id_value,))
            rows = cursor.fetchall()

            cursor.execute(f"PRAGMA table_info({table})")
            columns = [row[1] for row in cursor.fetchall()]

            return [dict(zip(columns, row)) for row in rows]

        return method

    def _parse_is_exists(self, name: str):
        """ Parses methods like is_{table}_exists(arg1) """

        match = re.fullmatch(r"is_(\w+)_exists", name)
        if not match:
            return None

        table = match.group(1)
        if not table.endswith("s"):
            table += "s"

        _log_call_context(name)
        logger.debug(f"Prepared SQL query template for exists check")

        def method(self, **where_columns):
            """ Check if record exists """
            _log_call_context(name)
            conn = self._get_connection()
            cursor = conn.cursor()

            self._ensure_table_and_columns(table, list(where_columns.keys()))

            where_clause = " AND ".join(f"{col} = ?" for col in where_columns)
            query = f"SELECT COUNT(*) as count FROM {table} WHERE {where_clause}"

            cursor.execute(query, (*where_columns.values(),))
            result = cursor.fetchall()

            return bool(result[0][0]) if result and result[0] else False

        return method

    def _parse_insert_row(self, name: str):
        """ insert_{table_row}(columns_as_keyword_arguments) """

        table = _guess_table_from_method(name)
        _log_call_context(name)
        logger.debug(f"Prepared SQL query template for insert")

        def method(self, **columns):
            """ Insert row with columns """
            _log_call_context(name)
            conn = self._get_connection()
            cursor = conn.cursor()

            self._ensure_table_and_columns(table, list(columns.keys()))

            columns_names = ', '.join(columns.keys())
            placeholders = ', '.join(['?'] * len(columns))
            query = f"INSERT INTO {table} ({columns_names}) VALUES ({placeholders})"

            logger.debug(f"Executing query: {query} with values: {tuple(columns.values())}")

            cursor.execute(query, (*columns.values(),))
            conn.commit()

            # Get inserted row
            where_clause = " AND ".join(f"{col} = ?" for col in columns.keys())
            cursor.execute(f"SELECT * FROM {table} WHERE {where_clause}", (*columns.values(),))
            rows = cursor.fetchall()

            cursor.execute(f"PRAGMA table_info({table})")
            column_names = [row[1] for row in cursor.fetchall()]

            result = [dict(zip(column_names, row)) for row in rows]
            logger.debug(f"Insert result: {result}")

            return result

        return method

    def _parse_delete_row(self, name: str):
        """ delete_{table_row}(columns_as_keyword_arguments) """

        table = _guess_table_from_method(name)
        _log_call_context(name)
        logger.debug(f"Prepared SQL query template for delete")

        def method(self, **columns):
            """ Delete row with columns """
            _log_call_context(name)
            conn = self._get_connection()
            cursor = conn.cursor()

            self._ensure_table_and_columns(table, list(columns.keys()))

            where_clause = " AND ".join(f"{col} = ?" for col in columns)
            query = f"DELETE FROM {table} WHERE {where_clause}"

            cursor.execute(query, (*columns.values(),))
            conn.commit()

            return cursor.rowcount

        return method

    # ------------------ Utilities ------------------
    def _ensure_table_and_columns(self, table: str, columns: list):
        """ Checks if table and columns exist and creates them if not """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name = ?", (table,)
        )
        if not cursor.fetchone():
            logger.warning(f"Table '{table}' does not exist. Creating...")
            self._create_table(table)

        cursor.execute(f"PRAGMA table_info({table})")
        existing = {row[1] for row in cursor.fetchall()}

        for column in columns:
            if column not in existing:
                logger.warning(f"Column '{column}' does not exist in '{table}'. Creating...")
                sql = f"ALTER TABLE {table} ADD COLUMN {column} TEXT"
                logger.debug(f"Executing SQL: {sql}")
                cursor.execute(sql)

    def _create_table(self, table: str):
        """ Creates a table with just an id column """
        conn = self._get_connection()
        cursor = conn.cursor()
        sql = f"CREATE TABLE {table} (id INTEGER PRIMARY KEY AUTOINCREMENT)"
        logger.debug(f"Creating table '{table}' with SQL: {sql}")
        cursor.execute(sql)

    def create_column_if_not_exists(self, table_name: str, column_name: str, column_type: str = "TEXT") -> None:
        """ Create column if it doesn't exist """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute(f"PRAGMA table_info({table_name})")
        existing_columns = {row[1] for row in cursor.fetchall()}

        if column_name not in existing_columns:
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
            conn.commit()

    def create_table_if_not_exists(self, table_name: str) -> None:
        """ Create table if it doesn't exist """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
            (table_name,)
        )

        if not cursor.fetchone():
            cursor.execute(f"""
                CREATE TABLE {table_name} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def execute(self, sql: str, params=None):
        """ Execute a custom SQL query with optional parameters """
        conn = self._get_connection()
        cursor = conn.cursor()

        sql_lower = sql.lower()
        tables = set()

        patterns = [
            r'from\s+(\w+)',
            r'join\s+(\w+)',
            r'insert\s+into\s+(\w+)',
            r'update\s+(\w+)',
            r'delete\s+from\s+(\w+)',
            r'table\s+(\w+)'
        ]

        for pattern in patterns:
            tables.update(re.findall(pattern, sql_lower))

        keywords = {'select', 'where', 'set', 'values', 'as', 'on', 'and', 'or'}
        tables = {t for t in tables if t not in keywords}

        for table in tables:
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
                (table,)
            )
            if not cursor.fetchone():
                cursor.execute(f"""
                    CREATE TABLE {table} (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

        for table in tables:
            cursor.execute(f"PRAGMA table_info({table})")
            existing = {row[1] for row in cursor.fetchall()}

            columns_to_check = set()

            select_match = re.search(r'select\s+(.+?)\s+from', sql_lower)
            if select_match and select_match.group(1) != '*':
                cols = [c.strip().split()[-1] for c in select_match.group(1).split(',')]
                columns_to_check.update(cols)

            columns_to_check.update(re.findall(r'where\s+(\w+)\s*[=<>!]', sql_lower))
            columns_to_check.update(re.findall(r'set\s+(\w+)\s*=', sql_lower))

            insert_match = re.search(r'insert\s+into\s+\w+\s*\((.+?)\)', sql_lower)
            if insert_match:
                cols = [c.strip() for c in insert_match.group(1).split(',')]
                columns_to_check.update(cols)

            for col in columns_to_check:
                if col not in existing and col not in ['id', '*'] and '(' not in col:
                    try:
                        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} TEXT")
                    except Exception:
                        pass

        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)

        if sql_lower.strip().startswith('select'):
            return [dict(row) for row in cursor.fetchall()]
        return cursor.rowcount

    async def execute_async(self, sql: str, params=None):
        """ Async version of execute """
        return await run_in_threadpool(self.execute, sql, params)


# Создаем экземпляр менеджера соединений
cm = ConnectionManager()
