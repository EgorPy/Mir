""" Configuration loading """

__all__ = ["config"]

from core.logger import logger

import os
import sys
from dotenv import load_dotenv

load_dotenv(".env", override=False)

ENV_FILE = "local.env" if os.path.exists("local.env") else ".env"
load_dotenv(ENV_FILE, override=True)

REQUIRED_KEYS = [
    "HOST",
    "DOMAIN",
    "BACKEND_PORT",
    "CALLS_PORT",
    "FRONTEND_PORT",
    "DB_PATH",
    "SESSION_DURATION",
    "REQUEST_INTERVAL",
]


class ConfigWrapper:
    def __getattr__(self, item):
        return os.environ[item.upper()]


try:
    missing = [k for k in REQUIRED_KEYS if k not in os.environ]
    if missing:
        raise KeyError(", ".join(missing))
    config = ConfigWrapper()
except KeyError as e:
    logger.error(f"Missing configuration key: {e}")
    sys.exit()
