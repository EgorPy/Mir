""" Run core """

from generate_config_js import generate_config_js
from registry import get_registered_services
from service_loader import poll_tasks
from build_site import build_site
from ved3v_ascii_art import art
from logger import logger

import traceback
import asyncio
import logging
import sys


async def run():
    """ Core startup """

    logger.setLevel(logging.DEBUG)

    print(art)

    logger.info("=== Core system started ===")

    # 1. Generate JS config
    generate_config_js()
    logger.info("Config JS generated.")

    # 2. Site generation: actions.js -> YAML -> HTML
    build_site(manual=False)

    # 3. Poll services
    await poll_tasks()


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except Exception:
        logger.error("Unhandled exception in core system:")
        traceback.print_exc()
        print("\nPress Enter to exit...")
        input()
        sys.exit(1)
