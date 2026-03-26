"""
Сервер для ГРУППОВОГО аудиозвонка через WebSocket.

Отличия от 1-на-1:
  - Нет лимита на кол-во участников (можно выставить своё MAX_PEERS)
  - Relay рассылает аудио-чанки всем остальным в комнате
  - Каждый бинарный пакет предваряется 1-байтовым заголовком длины peer_id
    и самим peer_id, чтобы получатель знал, от кого пришёл звук

Формат бинарного пакета (binary frame):
  ┌──────────────────┬──────────────────┬──────────────────────┐
  │  1 byte          │  N bytes         │  остальное           │
  │  len(peer_id)    │  peer_id (UTF-8) │  аудио-данные (Opus) │
  └──────────────────┴──────────────────┴──────────────────────┘

Такой формат позволяет клиенту читать: "первый байт = длина ID, следующие N
байт = кто прислал, остальное = аудио". Это дешевле, чем JSON-обёртка.
"""

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
MAX_PEERS_PER_ROOM = 0


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

    # Инициализируем комнату
    if call_id not in rooms:
        rooms[call_id] = {}
    room = rooms[call_id]

    # Проверки
    if MAX_PEERS_PER_ROOM and len(room) >= MAX_PEERS_PER_ROOM:
        await websocket.send_text(json.dumps({"type": "error", "message": "room_full"}))
        await websocket.close(code=4001)
        return

    if peer_id in room:
        await websocket.send_text(json.dumps({"type": "error", "message": "peer_id_taken"}))
        await websocket.close(code=4002)
        return

    room[peer_id] = websocket

    # Сообщаем новому участнику, кто уже есть в комнате
    await websocket.send_text(json.dumps({
        "type": "joined",
        "call_id": call_id,
        "peer_id": peer_id,
        "peers": list(room.keys()),
    }))

    # Остальным сообщаем, что пришёл новый
    await _broadcast_text(room, exclude=peer_id, data={
        "type": "peer_joined",
        "peer_id": peer_id,
    })

    # Главный цикл
    try:
        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                break

            elif message.get("bytes") is not None:
                # Аудио-чанк: сервер добавляет заголовок с peer_id и рассылает
                audio: bytes = message["bytes"]
                framed = _frame(peer_id, audio)
                await _broadcast_bytes(room, exclude=peer_id, data=framed)

            elif message.get("text") is not None:
                try:
                    await _handle_signaling(room, peer_id, json.loads(message["text"]), websocket)
                except (json.JSONDecodeError, KeyError):
                    pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"[{call_id}] {peer_id} error: {e}")
    finally:
        room.pop(peer_id, None)
        logger.info(f"[{call_id}] - {peer_id}. Remaining: {list(room.keys())}")

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

async def _broadcast_bytes(room: dict, exclude: str | None, data: bytes):
    for pid, ws in list(room.items()):
        if pid == exclude:
            continue
        try:
            await ws.send_bytes(data)
        except Exception:
            pass


async def _broadcast_text(room: dict, exclude: str | None, data: dict):
    payload = json.dumps(data)
    for pid, ws in list(room.items()):
        if pid == exclude:
            continue
        try:
            await ws.send_text(payload)
        except Exception:
            pass


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

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
