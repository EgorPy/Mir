#!/usr/bin/env python3
"""
WebSocket client для pixel.xn--d1ah4a.com
Несколько параллельных воркеров (разные device_id) рисуют пиксели из GRID.
Каждый воркер берёт свою часть пикселей из общей очереди.
"""

import asyncio
import struct
import time
import uuid
import aiohttp
import websockets

# ══════════════════════════════════════════
# КОНФИГУРАЦИЯ
# ══════════════════════════════════════════

BASE_URL = "https://pixel.xn--d1ah4a.com"
WS_BASE = "wss://pixel.xn--d1ah4a.com/ws"
REFRESH_URL = f"{BASE_URL}/api/v1/auth/refresh"

PLATFORM = "web"
APP_VERSION = "1.0.0"

# Количество параллельных воркеров.
# Каждый — отдельное WS-соединение с уникальным device_id.
# Рекомендуется 3–5. Больше = быстрее, но риск бана аккаунта выше.
NUM_WORKERS = 1

# Один аккаунт — одни куки для всех воркеров.
# device_id генерируется автоматически для каждого воркера.
COOKIES = {
    "_ym_uid": "1772644551165549433",
    "_ym_d": "1772644551",
    "is_auth": "1",
    "_ym_isad": "2",
    "__ddg9_": "94.131.21.21",
    "__ddg8_": "xDguvqmCzyIzAlbQ",
    "__ddg10_": "1773782866",
    "refresh_token": "7972ca87c370516b6ef7cf73a5463a2a45faf0cea74bacf62ce0727898fe8f9e",
}

# Начальные координаты на холсте
ORIGIN_X = 15
ORIGIN_Y = 101

# Кулдаун по умолчанию (мс) — обновляется сервером через type=1/5
DEFAULT_COOLDOWN_MS = 300

# Запас поверх кулдауна (с) чтобы не получить Too many messages
COOLDOWN_EXTRA_S = 2

# Максимальное время ожидания подтверждения от сервера (с)
ACK_TIMEOUT_S = 90

# Grid: 0 = пропустить, любое другое число = индекс цвета
# Источник: 188.116.21.247:3000 (конвертировано из PNG через img_to_grid.py)
GRID = [
    [10, 0, 0, 0, 10, 10, 0, 0, 0, 10, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 0, 10, 10, 0, 0, 0, 0, 0, 10, 10, 0, 0, 0, 10,
     0, 0, 0, 0, 0, 10, 10, 0, 0, 0, 10, 10, 0, 0, 10, 10, 10, 10, 0, 0, 0, 0, 10, 10, 0, 0, 0, 10, 10, 0, 0, 0, 0, 10, 10, 0, 0,
     0, 10, 10, 0, 0],
    [10, 0, 0, 10, 0, 0, 10, 0, 10, 0, 0, 10, 0, 0, 0, 10, 10, 0, 0, 10, 10, 0, 0, 10, 10, 0, 0, 0, 0, 0, 0, 10, 0, 0, 10, 0, 10,
     10, 0, 0, 0, 0, 10, 0, 0, 10, 0, 10, 0, 10, 0, 0, 0, 0, 0, 10, 0, 10, 0, 10, 0, 0, 10, 0, 10, 0, 0, 10, 10, 0, 10, 0, 0, 10,
     0, 10, 0, 0, 10, 0],
    [10, 0, 0, 0, 10, 10, 0, 0, 0, 10, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0,
     10, 0, 0, 0, 0, 0, 0, 10, 0, 0, 10, 10, 10, 10, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 10, 0, 0, 10, 0, 0, 10, 10, 0, 10, 0, 0, 10,
     0, 10, 0, 0, 10, 0],
    [10, 0, 0, 10, 0, 0, 10, 0, 10, 0, 0, 10, 0, 0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0, 0, 0, 0, 10, 0, 0, 0, 0, 10,
     0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 0, 0, 10, 0, 10, 0, 0, 10, 10, 0, 10, 0, 0, 10, 0, 10,
     0, 0, 10, 0],
    [10, 10, 0, 0, 10, 10, 0, 0, 0, 10, 10, 0, 0, 10, 0, 10, 10, 10, 0, 10, 10, 10, 0, 0, 0, 10, 10, 0, 0, 10, 0, 10, 10, 10, 10,
     0, 10, 10, 10, 0, 10, 0, 10, 10, 10, 10, 0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 10, 10, 0, 0, 0, 10, 10, 0, 0, 0, 0, 10,
     10, 0, 0, 0, 10, 10, 0, 0],
]

# Цвета (индексы 0–31)
COLORS = {
    0: "Белый", 1: "Светло-серый", 2: "Серый",
    3: "Тёмно-серый", 4: "Чёрный", 5: "Тёмно-коричневый",
    6: "Коричневый", 7: "Телесный", 8: "Бордовый",
    9: "Тёмно-красный", 10: "Красный", 11: "Ярко-розовый",
    12: "Светло-розовый", 13: "Маджента", 14: "Тёмно-оранжевый",
    15: "Оранжевый", 16: "Жёлтый", 17: "Светло-жёлтый",
    18: "Тёмно-зелёный", 19: "Зелёный", 20: "Салатовый",
    21: "Морской", 22: "Тёмно-синий", 23: "Синий",
    24: "Светло-синий", 25: "Бирюзовый", 26: "Светло-голубой",
    27: "Тёмный индиго", 28: "Индиго", 29: "Фиолетовый",
    30: "Тёмно-фиолетовый", 31: "Холодный тёмный",
}


# ══════════════════════════════════════════
# ЛОГИРОВАНИЕ
# ══════════════════════════════════════════

def ts() -> str:
    return time.strftime("%H:%M:%S")


def log(worker_id: int | str, tag: str, msg: str) -> None:
    prefix = f"W{worker_id}" if isinstance(worker_id, int) else worker_id
    print(f"[{ts()}][{prefix}] {tag} {msg}")


# ══════════════════════════════════════════
# РАБОТА С ПИКСЕЛЯМИ
# ══════════════════════════════════════════

def encode_pixel(x: int, y: int, color: int) -> bytes:
    value = (x << 16) | (y << 5) | (color & 0x1F)
    return struct.pack("<I", value)


def grid_to_pixels(
        grid: list[list[int]],
        origin_x: int,
        origin_y: int,
) -> list[tuple[int, int, int]]:
    """Разворачивает 2D-grid в плоский список (x, y, color), пропуская нули."""
    pixels = []
    for row_idx, row in enumerate(grid):
        for col_idx, color in enumerate(row):
            if color != 0:
                pixels.append((origin_x + col_idx, origin_y + row_idx, color))
    return pixels


# ══════════════════════════════════════════
# РАЗБОР ВХОДЯЩИХ СООБЩЕНИЙ
# ══════════════════════════════════════════

def parse_message(data: bytes, cooldown_holder: list, worker_id: int) -> int | None:
    """
    Разбирает входящий бинарный пакет.
    Возвращает flag (int) или None для пакетов пикселей.
    """
    n = len(data)
    flag = data[0] if n > 0 else -1

    if n % 4 == 0:
        # Молчим про обновления холста — слишком много шума
        return None

    if flag == 1 and n == 5:
        ms = struct.unpack_from("<I", data, 1)[0]
        cooldown_holder[0] = ms
        log(worker_id, "<", f"✅ Пиксель принят! Кулдаун: {ms / 1000:.1f}с")

    elif flag == 4 and n == 5:
        online = struct.unpack_from("<I", data, 1)[0]
        log(worker_id, "<", f"Онлайн: {online}")

    elif flag == 5 and n == 6:
        ms = struct.unpack_from("<I", data, 1)[0]
        is_admin = data[5] == 1
        cooldown_holder[0] = ms
        log(worker_id, "<", f"Настройки: кулдаун={ms / 1000:.0f}с, isAdmin={is_admin}")

    elif flag == 2:
        pass  # heatmap — не логируем

    elif flag == 3:
        pass  # heatmap delta — не логируем

    else:
        log(worker_id, "<", f"Неизвестный пакет: flag={flag} len={n}")

    return flag


# ══════════════════════════════════════════
# АВТОРИЗАЦИЯ
# ══════════════════════════════════════════

async def get_access_token() -> str | None:
    """Получает JWT accessToken через /api/v1/auth/refresh."""
    jar = aiohttp.CookieJar()
    async with aiohttp.ClientSession(cookie_jar=jar) as session:
        for name, value in COOKIES.items():
            jar.update_cookies({name: value}, response_url=aiohttp.client.URL(BASE_URL))
        try:
            async with session.post(
                    REFRESH_URL,
                    headers={"Content-Type": "application/json"},
            ) as resp:
                if resp.status == 401:
                    log("main", "!", "401 — сессия истекла, обнови COOKIES")
                    return None
                if resp.ok:
                    body = await resp.json()
                    token = body.get("accessToken")
                    if token:
                        log("main", "+", f"Токен получен: {token[:40]}...")
                        return token
                log("main", "!", f"Refresh → HTTP {resp.status}")
                return None
        except Exception as e:
            log("main", "!", f"Ошибка refresh: {e}")
            return None


# ══════════════════════════════════════════
# WEBSOCKET — ПОДКЛЮЧЕНИЕ
# ══════════════════════════════════════════

def build_ws_url(device_id: str) -> str:
    return (
        f"{WS_BASE}"
        f"?platform={PLATFORM}"
        f"&app_version={APP_VERSION}"
        f"&device_id={device_id}"
    )


def build_ws_headers() -> dict:
    cookie_str = "; ".join(f"{k}={v}" for k, v in COOKIES.items())
    return {
        "Cookie": cookie_str,
        "Origin": BASE_URL,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }


async def connect_ws(token: str, device_id: str, worker_id: int) -> websockets.WebSocketClientProtocol:
    """Подключается к WS и отправляет токен."""
    url = build_ws_url(device_id)
    log(worker_id, "*", f"Подключение... device_id={device_id[:8]}...")
    ws = await websockets.connect(url, additional_headers=build_ws_headers())
    await ws.send(token)
    log(worker_id, "+", "Подключён, токен отправлен")
    return ws


# ══════════════════════════════════════════
# ЧТЕНИЕ СООБЩЕНИЙ
# ══════════════════════════════════════════

async def drain_for(
        ws: websockets.WebSocketClientProtocol,
        cooldown_holder: list,
        worker_id: int,
        duration: float,
) -> None:
    """Читает все входящие сообщения ровно duration секунд (wall-clock)."""
    deadline = asyncio.get_event_loop().time() + duration
    while asyncio.get_event_loop().time() < deadline:
        remaining = deadline - asyncio.get_event_loop().time()
        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=min(0.3, remaining))
            if isinstance(msg, bytes):
                parse_message(msg, cooldown_holder, worker_id)
        except asyncio.TimeoutError:
            continue


async def wait_for_ack(
        ws: websockets.WebSocketClientProtocol,
        cooldown_holder: list,
        worker_id: int,
        timeout: float = ACK_TIMEOUT_S,
) -> bool:
    """Ждёт пакета type=1 (подтверждение пикселя). Остальные пакеты читает попутно."""
    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=1.0)
            if isinstance(msg, bytes):
                flag = parse_message(msg, cooldown_holder, worker_id)
                if flag == 1:
                    return True
        except asyncio.TimeoutError:
            remaining = deadline - asyncio.get_event_loop().time()
            log(worker_id, "~", f"Ждём подтверждения... {remaining:.0f}с")

    log(worker_id, "!", f"Таймаут {timeout}с — подтверждение не получено")
    return False


# ══════════════════════════════════════════
# ВОРКЕР
# ══════════════════════════════════════════

async def worker(
        worker_id: int,
        token: str,
        queue: asyncio.Queue,
        total_pixels: int,
        progress: list,
        start_delay: float = 0.0,
) -> None:
    """
    Один воркер: подключается, берёт пиксели из очереди и рисует их по одному.
    start_delay — задержка перед стартом, чтобы воркеры не стартовали одновременно
    и не гонялись за первым пикселем из очереди.
    """
    # Смещение старта — воркеры берут пиксели в шахматном порядке
    if start_delay > 0:
        log(worker_id, "*", f"Старт через {start_delay:.1f}с...")
        await asyncio.sleep(start_delay)

    device_id = str(uuid.uuid4())
    cooldown_holder = [DEFAULT_COOLDOWN_MS]

    try:
        ws = await connect_ws(token, device_id, worker_id)
    except Exception as e:
        log(worker_id, "!", f"Не удалось подключиться: {e}")
        return

    try:
        # Инициализация: ждём пакет type=5 с реальным кулдауном.
        # Используем asyncio.wait_for чтобы не блокировать других воркеров.
        log(worker_id, "*", "Ожидание инициализации от сервера...")
        init_deadline = asyncio.get_event_loop().time() + 5.0
        while asyncio.get_event_loop().time() < init_deadline:
            remaining = init_deadline - asyncio.get_event_loop().time()
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=min(0.5, remaining))
                if isinstance(msg, bytes):
                    flag = parse_message(msg, cooldown_holder, worker_id)
                    if flag == 5:  # получили настройки — готовы
                        break
            except asyncio.TimeoutError:
                continue

        log(worker_id, "*", f"Готов. Кулдаун: {cooldown_holder[0] / 1000:.0f}с")

        while True:
            # Берём пиксель из общей очереди
            try:
                x, y, color = queue.get_nowait()
            except asyncio.QueueEmpty:
                log(worker_id, "*", "Очередь пуста — завершаю работу")
                break

            color_name = COLORS.get(color, str(color))
            progress[0] += 1
            log(worker_id, ">",
                f"[{progress[0]}/{total_pixels}] ({x}, {y}) {color_name} (#{color})")

            payload = encode_pixel(x, y, color)
            log(worker_id, ">", f"         hex: {payload.hex()}")
            await ws.send(payload)

            # Ждём подтверждения type=1 — в нём реальный кулдаун
            acked = await wait_for_ack(ws, cooldown_holder, worker_id)
            if not acked:
                log(worker_id, "!", "Нет подтверждения, используем дефолтный кулдаун")

            queue.task_done()

            # Если ещё есть пиксели — ждём кулдаун перед следующим
            if not queue.empty():
                wait_s = cooldown_holder[0] / 1000 + COOLDOWN_EXTRA_S
                log(worker_id, "~",
                    f"Пауза {wait_s:.1f}с (кулдаун {cooldown_holder[0] / 1000:.1f}с + {COOLDOWN_EXTRA_S}с запас)...")
                await drain_for(ws, cooldown_holder, worker_id, duration=wait_s)

    except websockets.exceptions.ConnectionClosed as e:
        log(worker_id, "-", f"Соединение закрыто: {e}")
    except Exception as e:
        log(worker_id, "!", f"Ошибка: {e}")
    finally:
        await ws.close()


# ══════════════════════════════════════════
# ТОЧКА ВХОДА
# ══════════════════════════════════════════

async def run() -> None:
    log("main", "*", f"Запуск с {NUM_WORKERS} воркерами")

    # Получаем токен
    token = await get_access_token()
    if not token:
        return

    # Подготавливаем очередь пикселей
    pixels = grid_to_pixels(GRID, ORIGIN_X, ORIGIN_Y)
    total = len(pixels)
    queue = asyncio.Queue()
    for px in pixels:
        await queue.put(px)

    estimated = total / NUM_WORKERS * (DEFAULT_COOLDOWN_MS / 1000 + COOLDOWN_EXTRA_S) / 60
    log("main", "*", f"Пикселей: {total} | воркеров: {NUM_WORKERS} | ~{estimated:.1f} мин.")

    # Счётчик прогресса — общий для всех воркеров
    progress = [0]

    # Запускаем воркеры с равномерным смещением старта.
    # Смещение = кулдаун / кол-во воркеров, чтобы они не отправляли одновременно.
    cooldown_s = DEFAULT_COOLDOWN_MS / 1000
    offset_s = cooldown_s / NUM_WORKERS

    log("main", "*", f"Смещение между воркерами: {offset_s:.1f}с")

    tasks = [
        asyncio.create_task(
            worker(i + 1, token, queue, total, progress, start_delay=i * offset_s)
        )
        for i in range(NUM_WORKERS)
    ]

    await asyncio.gather(*tasks)
    log("main", "✓", f"Готово! Нарисовано пикселей: {progress[0]}/{total}")


if __name__ == "__main__":
    asyncio.run(run())
