""" Configuration loading """

__all__ = ["config"]

from core.logger import logger

import os
import sys
from dotenv import load_dotenv

load_dotenv()


class SectionWrapper:
    def __init__(self, prefix: str = ""):
        self._prefix = prefix

    def __getattr__(self, item):
        key = item.upper()
        value = os.environ.get(key)
        if value is None:
            logger.error(f"Missing configuration key: {key}")
            sys.exit()
        return value


class ConfigWrapper:
    def __getattr__(self, item):
        return SectionWrapper()


config = ConfigWrapper()
