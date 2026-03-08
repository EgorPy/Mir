from fastapi import WebSocket, WebSocketDisconnect, Depends

from backend.services.auth.api.auth import check_user_session
from backend.services.chats.service import router
from backend.services.chats.websockets_manager import manager

from core.logger import logger

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
async def websocket_endpoint(
        ws: WebSocket,
        user_id: str = Depends(check_user_session)
):
    logger.info(f"WS connect {user_id}")

    await manager.connect(ws, user_id)

    try:
        while True:
            raw = await ws.receive_text()
            data = json.loads(raw)
            event = data.get("type")
            await events.dispatch(event, ws, data)
    except WebSocketDisconnect:
        await manager.disconnect(ws)
        logger.info(f"WS disconnect {user_id}")
