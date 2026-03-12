""" Backend API """

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # do not move down

from core.method_generator import AutoDB, Schema, cm
from core.config import config
from core.logger import logger

from backend.services.chats.schema import ChatMembers, Messages
from backend.services.auth.schema import Users

from backend.services.auth.api.auth import check_user_session

from backend.services.auth.api.auth import router as auth_router
from backend.services.chats.service import router as chats_router

from backend.services.chats.websockets_nonce import create_nonce
from backend.services.chats.websockets_manager import manager
from backend.phone_mode import DEBUG_PHONE_MODE, SERVER_MODE

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends

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
    nonce = create_nonce(int(user_id))
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


@app.get("/chats/{chat_id}/permissions/{user_id}")
async def get_permissions(chat_id: int, user_id: int, current_user=Depends(check_user_session)):
    db = AutoDB(cm)

    member = await db.select_one_async(ChatMembers, chat_id=chat_id, user_id=user_id)
    if not member:
        raise HTTPException(status_code=404, detail="User not in chat")

    return {"permissions": member.get("permissions", 0)}


@app.post("/chats/{chat_id}/permissions/update")
async def update_permissions(chat_id: int, data: dict, current_user=Depends(check_user_session)):
    target_user_id = data.get("user_id")
    new_permissions = data.get("permissions")
    if not target_user_id or new_permissions is None:
        raise HTTPException(400, "Missing parameters")

    db = AutoDB(cm)

    current_member = await db.select_one_async(ChatMembers, chat_id=chat_id, user_id=current_user["id"])
    if not current_member:
        raise HTTPException(403, "You are not a member of the chat")

    PERMISSIONS = {}  # TODO: FINISH THIS

    if not (current_member.get("permissions", 0) & (1 << list(PERMISSIONS["chat_members"].keys()).index("promote_members"))):
        raise HTTPException(403, "You are not allowed to update permissions")

    target_member = await db.select_one_async(ChatMembers, chat_id=chat_id, user_id=target_user_id)
    if not target_member:
        raise HTTPException(404, "Target user not in chat")

    await db.update_async(ChatMembers, {"permissions": new_permissions}, {"chat_id": chat_id, "user_id": target_user_id})

    await manager.send_chat(chat_id, {
        "type": "permissions_updated",
        "chat_id": chat_id,
        "user_id": target_user_id,
        "permissions": new_permissions
    })

    return {"ok": True}


@events.event("delete_messages")
async def delete_messages(ws, data: dict):
    chat_id = int(data.get("chat_id"))

    db = AutoDB(cm)

    result = await db.delete_in_async(
        Messages,
        id=data.get("messages")
    )

    await manager.send_chat(chat_id, {
        "type": "messages_deleted",
        "messages": data.get("messages")
    })

    return {"ok": True}


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

    user_id = None

    try:
        raw = await ws.receive_text()
        try:
            data = json.loads(raw)
        except:
            await ws.close()
            return

        if data.get("type") != "auth":
            await ws.close()
            return

        nonce = data.get("nonce")
        user_id = data.get("user_id")

        from backend.services.chats.websockets_nonce import validate_nonce

        real_user_id = validate_nonce(nonce)

        if real_user_id is None or int(real_user_id) != int(user_id):
            await ws.close()
            return

        user_id = int(user_id)

        session_id = secrets.token_hex(32)

        await manager.send_ws(ws, {
            "type": "auth_ok",
            "session_id": session_id
        })

        await manager.connect(ws, user_id)

        await manager.emit_user_status(user_id, True)

        while True:
            raw = await ws.receive_text()

            try:
                data = json.loads(raw)
            except:
                continue

            event = data.get("type")
            if not event:
                continue

            await events.dispatch(event, ws, data)

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(ws)

        if user_id is not None:
            logger.info(f"WS disconnect {user_id}")


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
