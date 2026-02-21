""" Generates config.js file for frontend """

from config import config
from logger import logger
import os


def generate_config_js():
    """ Generate config.js for frontend only if it does not already exist """

    target_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "frontend",
        "web",
        "static",
        "config.js"
    )

    if os.path.exists(target_path):
        return

    backend_url = f"http://{config.DOMAIN}:{config.BACKEND_PORT}"

    js_content = f'export const BACKEND_URL = "{backend_url}";\n\nwindow.BACKEND_URL = BACKEND_URL;\n'

    os.makedirs(os.path.dirname(target_path), exist_ok=True)

    with open(target_path, "w", encoding="utf-8") as f:
        f.write(js_content)

    logger.info(f"Generated frontend config at {target_path}")
