""" Backend API """

import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import config
from core.logger import logger

from backend.services.auth.api.auth import router as auth_router
from backend.services.chats.service import router as chats_router
from backend.phone_mode import DEBUG_PHONE_MODE, SERVER_MODE

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
import uvicorn
import logging

import traceback
import sys

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


def start_server():
    """ Starts the server """

    logger.info(f"BACKEND server started at http://{config.DOMAIN}:{config.BACKEND_PORT}")
    if SERVER_MODE == True:
        uvicorn.run("backend_main:app", host=config.DOMAIN, port=int(config.BACKEND_PORT), reload=True)
    elif DEBUG_PHONE_MODE == False:
        uvicorn.run("backend_main:app", host=config.DOMAIN, port=int(config.BACKEND_PORT), reload=True,
                    ssl_certfile="192.168.1.140+1.pem", ssl_keyfile="192.168.1.140+1-key.pem")
    else:
        uvicorn.run("backend_main:app", host=config.DOMAIN, port=int(config.BACKEND_PORT), reload=True)


def run():
    """ Sets up the server """

    logger = logging.getLogger("core")
    logger.setLevel(logging.DEBUG)

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
