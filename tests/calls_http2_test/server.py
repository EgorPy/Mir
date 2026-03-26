"""
Групповой аудиозвонок поверх HTTP/2 (без WebSocket).

Трафик выглядит как обычные HTTPS-запросы браузера — DPI не отличит
от просмотра сайта с динамическими обновлениями.

Три типа эндпоинтов:
  GET  /events/{call_id}/{peer_id}   — SSE-поток сигналинга (кто зашёл/вышел)
  POST /send/{call_id}/{peer_id}     — загрузка аудио-чанка (binary body)
  GET  /recv/{call_id}/{peer_id}     — chunked-стрим входящего аудио

Формат бинарного пакета (тот же, что в WebSocket-версии):
  ┌──────────────────┬──────────────────┬──────────────────────┐
  │  1 byte          │  N bytes         │  остальное           │
  │  len(peer_id)    │  peer_id (UTF-8) │  аудио-данные (Opus) │
  └──────────────────┴──────────────────┴──────────────────────┘

Зависимости:
  pip install fastapi uvicorn[standard] hypercorn h2
"""

import asyncio
import json
import logging
import time
from collections import defaultdict, deque

from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="HTTP/2 Group Audio Call")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # в проде замените на свой домен
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Внутреннее состояние
# ---------------------------------------------------------------------------

# rooms[call_id][peer_id] = asyncio.Queue с бинарными чанками для ЭТОГО peer
# Т.е. когда peer A шлёт аудио — оно кладётся в очереди всех остальных
rooms: dict[str, dict[str, asyncio.Queue]] = defaultdict(dict)

# Очереди сигналинга: signal_queues[call_id][peer_id] = asyncio.Queue со строками SSE
signal_queues: dict[str, dict[str, asyncio.Queue]] = defaultdict(dict)

# Когда пир последний раз присылал данные (для детекции разрыва)
last_seen: dict[str, dict[str, float]] = defaultdict(dict)

# Максимум байт в очереди одного пира, чтобы не копить лаг
MAX_QUEUE_BYTES = 512_000  # ~0.5 МБ
MAX_QUEUE_ITEMS = 200  # чанков


# ---------------------------------------------------------------------------
# HTTP — отдаём клиентский файл
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def index():
    with open("client.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/health")
async def health():
    return {
        "rooms": {
            cid: list(peers.keys())
            for cid, peers in rooms.items()
        }
    }


# ---------------------------------------------------------------------------
# Эндпоинт 1: SSE — сигналинг (join / leave / mute и т.п.)
# ---------------------------------------------------------------------------

@app.get("/events/{call_id}/{peer_id}")
async def sse_events(call_id: str, peer_id: str, request: Request):
    """
    Server-Sent Events — выглядит как обычная веб-страница с «живыми» обновлениями.
    Браузер сам переподключается при обрыве (EventSource API).
    Content-Type: text/event-stream — стандартный тип, не вызывает подозрений у DPI.
    """
    # Создаём очереди для нового участника
    if peer_id not in rooms[call_id]:
        rooms[call_id][peer_id] = asyncio.Queue(maxsize=MAX_QUEUE_ITEMS)
    if peer_id not in signal_queues[call_id]:
        signal_queues[call_id][peer_id] = asyncio.Queue(maxsize=500)

    last_seen[call_id][peer_id] = time.time()

    # Сообщаем новому пиру, кто уже в комнате
    existing_peers = [p for p in rooms[call_id] if p != peer_id]
    await signal_queues[call_id][peer_id].put(
        _sse("joined", {"call_id": call_id, "peer_id": peer_id, "peers": existing_peers})
    )

    # Всем остальным — peer_joined
    await _broadcast_signal(call_id, exclude=peer_id, event="peer_joined", data={"peer_id": peer_id})
    logger.info(f"[{call_id}] + {peer_id}")

    async def event_generator():
        """Генератор SSE: ждём из очереди и льём клиенту."""
        q = signal_queues[call_id][peer_id]
        try:
            while True:
                # Проверяем, не закрыл ли клиент соединение
                if await request.is_disconnected():
                    break

                try:
                    # Ждём новое событие максимум 15 сек, потом шлём keepalive
                    msg = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield msg
                except asyncio.TimeoutError:
                    # SSE keepalive — комментарий-пустышка, браузер игнорирует
                    # Это важно: без keepalive прокси/балансировщики закрывают «мёртвые» соединения
                    yield ": keepalive\n\n"

        finally:
            # Пир ушёл — чистим
            await _peer_leave(call_id, peer_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # отключает буферизацию в nginx
            "Connection": "keep-alive",
        },
    )


# ---------------------------------------------------------------------------
# Эндпоинт 2: POST /send — клиент шлёт аудио-чанк
# ---------------------------------------------------------------------------

@app.post("/send/{call_id}/{peer_id}")
async def receive_audio(call_id: str, peer_id: str, request: Request):
    """
    Клиент делает fetch('POST /send/...', { body: audioChunk }) каждые ~60 мс.
    С точки зрения DPI — обычный POST-запрос, таких тысячи на любом сайте.

    Тело запроса — сырые байты аудио (Opus из MediaRecorder).
    Сервер добавляет заголовок с peer_id и кладёт в очереди остальных участников.
    """
    if call_id not in rooms or peer_id not in rooms[call_id]:
        return Response(status_code=404)

    audio: bytes = await request.body()
    if not audio:
        return Response(status_code=204)

    last_seen[call_id][peer_id] = time.time()

    # Пакуем: [1 байт длины ID][ID байты][аудио]
    framed = _frame(peer_id, audio)

    # Кладём в очередь каждого другого участника
    for pid, q in rooms[call_id].items():
        if pid == peer_id:
            continue
        if not q.full():
            await q.put(framed)
        # Если очередь полна — дроп (лучше потерять чанк, чем копить лаг)

    # Минимальный ответ — 200 OK с пустым телом
    # Некоторые DPI видят «запрос-ответ» и считают это нормальным HTTP
    return Response(status_code=200)


# ---------------------------------------------------------------------------
# Эндпоинт 3: GET /recv — клиент получает аудио потоком
# ---------------------------------------------------------------------------

@app.get("/recv/{call_id}/{peer_id}")
async def stream_audio(call_id: str, peer_id: str, request: Request):
    """
    Клиент держит одно долгоживущее GET-соединение.
    Сервер льёт бинарные чанки через chunked transfer encoding.

    Content-Type: application/octet-stream — стандартный тип для бинарных файлов.
    DPI видит «скачивание файла» — не вызывает подозрений.

    Каждый чанк предварён 4-байтовым big-endian length prefix, чтобы клиент
    знал границы пакетов в потоке (TCP не сохраняет границы сообщений).

    ┌────────────────┬──────────────────────────────┐
    │  4 bytes BE    │  N bytes                     │
    │  packet_length │  framed audio (с peer_id)    │
    └────────────────┴──────────────────────────────┘
    """
    if call_id not in rooms or peer_id not in rooms[call_id]:
        return Response(status_code=404)

    async def audio_generator():
        q: asyncio.Queue = rooms[call_id][peer_id]
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    framed: bytes = await asyncio.wait_for(q.get(), timeout=20.0)
                    # Length prefix: клиент читает ровно столько байт, сколько указано
                    length_prefix = len(framed).to_bytes(4, "big")
                    yield length_prefix + framed
                except asyncio.TimeoutError:
                    # Keepalive: шлём 4 нулевых байта (длина 0 = нет данных)
                    yield b"\x00\x00\x00\x00"
        finally:
            pass  # Cleanup уже в SSE finally

    return StreamingResponse(
        audio_generator(),
        media_type="application/octet-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Transfer-Encoding": "chunked",
        },
    )


@app.post("/signal/{call_id}/{peer_id}")
async def signaling(call_id: str, peer_id: str, request: Request):
    """
    Дополнительный эндпоинт для сигнальных сообщений (mute/unmute, и т.п.).
    Тоже выглядит как обычный API-запрос.
    """
    if call_id not in signal_queues or peer_id not in signal_queues[call_id]:
        return Response(status_code=404)

    try:
        data = await request.json()
    except Exception:
        return Response(status_code=400)

    t = data.get("type")

    if t == "mute":
        await _broadcast_signal(call_id, exclude=peer_id, event="peer_muted", data={
            "peer_id": peer_id, "muted": data.get("muted", True)
        })
    else:
        data["from"] = peer_id
        await _broadcast_signal(call_id, exclude=peer_id, event="message", data=data)

    return Response(status_code=200)


def _frame(peer_id: str, audio: bytes) -> bytes:
    id_bytes = peer_id.encode("utf-8")
    return bytes([len(id_bytes)]) + id_bytes + audio


def _sse(event: str, data: dict) -> str:
    """ Formats SSE-message according to the specification. """

    response = f"event: {event}\ndata: {json.dumps(data)}\n\n"
    return response


async def _broadcast_signal(call_id: str, exclude: str | None, event: str, data: dict):
    """Рассылает SSE-событие всем участникам, кроме exclude."""
    msg = _sse(event, data)
    for pid, q in signal_queues.get(call_id, {}).items():
        if pid == exclude:
            continue
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            pass


async def _peer_leave(call_id: str, peer_id: str):
    """Убирает пира из всех структур и уведомляет остальных."""
    rooms[call_id].pop(peer_id, None)
    signal_queues[call_id].pop(peer_id, None)
    last_seen[call_id].pop(peer_id, None)

    logger.info(f"[{call_id}] - {peer_id}. Remaining: {list(rooms[call_id].keys())}")

    await _broadcast_signal(call_id, exclude=None, event="peer_left", data={"peer_id": peer_id})

    # Чистим пустые комнаты
    if not rooms[call_id]:
        rooms.pop(call_id, None)
        signal_queues.pop(call_id, None)
        last_seen.pop(call_id, None)


# ---------------------------------------------------------------------------
# Запуск
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # hypercorn умеет HTTP/2 «из коробки» — uvicorn пока только HTTP/1.1
    # Для HTTP/2 нужен TLS, поэтому нужны сертификаты.
    #
    # Быстрый самоподписанный сертификат для тестов:
    #   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj '/CN=localhost'
    #
    # Запуск с HTTP/2:
    #   hypercorn server:app --bind 0.0.0.0:443 --certfile cert.pem --keyfile key.pem
    #
    # Запуск без TLS (HTTP/1.1, для локальной отладки):
    #   python server.py
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
