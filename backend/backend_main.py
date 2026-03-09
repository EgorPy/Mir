""" Backend API """

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # do not move down

from core.method_generator import AutoDB, Schema, cm
from core.config import config
from core.logger import logger

from backend.services.chats.schema import Messages
from backend.services.auth.schema import Users

from backend.services.auth.api.auth import router as auth_router
from backend.services.chats.service import router as chats_router

from backend.services.chats.websockets_nonce import WS_PENDING_NONCES, create_nonce
from backend.services.chats.websockets_manager import manager
from backend.phone_mode import DEBUG_PHONE_MODE, SERVER_MODE

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from datetime import datetime
import importlib
import traceback
import uvicorn
import logging
import inspect
import pkgutil
import secrets
import json

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


class WebSocketEventRouter:

    def __init__(self):
        self.handlers = {}

    def event(self, name):
        def decorator(func):
            self.handlers[name] = func
            return func

        return decorator

    async def dispatch(self, name, ws, data):
        handler = self.handlers.get(name)
        if handler:
            await handler(ws, data)


events = WebSocketEventRouter()


@app.get("/ws-nonce")
async def get_ws_nonce(user_id: str):
    nonce = create_nonce(user_id)
    return {"nonce": nonce}


@events.event("subscribe_chat")
async def subscribe_chat(ws: WebSocket, data: dict):
    chat_id = int(data["chat_id"])
    manager.subscribe_chat(ws, chat_id)


@events.event("send_message")
async def send_message(ws, data: dict):
    chat_id = int(data.get("chat_id"))
    text = data.get("text", "").strip()
    if not text or not chat_id:
        return

    user_id = manager.ws_users.get(ws)
    if not user_id:
        return

    db = AutoDB(cm)

    message = await db.insert_async(
        Messages,
        chat_id=chat_id,
        text=text,
        author=str(user_id),
        created_at=datetime.now().replace(microsecond=0)
    )

    user = await db.select_one_async(Users, id=str(user_id))

    if not message:
        return

    message["user_id"] = message.get("author")
    message["author"] = f"{user.get('first_name')} {user.get('last_name')}"

    await manager.send_chat(chat_id, {
        "type": "new_message",
        "message": message
    })


@events.event("typing")
async def typing(ws: WebSocket, data: dict):
    chat_id = int(data["chat_id"])
    user_id = manager.ws_users.get(ws)

    await manager.send_chat(chat_id, {
        "type": "typing",
        "chat_id": chat_id,
        "user_id": user_id
    })


@events.event("message_delivered")
async def message_delivered(ws: WebSocket, data: dict):
    chat_id = data["chat_id"]
    message_id = data["message_id"]
    user_id = manager.ws_users.get(ws)

    await manager.send_chat(chat_id, {
        "type": "message_delivered",
        "message_id": message_id,
        "user_id": user_id
    })


@events.event("message_read")
async def message_read(ws: WebSocket, data: dict):
    chat_id = data["chat_id"]
    message_id = data["message_id"]
    user_id = manager.ws_users.get(ws)

    db = AutoDB(cm)

    print(message_id, user_id)
    await db.update_async(Messages,
                          {"read_at": datetime.now().replace(microsecond=0)},
                          {"id": message_id})

    message = await db.select_one_async(Messages, id=message_id)
    if not message:
        return

    if message.get("author") == str(user_id):
        return

    await manager.send_chat(chat_id, {
        "type": "message_read",
        "message_id": message_id,
        "user_id": user_id
    })


@events.event("ping")
async def ping(ws: WebSocket, data: dict):
    await manager.send_ws(ws, {"type": "pong"})


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()

    raw = await ws.receive_text()
    data = json.loads(raw)

    if data.get("type") != "auth":
        await ws.close()
        return

    nonce = data.get("nonce")
    user_id = data.get("user_id")

    if nonce not in WS_PENDING_NONCES:
        await ws.close()
        return

    del WS_PENDING_NONCES[nonce]

    session_id = secrets.token_hex(32)

    # user_id = session_id  # временно, пока не свяжешь с реальным пользователем

    await manager.connect(ws, int(user_id))

    await manager.send_ws(ws, {
        "type": "auth_ok",
        "session_id": session_id
    })

    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except:
                continue
            event = data.get("type")
            await events.dispatch(event, ws, data)
    except WebSocketDisconnect:
        await manager.disconnect(ws)
        logger.info(f"WS disconnect {user_id}")


def get_schema_files():
    schemas_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend/services"))
    logger.info(f"Looking for schema files in: {schemas_path}")
    return pkgutil.iter_modules([schemas_path])


def ensure_schema(skip: bool = False):
    if skip:
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
        uvicorn.run("backend_main:app", host=config.DOMAIN, port=int(config.BACKEND_PORT), reload=True)
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
