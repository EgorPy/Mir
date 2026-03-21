""" Backend API """

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # do not move down

from core.method_generator import AutoDB, Schema, cm
from core.config import config
from core.logger import logger

from backend.services.auth.api.auth import app as auth_router
from backend.services.chats.service import app as chats_router
from backend.services.chats.permissions import app as permissions_router
from backend.services.chats.messages import app as messages_router

from backend.phone_mode import DEBUG_PHONE_MODE, SERVER_MODE

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import importlib
import traceback
import uvicorn
import logging
import inspect
import pkgutil

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.140:3000",
    "http://188.116.21.247:3000",
    "https://localhost:3000",
    "https://127.0.0.1:3000",
    "http://10.38.77.78:3000",
    "https://192.168.1.140:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # [f"http://{config.DOMAIN}:{config.FRONTEND_PORT}"],  # f"http://{config.DOMAIN}:{config.FRONTEND_PORT}"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(chats_router, prefix="/chats", tags=["Chats"])
app.include_router(permissions_router, tags=["Permissions"])
app.include_router(messages_router, tags=["Messages"])


def get_schema_files():
    schemas_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend/services"))
    logger.info(f"Looking for schema files in: {schemas_path}")
    return pkgutil.iter_modules([schemas_path])


def ensure_schema(skip: bool = False):
    if skip and not SERVER_MODE:
        return
    schema_files = get_schema_files()
    db = AutoDB(cm)

    for schema_file in schema_files:
        module = importlib.import_module(f"backend.services.{schema_file.name}.schema")
        logger.info(f"Loaded service: {schema_file.name}")
        models = inspect.getmembers(module, inspect.isclass)
        for raw_model in models:
            model = raw_model[1]
            if issubclass(model, Schema) and model != Schema:
                db.create_table_from_model(model)
        print()


def start_server():
    """ Starts the server """

    logger.info(f"BACKEND server started at http://{config.DOMAIN}:{config.BACKEND_PORT}")
    if SERVER_MODE is True:
        uvicorn.run("backend_main:app", host=config.DOMAIN, port=int(config.BACKEND_PORT), reload=False)
    elif DEBUG_PHONE_MODE is False:
        uvicorn.run("backend_main:app", host=config.DOMAIN, port=int(config.BACKEND_PORT), reload=True,
                    ssl_certfile="192.168.1.140+1.pem", ssl_keyfile="192.168.1.140+1-key.pem")
    else:
        uvicorn.run("backend_main:app", host=config.DOMAIN, port=int(config.BACKEND_PORT), reload=True)


def run():
    """ Sets up the server """

    logger = logging.getLogger("core")
    logger.setLevel(logging.DEBUG)

    ensure_schema()
    start_server()

    # server_thread = threading.Thread(target=start_server, daemon=True)
    # server_thread.start()
    # server_thread.join()


if __name__ == "__main__":
    try:
        run()
    except Exception:
        logger.error("Unhandled exception in core system:")
        traceback.print_exc()
        print("\nPress Enter to exit...")
        input()
        sys.exit(1)
