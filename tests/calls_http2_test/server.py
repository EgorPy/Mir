"""
Group audio call over HTTP/2 (no WebSocket).

Traffic looks like ordinary HTTPS browser requests — DPI cannot distinguish
it from a website with dynamic updates.

Endpoints:
  GET  /events/{call_id}/{peer_id}  — SSE signaling stream (join/leave/mute)
  POST /send/{call_id}/{peer_id}    — upload one audio chunk (binary body)
  GET  /recv/{call_id}/{peer_id}    — chunked stream of incoming audio

Binary packet layout (same framing used in WebSocket versions):
  ┌─────────────┬─────────────────┬────────────────────────┐
  │ 1 byte      │ N bytes         │ remainder              │
  │ len(peer_id)│ peer_id (UTF-8) │ audio data (Opus/WebM) │
  └─────────────┴─────────────────┴────────────────────────┘

Wire format for /recv stream — each packet is length-prefixed:
  ┌──────────────┬─────────────────────────────┐
  │ 4 bytes BE   │ N bytes                     │
  │ packet_len   │ framed audio (see above)    │
  └──────────────┴─────────────────────────────┘
  A packet_len of 0 is a keepalive (no payload).

Install:
  pip install fastapi "uvicorn[standard]"
Run:
  python server.py
"""

import asyncio
import json
import logging
import time
from collections import defaultdict

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="HTTP/2 Group Audio Call")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory state
# ---------------------------------------------------------------------------

# Audio queues:  rooms[call_id][peer_id] → Queue of framed bytes
rooms: dict[str, dict[str, asyncio.Queue]] = defaultdict(dict)

# Signal queues: signal_queues[call_id][peer_id] → Queue of SSE strings
signal_queues: dict[str, dict[str, asyncio.Queue]] = defaultdict(dict)

# Generation counter — incremented on every (re)join for the same peer_id.
# The SSE cleanup callback captures its generation at connect time and skips
# teardown when a newer connection has already taken over.
_peer_gen: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

MAX_QUEUE_ITEMS = 200  # per-peer audio chunk backlog limit (drop on overflow)
MAX_SIGNAL_ITEMS = 500  # per-peer signal backlog limit


# ---------------------------------------------------------------------------
# Static file
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def index():
    with open("client.html", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/health")
async def health():
    return {
        "rooms": {cid: list(peers) for cid, peers in rooms.items()}
    }


# ---------------------------------------------------------------------------
# Endpoint 1 — SSE signaling
# ---------------------------------------------------------------------------

@app.get("/events/{call_id}/{peer_id}")
async def sse_events(call_id: str, peer_id: str, request: Request):
    """
    Long-lived GET that delivers JSON-encoded signaling events.
    The browser EventSource API reconnects automatically on drop.

    Generation tracking prevents a stale cleanup callback from evicting
    a peer that has already reconnected with the same peer_id.
    """
    # Always (re)create queues so a reconnecting peer gets a clean slate.
    rooms[call_id][peer_id] = asyncio.Queue(maxsize=MAX_QUEUE_ITEMS)
    signal_queues[call_id][peer_id] = asyncio.Queue(maxsize=MAX_SIGNAL_ITEMS)

    _peer_gen[call_id][peer_id] += 1
    my_gen = _peer_gen[call_id][peer_id]

    existing = [p for p in rooms[call_id] if p != peer_id]
    await signal_queues[call_id][peer_id].put(
        _sse("joined", {"call_id": call_id, "peer_id": peer_id, "peers": existing})
    )
    await _broadcast_signal(call_id, exclude=peer_id, event="peer_joined",
                            data={"peer_id": peer_id})
    logger.info("[%s] + %s (gen %d)", call_id, peer_id, my_gen)

    async def event_generator():
        q = signal_queues[call_id].get(peer_id)
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield msg
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            await _peer_leave(call_id, peer_id, my_gen)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ---------------------------------------------------------------------------
# Endpoint 2 — audio upload (POST /send)
# ---------------------------------------------------------------------------

@app.post("/send/{call_id}/{peer_id}")
async def receive_audio(call_id: str, peer_id: str, request: Request):
    """
    Client calls this every ~60 ms with a raw WebM audio chunk in the body.
    The server frames the chunk with the sender's peer_id and fans it out
    to all other participants.  Full queues are simply dropped to avoid
    accumulating latency.
    """
    if call_id not in rooms or peer_id not in rooms[call_id]:
        return Response(status_code=404)

    audio = await request.body()
    if not audio:
        return Response(status_code=204)

    framed = _frame(peer_id, audio)

    for pid, q in rooms[call_id].items():
        if pid == peer_id:
            continue  # do not echo back to sender
        if not q.full():
            await q.put(framed)
        # else: drop — a lost chunk causes a brief glitch, accumulated lag is worse

    return Response(status_code=200)


# ---------------------------------------------------------------------------
# Endpoint 3 — audio download (GET /recv)
# ---------------------------------------------------------------------------

@app.get("/recv/{call_id}/{peer_id}")
async def stream_audio(call_id: str, peer_id: str, request: Request):
    """
    Client holds one persistent GET connection.  The server pushes framed
    audio chunks as they arrive from other participants.
    Each chunk is prefixed with its 4-byte big-endian length.
    A zero-length prefix (b'\\x00\\x00\\x00\\x00') is a keepalive heartbeat.
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
                    yield len(framed).to_bytes(4, "big") + framed
                except asyncio.TimeoutError:
                    yield b"\x00\x00\x00\x00"
        finally:
            pass  # cleanup is handled by the SSE connection's finally block

    return StreamingResponse(
        audio_generator(),
        media_type="application/octet-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Transfer-Encoding": "chunked",
        },
    )


# ---------------------------------------------------------------------------
# Endpoint 4 — extra signaling messages (mute/unmute, etc.)
# ---------------------------------------------------------------------------

@app.post("/signal/{call_id}/{peer_id}")
async def signaling(call_id: str, peer_id: str, request: Request):
    if call_id not in signal_queues or peer_id not in signal_queues[call_id]:
        return Response(status_code=404)

    try:
        data = await request.json()
    except Exception:
        return Response(status_code=400)

    if data.get("type") == "mute":
        await _broadcast_signal(call_id, exclude=peer_id, event="peer_muted",
                                data={"peer_id": peer_id, "muted": data.get("muted", True)})
    else:
        data["from"] = peer_id
        await _broadcast_signal(call_id, exclude=peer_id, event="message", data=data)

    return Response(status_code=200)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _frame(peer_id: str, audio: bytes) -> bytes:
    """Prepend a 1-byte peer_id length and the peer_id bytes to audio data."""
    id_bytes = peer_id.encode()
    return bytes([len(id_bytes)]) + id_bytes + audio


def _sse(event: str, data: dict) -> str:
    """Format a Server-Sent Events message."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def _broadcast_signal(call_id: str, exclude: str | None,
                            event: str, data: dict) -> None:
    """Send an SSE event to every peer in the room except `exclude`."""
    msg = _sse(event, data)
    for pid, q in signal_queues.get(call_id, {}).items():
        if pid == exclude:
            continue
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            pass


async def _peer_leave(call_id: str, peer_id: str, gen: int) -> None:
    """
    Remove a peer and notify the room.

    The `gen` parameter guards against a race condition where a peer
    reconnects before the old SSE connection's finally block runs.
    If a newer generation is already registered, we skip cleanup.
    """
    current_gen = _peer_gen.get(call_id, {}).get(peer_id, 0)
    if current_gen != gen:
        logger.info("[%s] skipping stale cleanup for %s (gen %d, current %d)",
                    call_id, peer_id, gen, current_gen)
        return

    rooms[call_id].pop(peer_id, None)
    signal_queues[call_id].pop(peer_id, None)
    _peer_gen[call_id].pop(peer_id, None)

    logger.info("[%s] - %s  remaining: %s", call_id, peer_id,
                list(rooms[call_id].keys()))

    await _broadcast_signal(call_id, exclude=None, event="peer_left",
                            data={"peer_id": peer_id})

    if not rooms[call_id]:
        rooms.pop(call_id, None)
        signal_queues.pop(call_id, None)
        _peer_gen.pop(call_id, None)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
