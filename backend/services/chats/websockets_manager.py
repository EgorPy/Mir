from fastapi import WebSocket, WebSocketDisconnect
from collections import defaultdict
import json


class ConnectionManager:

    def __init__(self):
        self.user_connections: dict[int, set[WebSocket]] = defaultdict(set)
        self.chat_subscriptions: dict[int, set[WebSocket]] = defaultdict(set)
        self.ws_users: dict[WebSocket, int] = {}

    async def connect(self, ws: WebSocket, user_id: int):
        self.user_connections[user_id].add(ws)
        self.ws_users[ws] = user_id

    async def disconnect(self, ws: WebSocket):
        user_id = self.ws_users.get(ws)

        if not user_id:
            return

        self.user_connections[user_id].discard(ws)

        if not self.user_connections[user_id]:
            del self.user_connections[user_id]
            await self.emit_user_status(user_id, False)

        for chat_id in list(self.chat_subscriptions):
            self.chat_subscriptions[chat_id].discard(ws)

            if not self.chat_subscriptions[chat_id]:
                del self.chat_subscriptions[chat_id]

        del self.ws_users[ws]

    def subscribe_chat(self, ws: WebSocket, chat_id: int):
        self.chat_subscriptions[chat_id].add(ws)

    async def send_ws(self, ws: WebSocket, data: dict):
        try:
            await ws.send_text(json.dumps(data))
        except (WebSocketDisconnect, RuntimeError):
            await self.disconnect(ws)

    async def send_user(self, user_id: int, data: dict):
        for ws in list(self.user_connections.get(user_id, [])):
            await self.send_ws(ws, data)

    async def send_chat(self, chat_id: int, data: dict):
        for ws in list(self.chat_subscriptions.get(chat_id, [])):
            await self.send_ws(ws, data)

    async def emit_user_status(self, user_id: int, online: bool):
        event = {
            "type": "user_status",
            "user_id": user_id,
            "online": online
        }

        for uid, connections in self.user_connections.items():
            if uid == user_id:
                continue

            for ws in list(connections):
                await self.send_ws(ws, event)


manager = ConnectionManager()
