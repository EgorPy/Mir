from core.method_generator import AutoDB, cm

from backend.services.auth.api.auth import check_user_session
from backend.services.roll.schema import Rolls

from fastapi.params import Depends
from fastapi import APIRouter, HTTPException, UploadFile, File
import json
import base64


def encode_content(content):
    """Конвертирует bytes → base64-строку. Если уже строка — возвращает как есть."""
    if content is None:
        return None
    if isinstance(content, (bytes, bytearray, memoryview)):
        return base64.b64encode(bytes(content)).decode("ascii")
    return content  # уже строка


app = APIRouter()


class Service:
    def __init__(self, name: str, app):
        self.name = name
        self.app = app


SERVICE = Service(
    name="roll",
    app=app
)


@app.post("/new_roll")
async def new_roll(file: UploadFile = File(...), user_id: str = Depends(check_user_session)):
    db = AutoDB(cm)

    content_bytes = await file.read()

    result = await db.insert_async(
        Rolls,
        user_id=user_id,
        content=content_bytes
    )

    if not result:
        return {"ok": False}
    return {"ok": True, "roll_id": result.get("id")}


@app.get("/random")
async def roll(user_id: str = Depends(check_user_session)):
    db = AutoDB(cm)

    # Берём случайный ролл
    rows = await db.execute_async(
        "SELECT * FROM rolls LIMIT 1 OFFSET ABS(RANDOM()) % MAX((SELECT COUNT(*) FROM rolls), 1)"
    )

    if not rows:
        raise HTTPException(status_code=404, detail="No rolls found")

    roll_row = rows[0] if isinstance(rows, list) else rows

    # Добавляем текущего пользователя в список просмотревших,
    # если его там ещё нет
    rolled: list = []
    try:
        rolled = json.loads(roll_row.get("rolled") or "[]")
    except (json.JSONDecodeError, TypeError):
        rolled = []

    if str(user_id) not in [str(u) for u in rolled]:
        rolled.append(user_id)
        await db.execute_async(
            "UPDATE rolls SET rolled = ? WHERE id = ?",
            (json.dumps(rolled), roll_row.get("id"))
        )
        roll_row["rolled"] = json.dumps(rolled)

    # Подтягиваем данные автора
    author_rows = await db.execute_async(
        "SELECT first_name, last_name FROM users WHERE id = ?",
        (roll_row.get("user_id"),)
    )

    author = None
    if author_rows:
        author_row = author_rows[0] if isinstance(author_rows, list) else author_rows
        author = {
            "first_name": author_row.get("first_name", ""),
            "last_name": author_row.get("last_name", ""),
        }

    return {
        "id": roll_row.get("id"),
        "user_id": roll_row.get("user_id"),
        "content": encode_content(roll_row.get("content")),
        "rolled": roll_row.get("rolled", "[]"),
        "author": author,
    }


@app.get("/my_rolls")
async def my_rolls(user_id: str = Depends(check_user_session)):
    """Возвращает все роллы текущего пользователя для страницы статистики."""
    db = AutoDB(cm)

    rows = await db.execute_async(
        "SELECT id, content, rolled FROM rolls WHERE user_id = ? ORDER BY id DESC",
        (user_id,)
    )

    if not rows:
        return []

    result = []
    for row in (rows if isinstance(rows, list) else [rows]):
        result.append({
            "id": row.get("id"),
            "rolled": row.get("rolled", "[]"),
        })

    return result
