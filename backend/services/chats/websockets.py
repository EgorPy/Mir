from fastapi import WebSocket, WebSocketDisconnect

from backend.services.chats.service import router
from backend.services.chats.websockets_manager import manager
from backend.services.chats.websockets_nonce import validate_nonce, WS_PENDING_NONCES

from core.method_generator import AutoDB, cm
from core.logger import logger

from datetime import datetime
import secrets
import json


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


@events.event("subscribe_chat")
async def subscribe_chat(ws: WebSocket, data: dict):
    chat_id = int(data["chat_id"])
    manager.subscribe_chat(ws, chat_id)


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

    await manager.send_chat(chat_id, {
        "type": "message_read",
        "message_id": message_id,
        "user_id": user_id
    })


@events.event("ping")
async def ping(ws: WebSocket, data: dict):
    await manager.send_ws(ws, {"type": "pong"})


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    db = AutoDB(cm)

    await ws.accept()

    raw = await ws.receive_text()
    data = json.loads(raw)

    if data.get("type") != "auth":
        await ws.close()
        return

    nonce = data.get("nonce")

    user_id = validate_nonce(nonce)
    if not user_id:
        await ws.close()
        return

    if nonce not in WS_PENDING_NONCES:
        await ws.close()
        return

    del WS_PENDING_NONCES[nonce]

    session_id = secrets.token_hex(32)

    user_id = await db.execute_async(
        "SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?",
        (session_id, datetime.utcnow())
    )

    print(user_id)

    await manager.connect(ws, user_id)

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
