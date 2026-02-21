""" Configuration loading """

__all__ = ["config"]

from core.logger import logger

import configparser
import sys


class ConfigWrapper:
    def __init__(self, config: configparser.ConfigParser):
        self._config = config

    def __getattr__(self, item):
        return SectionWrapper(self._config[item])


class SectionWrapper:
    def __init__(self, section: configparser.SectionProxy):
        self._section = section

    def __getattr__(self, item):
        return self._section[item]


raw_config = configparser.ConfigParser()
try:
    raw_config.read('core/config.ini')
    config = ConfigWrapper(raw_config).CONFIG
except KeyError as e:
    logger.error(f"Missing configuration key: {e}")
    sys.exit()
except configparser.Error as e:
    logger.error(f"Error reading config file: {e}")
    sys.exit()
