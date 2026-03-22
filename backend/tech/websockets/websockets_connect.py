from core.logger import logger

from backend.tech.websockets.websockets_manager import ws_manager, ws_event
from backend.tech.websockets.websockets_nonce import create_nonce

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import secrets
import json

app = APIRouter()


@app.get("/ws-nonce")
async def get_ws_nonce(user_id: str):
    nonce = create_nonce(int(user_id))
    return {"nonce": nonce}


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
