""" Logger for core """

import logging
import sys

# ANSI colors
RESET = "\033[0m"
RED = "\033[31m"
YELLOW = "\033[93m"
BLUE = "\033[34m"
GREEN = "\033[32m"
MAGENTA = "\033[35m"
CYAN = "\033[36m"


class ColorFormatter(logging.Formatter):
    """ Colorful formatter for log output """

    COLORS = {
        logging.DEBUG: BLUE,
        # logging.INFO: BLUE,
        logging.WARNING: YELLOW,
        logging.ERROR: RED,
        logging.CRITICAL: RED,
    }

    def format(self, record):
        """ Formats logs """

        color = self.COLORS.get(record.levelno, RESET)
        message = super().format(record)
        return f"{color}{message}{RESET}"


def setup_logger():
    """ Logger setup """

    logger = logging.getLogger("Core")
    logger.setLevel(logging.DEBUG)  # I put WARNING here to make less output in console, for hard debugging use DEBUG

    # IMPORTANT: prevent adding handlers twice
    if logger.hasHandlers():
        return logger

    handler = logging.StreamHandler(sys.stdout)
    formatter = ColorFormatter("[%(levelname)s] %(name)s: %(message)s")
    handler.setFormatter(formatter)

    logger.addHandler(handler)

    return logger


logger = setup_logger()
