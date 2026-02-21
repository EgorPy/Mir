""" Service registry """

from core.logger import logger

import importlib
import pkgutil
import os

TASKS = None


def get_registered_services():
    global TASKS
    if TASKS is None:
        TASKS = {}
        SERVICES_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend/services"))
        logger.info(f"Looking for services in: {SERVICES_PATH}")

        # auto import all packages in services/
        for module_info in pkgutil.iter_modules([SERVICES_PATH]):
            module_name = module_info.name
            try:
                # every service must provide SERVICE object
                module = importlib.import_module(f"backend.services.{module_name}.service")
                service_obj = module.SERVICE
                TASKS[service_obj.name] = service_obj
                logger.info(f"Loaded service: {service_obj.name}")
            except Exception as e:
                logger.error(f"Failed to load service {module_name}: {e}")
    return TASKS
