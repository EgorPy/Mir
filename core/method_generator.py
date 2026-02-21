""" Database generating methods """

from core.logger import logger

import inspect
import sqlite3
import re
import os


class ConnectionManager:
    """ Database connection manager for FastAPI """

    def __init__(self, path="database.db"):
        self.path = path

    def connect(self) -> sqlite3.Connection:
        """ Method that returns connection to the database """

        logger.debug("Initializing database connection at " + os.getcwd() + "\\" + self.path)
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    async def dependency(self):  # async is important in this method because of FastAPI threadpool
        """ Generator that yields connection to the database """

        conn = self.connect()
        try:
            yield conn
        finally:
            conn.close()


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
    Method-Driven Data Modeling (MDDM) or
    Code-Driven Data Definition (CDDD)
    """

    # TODO: Add method caching
    # TODO: Add saving to generated methods or pre generate all methods on the first run and then load them

    OPERATION_KEYWORDS = {"get", "set", "update", "delete"}
    STATUS_KEYWORDS = {"uploaded", "pending", "processing", "waiting", "done", "error"}
    QUERY_KEYWORDS = {"with", "by"}

    def __init__(self, connection: sqlite3.Connection):
        """
        Initialize with existing SQLite connection

        Args:
            connection: Active SQLite connection
        """

        self.connection = connection
        self.cursor = self.connection.cursor()
        logger.debug("AutoDB initialized with provided connection")

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
                    return method

        if name.startswith("get_"):
            for parser in (
                    self._parse_get_with_status_table,
                    self._parse_get_by_column,
                    # self._parse_get_table_column,
                    self._parse_get_column_from_table,
            ):
                method = parser(name)
                if method:
                    return method

        if name.startswith("is_"):  # this means that this method should return a bool return type
            for parser in (
                    self._parse_is_exists,
            ):
                method = parser(name)
                if method:
                    return method

        if name.startswith("insert_"):
            for parser in (
                    self._parse_insert_row,
            ):
                method = parser(name)
                if method:
                    return method

        if name.startswith("delete_"):
            for parser in (
                    self._parse_delete_row,
            ):
                method = parser(name)
                if method:
                    return method

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
        placeholders = ", ".join(columns)
        query = f"SELECT {placeholders} FROM {table} WHERE status = ?"
        _log_call_context(name)
        logger.debug(f"Prepared SQL query: {query} | Status: {status}")

        def method():
            """ Returns column(s) with specific status """

            _log_call_context(name)
            self._ensure_table_and_columns(table, columns + ["status"])
            logger.debug(f"Executing query with status={status}")
            with self.connection:
                self.cursor.execute(query, (status,))
                result = self.cursor.fetchall()
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

        def method(value):
            """ Returns column selected by another column """

            _log_call_context(name)
            self._ensure_table_and_columns(table, [column, by_column])
            with self.connection:
                logger.debug(f"Executing query with {by_column}={value}")
                self.cursor.execute(query, (value,))
                result = self.cursor.fetchall()
            logger.info(f"Returned {len(result)} rows for column: {column}")
            return [dict(row) for row in result]

        return method

    # def _parse_get_table_column(self, name: str):
    #     """ get_{table}_{column}(columns_as_keyword_arguments) """
    #
    #     match = re.match(r"^get_(\w+)_(\w+)$", name)
    #     if not match:
    #         return None
    #
    #     table_singular, return_column = match.groups()
    #
    #     table = table_singular + "s"
    #
    #     def method(**columns):
    #         """ Returns column selected by columns """
    #
    #         _log_call_context(name)
    #
    #         if not columns:
    #             raise ValueError(f"{name} must be called with keyword arguments for WHERE columns")
    #
    #         where_columns = list(columns.keys())
    #         self._ensure_table_and_columns(table, [return_column] + where_columns)
    #
    #         where_clause = " AND ".join(f"{col} = ?" for col in where_columns)
    #         query = f"SELECT {return_column} FROM {table} WHERE {where_clause}"
    #
    #         values = tuple(columns[col] for col in where_columns)
    #
    #         with self.connection:
    #             self.cursor.execute(query, values)
    #             rows = self.cursor.fetchall()
    #
    #         if not rows:
    #             return None
    #         return rows[0][return_column]
    #
    #     return method

    def _parse_get_column_from_table(self, name: str):
        """ get_{column}_from_{table}(columns_as_keyword_arguments) """

        match = re.match(r"^get_(\w+)_from_(\w+)$", name)
        if not match:
            return None

        return_column, table = match.groups()

        def method(**columns):
            """ Returns column selected by columns """

            _log_call_context(name)

            if not columns:
                raise ValueError(f"{name} must be called with keyword arguments for WHERE columns")

            where_columns = list(columns.keys())
            self._ensure_table_and_columns(table, [return_column] + where_columns)

            where_clause = " AND ".join(f"{col} = ?" for col in where_columns)
            query = f"SELECT {return_column} FROM {table} WHERE {where_clause}"

            logger.debug(query)

            values = tuple(columns[col] for col in where_columns)

            with self.connection:
                self.cursor.execute(query, values)
                rows = self.cursor.fetchall()

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

        def method(*values):
            """ Sets columns with status """

            _log_call_context(name)
            if len(values) != len(columns):
                raise ValueError(f"Expected {len(columns)} values, got {len(values)}")
            self._ensure_table_and_columns(table, columns + ["status"])
            with self.connection:
                self.cursor.execute(query, (*values, status))
                self.connection.commit()
                self.cursor.execute(f"SELECT * FROM {table} WHERE status = ?", (status,))
                rows = self.cursor.fetchall()
                self.cursor.execute(f"PRAGMA table_info({table})")
                col_names = [row[1] for row in self.cursor.fetchall()]
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

        def method(value_to_set, filter1_value, filter2_value):
            """ Sets columns with two filters """

            _log_call_context(name)
            self._ensure_table_and_columns(table, [column, filter1, filter2])
            with self.connection:
                self.cursor.execute(query, (value_to_set, filter1_value, filter2_value))
                self.connection.commit()
                self.cursor.execute(f"SELECT * FROM {table} WHERE {filter1}=? AND {filter2}=?", (filter1_value, filter2_value))
                rows = self.cursor.fetchall()
                self.cursor.execute(f"PRAGMA table_info({table})")
                columns = [row[1] for row in self.cursor.fetchall()]
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

        def method(value_to_set, filter_value):
            """ Sets columns with filter """

            _log_call_context(name)
            self._ensure_table_and_columns(table, [column, by_column, "status"])
            with self.connection:
                self.cursor.execute(query, (value_to_set, filter_value))
                self.connection.commit()

                self.cursor.execute(f"SELECT * FROM {table} WHERE {by_column}=?", (filter_value,))
                rows = self.cursor.fetchall()
                self.cursor.execute(f"PRAGMA table_info({table})")
                columns = [row[1] for row in self.cursor.fetchall()]
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

        def method(id_value, status_value):
            """ Set status method """

            _log_call_context(name)
            self._ensure_table_and_columns(table, ["status"])
            with self.connection:
                self.cursor.execute(query, (status_value, id_value))
                self.connection.commit()
                self.cursor.execute(f"SELECT * FROM {table} WHERE id=?", (id_value,))
                rows = self.cursor.fetchall()
                self.cursor.execute(f"PRAGMA table_info({table})")
                columns = [row[1] for row in self.cursor.fetchall()]
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

        query = "SELECT COUNT(*) as count FROM {} WHERE {}"
        _log_call_context(name)
        logger.debug(f"Prepared SQL query: {query}")

        def method(**where_columns):
            """ Set status method """

            _log_call_context(name)
            self._ensure_table_and_columns(table, list(where_columns.keys()))
            with self.connection:
                where_clause = " AND ".join(f"{col} = ?" for col in where_columns)
                self.cursor.execute(query.format(
                    table,
                    where_clause
                ), (*where_columns.values(),))
                result: list[sqlite3.Row] = self.cursor.fetchall()
                self.cursor.execute(f"PRAGMA table_info({table})")
                columns = [row[1] for row in self.cursor.fetchall()]
                logger.info(f"Returned {len(result)} rows with columns: {columns}")
                return bool(result[0][0]) if result and result[0] else 0

        return method

    def _parse_insert_row(self, name: str):
        """ insert_{table_row}(columns_as_keyword_arguments) """

        table = _guess_table_from_method(name)

        query = "INSERT INTO {} ({}) VALUES ({})"

        _log_call_context(name)
        logger.debug(f"Prepared SQL query: {query}")

        def method(**columns):
            """ Sets columns with filter """

            _log_call_context(name)
            self._ensure_table_and_columns(table, list(columns.keys()))
            with self.connection:
                self.cursor.execute(
                    query.format(
                        table,
                        ", ".join(columns.keys()),
                        ", ".join(["?"] * len(columns))
                    ),
                    (*columns.values(),)
                )
                self.connection.commit()

                cs = " = ? AND ".join(columns.keys())
                cs += " = ?"
                self.cursor.execute(f"SELECT * FROM {table} WHERE {cs}", (*columns.values(),))
                rows = self.cursor.fetchall()
                self.cursor.execute(f"PRAGMA table_info({table})")
                columns = [row[1] for row in self.cursor.fetchall()]
                return [dict(zip(columns, row)) for row in rows]

        return method

    def _parse_delete_row(self, name: str):
        """ delete_{table_row}(columns_as_keyword_arguments) """

        table = _guess_table_from_method(name)

        query = "DELETE FROM {} WHERE {}"

        _log_call_context(name)
        logger.debug(f"Prepared SQL query: {query}")

        def method(**columns):
            """ Sets columns with filter """

            _log_call_context(name)
            self._ensure_table_and_columns(table, list(columns.keys()))
            where_clause = " AND ".join(f"{col} = ?" for col in columns)
            with self.connection:
                self.cursor.execute(
                    query.format(
                        table,
                        where_clause
                    ),
                    (*columns.values(),)
                )
                return self.cursor.rowcount

        return method

    # ------------------ Utilities ------------------
    def _ensure_table_and_columns(self, table: str, columns: list):
        """ Checks if table and columns exist and creates them if not """

        with self.connection:
            self.cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name = ?", (table,)
            )
            if not self.cursor.fetchone():
                logger.warning(f"Table '{table}' does not exist. Creating...")
                self._create_table(table)

            self.cursor.execute(f"PRAGMA table_info({table})")
            existing = {row[1] for row in self.cursor.fetchall()}
            for column in columns:
                if column not in existing:
                    logger.warning(f"Column '{column}' does not exist in '{table}'. Creating...")
                    sql = f"ALTER TABLE {table} ADD COLUMN {column} TEXT"
                    logger.debug(f"Executing SQL: {sql}")
                    self.cursor.execute(sql)

    def _create_table(self, table: str):
        """ Creates a table with just an id column """

        sql = f"CREATE TABLE {table} (id INTEGER PRIMARY KEY AUTOINCREMENT)"
        logger.debug(f"Creating table '{table}' with SQL: {sql}")
        self.cursor.execute(sql)

    def create_column_if_not_exists(self, table_name: str, column_name: str, column_type: str = "TEXT") -> None:
        """
        Создать столбец в таблице, если он не существует

        Args:
            table_name: Имя таблицы
            column_name: Имя столбца
            column_type: Тип столбца (по умолчанию TEXT)
        """

        with self.connection:
            self.cursor.execute(f"PRAGMA table_info({table_name})")
            existing_columns = {row[1] for row in self.cursor.fetchall()}

            if column_name not in existing_columns:
                self.cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
                self.connection.commit()

    def create_table_if_not_exists(self, table_name: str) -> None:
        """
        Создать таблицу, если она не существует

        Args:
            table_name: Имя таблицы
        """

        with self.connection:
            self.cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
                (table_name,)
            )

            if not self.cursor.fetchone():
                self.cursor.execute(f"""
                    CREATE TABLE {table_name} (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                self.connection.commit()

    def execute(self, sql: str, params):
        """ Execute a custom SQL query with optional parameters """

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
            self.cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
                (table,)
            )
            if not self.cursor.fetchone():
                self.cursor.execute(f"""
                    CREATE TABLE {table} (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

        for table in tables:
            self.cursor.execute(f"PRAGMA table_info({table})")
            existing = {row[1] for row in self.cursor.fetchall()}

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
                        self.cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} TEXT")
                    except Exception:
                        pass

        with self.connection:
            if params:
                self.cursor.execute(sql, params)
            else:
                self.cursor.execute(sql)

            if sql_lower.strip().startswith('select'):
                return [dict(row) for row in self.cursor.fetchall()]
            return
