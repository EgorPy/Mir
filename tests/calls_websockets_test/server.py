"""
Сервер для ГРУППОВОГО аудиозвонка через WebSocket (PCM16-relay).

Клиенты шлют бинарные кадры PCM16 (моно, 16 кГц, little-endian, 20 мс).
Каждый кадр самодостаточен, поэтому серверу не нужно хранить init-чанки:
он просто пересылает кадр всем остальным в комнате, добавляя заголовок
с идентификатором отправителя.

Формат бинарного пакета, который уходит получателям:
  ┌──────────────────┬──────────────────┬──────────────────────┐
  │  1 byte          │  N bytes         │  остальное           │
  │  len(peer_id)    │  peer_id (UTF-8) │  PCM16 LE            │
  └──────────────────┴──────────────────┴──────────────────────┘
"""

import asyncio
import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Group WebSocket Audio Call")

# Словарь комнат: { call_id: { peer_id: WebSocket } }
rooms: dict[str, dict[str, WebSocket]] = {}

# Максимум участников на комнату (0 = без ограничений)
MAX_PEERS_PER_ROOM = 10

# Нормальный кадр: 20 мс * 16 кГц * 2 байта = 640 байт.
# Всё, что сильно больше, считаем мусором и не рассылаем.
MAX_AUDIO_FRAME_BYTES = 4096


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def index():
    with open("client.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "rooms": {
            cid: list(peers.keys())
            for cid, peers in rooms.items()
        }
    }


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------

@app.websocket("/ws/{call_id}/{peer_id}")
async def websocket_call(websocket: WebSocket, call_id: str, peer_id: str):
    await websocket.accept()
    logger.info(f"[{call_id}] + {peer_id}")

    # В заголовке длина peer_id занимает 1 байт
    if len(peer_id.encode("utf-8")) > 255:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": "peer_id_too_long"
        }))
        await websocket.close(code=4003)
        return

    room = rooms.setdefault(call_id, {})

    if MAX_PEERS_PER_ROOM and len(room) >= MAX_PEERS_PER_ROOM:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": "room_full"
        }))
        await websocket.close(code=4001)
        return

    if peer_id in room:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": "peer_id_taken"
        }))
        await websocket.close(code=4002)
        return

    existing_peers = list(room.keys())

    await websocket.send_text(json.dumps({
        "type": "joined",
        "call_id": call_id,
        "peer_id": peer_id,
        "peers": existing_peers,
    }))

    room[peer_id] = websocket

    await _broadcast_text(room, exclude=peer_id, data={
        "type": "peer_joined",
        "peer_id": peer_id,
    })

    try:
        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                break

            elif message.get("bytes") is not None:
                audio: bytes = message["bytes"]

                if not audio or len(audio) > MAX_AUDIO_FRAME_BYTES:
                    continue

                await _broadcast_bytes(
                    room,
                    exclude=peer_id,
                    data=_frame(peer_id, audio)
                )

            elif message.get("text") is not None:
                try:
                    await _handle_signaling(
                        room,
                        peer_id,
                        json.loads(message["text"]),
                        websocket
                    )
                except (json.JSONDecodeError, KeyError):
                    pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"[{call_id}] {peer_id} error: {e}")
    finally:
        room.pop(peer_id, None)

        logger.info(
            f"[{call_id}] - {peer_id}. "
            f"Remaining: {list(room.keys())}"
        )

        await _broadcast_text(room, exclude=None, data={
            "type": "peer_left",
            "peer_id": peer_id,
        })

        if not room:
            rooms.pop(call_id, None)


# ---------------------------------------------------------------------------
# Упаковка бинарного фрейма
# ---------------------------------------------------------------------------

def _frame(peer_id: str, audio: bytes) -> bytes:
    """
    [1 байт: длина peer_id][peer_id байты][аудио байты]
    """
    id_bytes = peer_id.encode("utf-8")
    return bytes([len(id_bytes)]) + id_bytes + audio


# ---------------------------------------------------------------------------
# Broadcast хелперы
# ---------------------------------------------------------------------------

async def _safe_send_bytes(ws: WebSocket, data: bytes):
    try:
        await ws.send_bytes(data)
    except Exception:
        pass


async def _safe_send_text(ws: WebSocket, payload: str):
    try:
        await ws.send_text(payload)
    except Exception:
        pass


async def _broadcast_bytes(room: dict, exclude: str | None, data: bytes):
    # Параллельная отправка: один медленный клиент не задерживает остальных
    await asyncio.gather(*(
        _safe_send_bytes(ws, data)
        for pid, ws in list(room.items())
        if pid != exclude
    ))


async def _broadcast_text(room: dict, exclude: str | None, data: dict):
    payload = json.dumps(data)
    await asyncio.gather(*(
        _safe_send_text(ws, payload)
        for pid, ws in list(room.items())
        if pid != exclude
    ))


async def _handle_signaling(room, sender_id, data, websocket):
    t = data.get("type")

    if t == "ping":
        await websocket.send_text(json.dumps({"type": "pong"}))

    elif t == "mute":
        await _broadcast_text(room, exclude=sender_id, data={
            "type": "peer_muted",
            "peer_id": sender_id,
            "muted": data.get("muted", True),
        })

    else:
        data["from"] = sender_id
        await _broadcast_text(room, exclude=sender_id, data=data)


# ---------------------------------------------------------------------------
# Запуск
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.environ.get("CALLS_PORT", 8001))
    uvicorn.run("tests.calls_websockets_test.server:app", host="0.0.0.0", port=port, reload=False)
