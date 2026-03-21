from core.method_generator import AutoDB, cm
from core.logger import logger

from backend.tech.websockets.websockets_nonce import create_nonce
from backend.tech.websockets.websockets_manager import ws_manager, ws_event
from backend.services.chats.schema import Messages
from backend.services.auth.schema import Users

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime
import secrets
import json

app = APIRouter()


@app.get("/ws-nonce")
async def get_ws_nonce(user_id: str):
    nonce = create_nonce(int(user_id))
    return {"nonce": nonce}


@ws_event.event("subscribe_chat")
async def subscribe_chat(ws: WebSocket, data: dict):
    chat_id = int(data["chat_id"])
    ws_manager.subscribe_chat(ws, chat_id)


@ws_event.event("send_message")
async def send_message(ws, data: dict):
    chat_id = int(data.get("chat_id"))
    text = data.get("text", "").strip()
    if not text or not chat_id:
        return

    user_id = ws_manager.ws_users.get(ws)
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

    await ws_manager.send_chat(chat_id, {
        "type": "new_message",
        "message": message
    })


@ws_event.event("delete_messages")
async def delete_messages(ws, data: dict):
    chat_id = int(data.get("chat_id"))

    db = AutoDB(cm)

    result = await db.delete_in_async(
        Messages,
        id=data.get("messages")
    )

    await ws_manager.send_chat(chat_id, {
        "type": "messages_deleted",
        "messages": data.get("messages")
    })

    return {"ok": True}


@ws_event.event("typing")
async def typing(ws: WebSocket, data: dict):
    chat_id = int(data["chat_id"])
    user_id = ws_manager.ws_users.get(ws)

    await ws_manager.send_chat(chat_id, {
        "type": "typing",
        "chat_id": chat_id,
        "user_id": user_id
    })


@ws_event.event("message_delivered")
async def message_delivered(ws: WebSocket, data: dict):
    chat_id = data["chat_id"]
    message_id = data["message_id"]
    user_id = ws_manager.ws_users.get(ws)

    await ws_manager.send_chat(chat_id, {
        "type": "message_delivered",
        "message_id": message_id,
        "user_id": user_id
    })


@ws_event.event("message_read")
async def message_read(ws: WebSocket, data: dict):
    chat_id = data["chat_id"]
    message_id = data["message_id"]
    user_id = ws_manager.ws_users.get(ws)

    db = AutoDB(cm)

    await db.update_async(Messages,
                          {"read_at": datetime.now().replace(microsecond=0)},
                          {"id": message_id})

    message = await db.select_one_async(Messages, id=message_id)
    if not message:
        return

    if message.get("author") == str(user_id):
        return

    await ws_manager.send_chat(chat_id, {
        "type": "message_read",
        "message_id": message_id,
        "user_id": user_id
    })


@ws_event.event("ping")
async def ping(ws: WebSocket, data: dict):
    await ws_manager.send_ws(ws, {"type": "pong"})


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

        from backend.tech.websockets.websockets_nonce import validate_nonce

        real_user_id = validate_nonce(nonce)

        if real_user_id is None or int(real_user_id) != int(user_id):
            await ws.close()
            return

        user_id = int(user_id)

        session_id = secrets.token_hex(32)

        await ws_manager.send_ws(ws, {
            "type": "auth_ok",
            "session_id": session_id
        })

        await ws_manager.connect(ws, user_id)

        await ws_manager.emit_user_status(user_id, True)

        while True:
            raw = await ws.receive_text()

            try:
                data = json.loads(raw)
            except:
                continue

            event = data.get("type")
            if not event:
                continue

            await ws_event.dispatch(event, ws, data)

    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(ws)

        if user_id is not None:
            logger.info(f"WS disconnect {user_id}")
