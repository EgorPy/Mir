from collections import defaultdict
from fastapi import WebSocket
import json


class ConnectionManager:

    def __init__(self):
        self.user_connections: dict[str, set[WebSocket]] = defaultdict(set)
        self.chat_subscriptions: dict[int, set[WebSocket]] = defaultdict(set)
        self.ws_users: dict[WebSocket, str] = {}

    async def connect(self, ws: WebSocket, user_id: str):
        self.user_connections[user_id].add(ws)
        self.ws_users[ws] = user_id
        await self.emit_user_status(user_id, True)

    async def disconnect(self, ws: WebSocket):
        user_id = self.ws_users.get(ws)

        if not user_id:
            return

        self.user_connections[user_id].discard(ws)

        if not self.user_connections[user_id]:
            del self.user_connections[user_id]
            await self.emit_user_status(user_id, False)

        for chat in list(self.chat_subscriptions):
            self.chat_subscriptions[chat].discard(ws)

            if not self.chat_subscriptions[chat]:
                del self.chat_subscriptions[chat]

        del self.ws_users[ws]

    def subscribe_chat(self, ws: WebSocket, chat_id: int):
        self.chat_subscriptions[chat_id].add(ws)

    async def send_ws(self, ws: WebSocket, data: dict):
        await ws.send_text(json.dumps(data))

    async def send_user(self, user_id: str, data: dict):
        for ws in list(self.user_connections.get(user_id, [])):
            await self.send_ws(ws, data)

    async def send_chat(self, chat_id: int, data: dict):
        for ws in list(self.chat_subscriptions.get(chat_id, [])):
            await self.send_ws(ws, data)

    async def emit_user_status(self, user_id: str, online: bool):
        event = {
            "type": "user_status",
            "user_id": user_id,
            "online": online
        }

        for connections in self.user_connections.values():
            for ws in connections:
                await self.send_ws(ws, event)


manager = ConnectionManager()
