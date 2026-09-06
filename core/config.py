""" Configuration loading """

__all__ = ["config"]

from core.logger import logger

import os
import sys
from dotenv import load_dotenv

load_dotenv()

REQUIRED_KEYS = [
    "DOMAIN",
    "BACKEND_PORT",
    "FRONTEND_PORT",
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
