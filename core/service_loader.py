from core.registry import get_registered_services
from core.logger import logger
import asyncio


async def poll_tasks():
    TASKS = get_registered_services()
    if not TASKS:
        logger.warning("No services loaded")
        return

    logger.info("Task polling started")

    while True:
        for task_name, task in TASKS.items():
            try:
                payload = getattr(task, "db_fetch", lambda: None)()
                if payload:
                    logger.info(f"Task '{task_name}' fetched {len(payload)} items")
            except Exception as e:
                logger.error(f"Error polling task '{task_name}': {e}")
        await asyncio.sleep(5)
