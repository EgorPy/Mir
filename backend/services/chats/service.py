from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4
import sqlite3

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Cookie, Query, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from backend.services.auth.api.auth import check_user_session
from core.method_generator import ConnectionManager, cm

router = APIRouter()


class Service:
    def __init__(self, name: str, app):
        self.name = name
        self.app = app


SERVICE = Service(name="chats", app=router)


class ChatCreate(BaseModel):
    title: str
    public_id: Optional[str] = None
    chat_type: str = Field(default="group", alias="type")
    description: Optional[str] = None
    avatar_url: Optional[str] = None


class ChatDelete(BaseModel):
    chat_id: str


class DirectChatCreate(BaseModel):
    email: str


class RoleUpdate(BaseModel):
    user_id: str
    role: str


class MessageCreate(BaseModel):
    text: Optional[str] = None
    message_type: str = "text"
    media_url: Optional[str] = None
    media_mime: Optional[str] = None


class MessageDelete(BaseModel):
    message_id: str


class MessageForward(BaseModel):
    message_id: str
    target_chat_id: str


class FavoritePayload(BaseModel):
    message_id: str


class AvatarUpdate(BaseModel):
    avatar_url: str


chat_ws_connections: dict[str, set[WebSocket]] = {}
ws_tickets: dict[str, dict[str, object]] = {}


def normalize_chat_title(chat_type: Optional[str], title: Optional[str]) -> str:
    raw_title = str(title or "").strip()
    if str(chat_type or "").lower() == "private":
        lowered = raw_title.lower()
        if lowered.startswith("dm:"):
            raw_title = raw_title[3:].strip()
    return raw_title


def _dict_rows(rows):
    out = []
    for row in rows:
        if isinstance(row, sqlite3.Row):
            out.append(dict(row))
        elif isinstance(row, dict):
            out.append(row)
        else:
            out.append(dict(row))
    return out


def _execute_sync(connection_manager: ConnectionManager, sql: str, params: tuple = (), fetch: str = "none"):
    conn = connection_manager.get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params)

    if fetch == "one":
        row = cursor.fetchone()
        return dict(row) if row else None
    if fetch == "all":
        rows = cursor.fetchall()
        return _dict_rows(rows)

    conn.commit()
    return cursor.rowcount


async def execute(connection_manager: ConnectionManager, sql: str, params: tuple = (), fetch: str = "none"):
    return await run_in_threadpool(_execute_sync, connection_manager, sql, params, fetch)


def _table_columns_sync(connection_manager: ConnectionManager, table: str) -> set[str]:
    conn = connection_manager.get_connection()
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table})")
    return {row[1] for row in cursor.fetchall()}


async def table_columns(connection_manager: ConnectionManager, table: str) -> set[str]:
    return await run_in_threadpool(_table_columns_sync, connection_manager, table)


async def ensure_column(connection_manager: ConnectionManager, table: str, column: str, column_type: str) -> None:
    columns = await table_columns(connection_manager, table)
    if column not in columns:
        await execute(connection_manager, f"ALTER TABLE {table} ADD COLUMN {column} {column_type}")


async def ensure_schema(connection_manager: ConnectionManager) -> None:
    await execute(
        connection_manager,
        """
        CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT,
            owner_id TEXT,
            title TEXT,
            public_id TEXT,
            type TEXT,
            description TEXT,
            avatar_url TEXT
        )
        """,
    )
    await execute(
        connection_manager,
        """
        CREATE TABLE IF NOT EXISTS chat_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT,
            user_id TEXT,
            role TEXT,
            joined_at TEXT
        )
        """,
    )
    await execute(
        connection_manager,
        """
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT,
            text TEXT,
            author TEXT,
            created_at TEXT,
            message_type TEXT,
            media_url TEXT,
            media_mime TEXT,
            forwarded_from_message_id TEXT,
            is_deleted INTEGER
        )
        """,
    )
    await execute(
        connection_manager,
        """
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            message_id TEXT,
            created_at TEXT
        )
        """,
    )
    await execute(
        connection_manager,
        """
        CREATE TABLE IF NOT EXISTS message_reads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id TEXT,
            user_id TEXT,
            read_at TEXT
        )
        """,
    )

    await ensure_column(connection_manager, "chats", "created_at", "TEXT")
    await ensure_column(connection_manager, "chats", "owner_id", "TEXT")
    await ensure_column(connection_manager, "chats", "title", "TEXT")
    await ensure_column(connection_manager, "chats", "public_id", "TEXT")
    await ensure_column(connection_manager, "chats", "type", "TEXT")
    await ensure_column(connection_manager, "chats", "description", "TEXT")
    await ensure_column(connection_manager, "chats", "avatar_url", "TEXT")

    await ensure_column(connection_manager, "chat_members", "chat_id", "TEXT")
    await ensure_column(connection_manager, "chat_members", "user_id", "TEXT")
    await ensure_column(connection_manager, "chat_members", "role", "TEXT")
    await ensure_column(connection_manager, "chat_members", "joined_at", "TEXT")

    await ensure_column(connection_manager, "messages", "chat_id", "TEXT")
    await ensure_column(connection_manager, "messages", "text", "TEXT")
    await ensure_column(connection_manager, "messages", "author", "TEXT")
    await ensure_column(connection_manager, "messages", "created_at", "TEXT")
    await ensure_column(connection_manager, "messages", "message_type", "TEXT")
    await ensure_column(connection_manager, "messages", "media_url", "TEXT")
    await ensure_column(connection_manager, "messages", "media_mime", "TEXT")
    await ensure_column(connection_manager, "messages", "forwarded_from_message_id", "TEXT")
    await ensure_column(connection_manager, "messages", "is_deleted", "INTEGER")

    await ensure_column(connection_manager, "favorites", "user_id", "TEXT")
    await ensure_column(connection_manager, "favorites", "message_id", "TEXT")
    await ensure_column(connection_manager, "favorites", "created_at", "TEXT")

    await ensure_column(connection_manager, "message_reads", "message_id", "TEXT")
    await ensure_column(connection_manager, "message_reads", "user_id", "TEXT")
    await ensure_column(connection_manager, "message_reads", "read_at", "TEXT")

    try:
        await ensure_column(connection_manager, "users", "avatar_url", "TEXT")
    except Exception:
        pass

    await execute(connection_manager,
                  "CREATE UNIQUE INDEX IF NOT EXISTS ux_chat_members_chat_user ON chat_members(chat_id, user_id)")
    await execute(connection_manager, "CREATE INDEX IF NOT EXISTS ix_chat_members_user ON chat_members(user_id)")
    await execute(connection_manager, "CREATE INDEX IF NOT EXISTS ix_messages_chat_created ON messages(chat_id, created_at)")
    await execute(connection_manager, "CREATE INDEX IF NOT EXISTS ix_messages_author ON messages(author)")
    await execute(connection_manager,
                  "CREATE UNIQUE INDEX IF NOT EXISTS ux_favorites_user_message ON favorites(user_id, message_id)")
    await execute(connection_manager,
                  "CREATE UNIQUE INDEX IF NOT EXISTS ux_message_reads_user_message ON message_reads(user_id, message_id)")


async def get_chat(connection_manager: ConnectionManager, chat_id: str) -> Optional[dict]:
    rows = await execute(connection_manager, "SELECT * FROM chats WHERE id = ?", (chat_id,), fetch="all")
    return rows[0] if rows else None


async def get_member_role(connection_manager: ConnectionManager, chat_id: str, user_id: str) -> Optional[str]:
    row = await execute(
        connection_manager,
        "SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?",
        (chat_id, user_id),
        fetch="one",
    )
    if not row:
        return None
    role = row.get("role")
    return role if role else "member"


async def require_member(connection_manager: ConnectionManager, chat_id: str, user_id: str) -> str:
    role = await get_member_role(connection_manager, chat_id, user_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a chat member")
    return role


async def require_owner_or_admin(connection_manager: ConnectionManager, chat_id: str, user_id: str) -> str:
    role = await require_member(connection_manager, chat_id, user_id)
    if role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return role


async def add_chat_member(connection_manager: ConnectionManager, chat_id: str, user_id: str, role: str = "member") -> None:
    await ensure_schema(connection_manager)
    now = datetime.utcnow().isoformat()
    existing = await execute(
        connection_manager,
        "SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ?",
        (chat_id, user_id),
        fetch="one",
    )
    if existing:
        await execute(
            connection_manager,
            "UPDATE chat_members SET role = ?, joined_at = ? WHERE chat_id = ? AND user_id = ?",
            (role, now, chat_id, user_id),
        )
    else:
        await execute(
            connection_manager,
            "INSERT INTO chat_members(chat_id, user_id, role, joined_at) VALUES(?, ?, ?, ?)",
            (chat_id, user_id, role, now),
        )


async def mark_chat_messages_as_read(connection_manager: ConnectionManager, chat_id: str, user_id: str) -> list[str]:
    rows = await execute(
        connection_manager,
        "SELECT id FROM messages WHERE chat_id = ? AND author != ? AND COALESCE(is_deleted, 0) = 0",
        (chat_id, user_id),
        fetch="all",
    )
    now = datetime.utcnow().isoformat()
    new_read_message_ids: list[str] = []

    for row in rows:
        message_id = str(row["id"])
        exists = await execute(
            connection_manager,
            "SELECT id FROM message_reads WHERE user_id = ? AND message_id = ?",
            (user_id, message_id),
            fetch="one",
        )

        if not exists:
            await execute(
                connection_manager,
                "INSERT INTO message_reads(user_id, message_id, read_at) VALUES(?, ?, ?)",
                (user_id, message_id, now),
            )
            new_read_message_ids.append(message_id)

    return new_read_message_ids


async def serialize_message(connection_manager: ConnectionManager, message: dict, viewer_id: str) -> dict:
    message_id = str(message.get("id"))

    favorite = await execute(
        connection_manager,
        "SELECT id FROM favorites WHERE user_id = ? AND message_id = ?",
        (viewer_id, message_id),
        fetch="one",
    )

    read_row = await execute(
        connection_manager,
        "SELECT COUNT(*) AS c FROM message_reads WHERE message_id = ? AND user_id != ?",
        (message_id, viewer_id),
        fetch="one",
    )
    read_count = int(read_row.get("c") or 0) if read_row else 0

    is_deleted = int(message.get("is_deleted") or 0) == 1

    return {
        "id": message_id,
        "chat_id": str(message.get("chat_id") or ""),
        "text": "Message deleted" if is_deleted else (message.get("text") or ""),
        "created_at": message.get("created_at"),
        "author_id": str(message.get("author") or ""),
        "author": message.get("author_name") or "Unknown",
        "message_type": message.get("message_type") or "text",
        "media_url": message.get("media_url"),
        "media_mime": message.get("media_mime"),
        "forwarded_from_message_id": message.get("forwarded_from_message_id"),
        "is_deleted": is_deleted,
        "is_favorite": bool(favorite),
        "read_state": "read" if read_count > 0 else "sent",
    }


async def _get_user_id_from_session(connection_manager: ConnectionManager, session_id: Optional[str]) -> Optional[str]:
    if not session_id:
        return None

    row = await execute(
        connection_manager,
        "SELECT user_id, expires_at FROM sessions WHERE id = ?",
        (session_id,),
        fetch="one",
    )
    if not row:
        return None

    expires_raw = row.get("expires_at")
    if not expires_raw:
        return None

    try:
        expires_at = datetime.fromisoformat(str(expires_raw))
    except Exception:
        return None

    if expires_at <= datetime.utcnow():
        return None

    return str(row.get("user_id"))


async def _broadcast(chat_id: str, payload: dict) -> None:
    sockets = list(chat_ws_connections.get(str(chat_id), set()))
    if not sockets:
        return

    disconnected: list[WebSocket] = []
    for socket in sockets:
        try:
            await socket.send_json(payload)
        except Exception:
            disconnected.append(socket)

    for socket in disconnected:
        chat_ws_connections.get(str(chat_id), set()).discard(socket)


def _issue_ws_ticket(chat_id: str, user_id: str) -> str:
    ticket = uuid4().hex
    ws_tickets[ticket] = {
        "chat_id": str(chat_id),
        "user_id": str(user_id),
        "expires_at": datetime.utcnow() + timedelta(minutes=2),
    }
    return ticket


def _consume_ws_ticket(chat_id: str, ticket: Optional[str]) -> Optional[str]:
    if not ticket:
        return None

    payload = ws_tickets.pop(ticket, None)
    if not payload:
        return None

    expires_at = payload.get("expires_at")
    if not isinstance(expires_at, datetime):
        return None

    if expires_at <= datetime.utcnow():
        return None

    if str(payload.get("chat_id")) != str(chat_id):
        return None

    return str(payload.get("user_id"))


async def get_or_create_favorites_chat(connection_manager: ConnectionManager, user_id: str) -> str:
    public_id = f"favorites_{user_id}"

    existing = await execute(
        connection_manager,
        "SELECT * FROM chats WHERE public_id = ? AND type = 'favorites'",
        (public_id,),
        fetch="one",
    )

    if existing:
        chat_id = str(existing["id"])
        await add_chat_member(connection_manager, chat_id, str(user_id), "owner")
        return chat_id

    now = datetime.utcnow().isoformat()
    await execute(
        connection_manager,
        """
        INSERT INTO chats(owner_id, title, public_id, type, description, created_at)
        VALUES(?, 'Favorites', ?, 'favorites', 'Personal saved messages', ?)
        """,
        (str(user_id), public_id, now),
    )

    created = await execute(
        connection_manager,
        "SELECT * FROM chats WHERE public_id = ? AND type = 'favorites' ORDER BY id DESC LIMIT 1",
        (public_id,),
        fetch="one",
    )

    if not created:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Favorites chat creation failed")

    chat_id = str(created["id"])
    await add_chat_member(connection_manager, chat_id, str(user_id), "owner")
    return chat_id


@router.get("/list")
async def list_chats(
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)
    await get_or_create_favorites_chat(connection_manager, user_id)

    rows = await execute(
        connection_manager,
        """
        SELECT DISTINCT c.*
        FROM chats c
        INNER JOIN chat_members cm ON c.id = cm.chat_id
        WHERE cm.user_id = ?
        ORDER BY COALESCE(c.created_at, '') DESC
        """,
        (user_id,),
        fetch="all",
    )

    chats = {}
    for chat in rows:
        item = dict(chat)
        item["title"] = normalize_chat_title(item.get("type"), item.get("title"))
        chats[str(chat["id"])] = item
    return chats


@router.get("/search/{public_id}")
async def search_chats(
        public_id: str,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)

    q = (public_id or "").strip()
    if not q:
        return {"ok": True, "chats": []}

    chats = await execute(
        connection_manager,
        """SELECT * FROM chats WHERE title LIKE ? OR public_id = ?""",
        (f"%{q}%", q), fetch="all",
    )
    if chats:
        normalized_chats = []
        for chat in chats:
            item = dict(chat)
            item["title"] = normalize_chat_title(item.get("type"), item.get("title"))
            normalized_chats.append(item)
        return {"ok": True, "chats": normalized_chats}

    user_rows = await execute(
        connection_manager,
        "SELECT id, first_name, last_name, email, avatar_url FROM users WHERE email = ?",
        (q,),
        fetch="all",
    )
    if not user_rows:
        return {"ok": True, "chats": []}

    mapped = []
    for item in user_rows:
        mapped.append(
            {
                "id": f"user_{item['id']}",
                "title": f"{item.get('first_name') or ''} {item.get('last_name') or ''}".strip() or item.get("email"),
                "public_id": item.get("email"),
                "type": "user",
                "avatar_url": item.get("avatar_url"),
            }
        )

    return {"ok": True, "chats": mapped}


@router.post("/direct/start")
async def start_direct_chat(
        data: DirectChatCreate,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)

    target = await execute(
        connection_manager,
        "SELECT id, email, first_name, last_name FROM users WHERE email = ?",
        (data.email.strip(),),
        fetch="one",
    )
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    target_user_id = str(target["id"])
    if target_user_id == str(user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot create direct chat with yourself")

    first = min(int(user_id), int(target_user_id))
    second = max(int(user_id), int(target_user_id))
    public_id = f"dm_{first}_{second}"

    existing = await execute(
        connection_manager,
        "SELECT * FROM chats WHERE type = 'private' AND public_id = ?",
        (public_id,),
        fetch="one",
    )
    if existing:
        existing_chat = dict(existing)
        existing_chat["title"] = normalize_chat_title(existing_chat.get("type"), existing_chat.get("title"))
        return {"ok": True, "chat": existing_chat}

    now = datetime.utcnow().isoformat()
    title = (target.get('first_name') or target.get('email') or '').strip()

    await execute(
        connection_manager,
        "INSERT INTO chats(owner_id, title, public_id, type, created_at) VALUES(?, ?, ?, 'private', ?)",
        (str(user_id), title, public_id, now),
    )

    chat = await execute(
        connection_manager,
        "SELECT * FROM chats WHERE public_id = ? ORDER BY id DESC LIMIT 1",
        (public_id,),
        fetch="one",
    )
    if not chat:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Direct chat creation failed")

    chat_id = str(chat["id"])
    await add_chat_member(connection_manager, chat_id, str(user_id), "owner")
    await add_chat_member(connection_manager, chat_id, target_user_id, "member")

    chat["title"] = normalize_chat_title(chat.get("type"), chat.get("title"))
    return {"ok": True, "chat": chat}


@router.post("/create")
async def create_chat(
        data: ChatCreate,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)

    chat_type = (data.chat_type or "group").strip().lower()
    if chat_type not in {"group", "private", "channel"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported chat type")

    now = datetime.utcnow().isoformat()
    public_id = (data.public_id or "").strip() or f"{chat_type}_{user_id}_{int(datetime.utcnow().timestamp())}"

    await execute(
        connection_manager,
        """
        INSERT INTO chats(owner_id, title, public_id, type, description, avatar_url, created_at)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        """,
        (
            str(user_id),
            str(data.title),
            public_id,
            chat_type,
            data.description,
            data.avatar_url,
            now,
        ),
    )

    chat = await execute(
        connection_manager,
        "SELECT * FROM chats WHERE owner_id = ? AND public_id = ? ORDER BY id DESC LIMIT 1",
        (str(user_id), public_id),
        fetch="one",
    )
    if not chat:
        return {"ok": False}

    await add_chat_member(connection_manager, str(chat["id"]), str(user_id), "owner")
    return {"ok": True, "id": str(chat["id"]), "result": chat}


@router.get("/{chat_id}/info")
async def chat_info(
        chat_id: str,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)
    # await require_member(connection_manager, chat_id, user_id)

    chat = await execute(
        connection_manager,
        "SELECT id, title, owner_id, type, description, avatar_url, created_at FROM chats WHERE id = ?",
        (chat_id,),
        fetch="one",
    )
    if not chat:
        return {"ok": False}

    members = await execute(
        connection_manager,
        """
        SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url, COALESCE(cm.role, 'member') AS role
        FROM users u
        INNER JOIN chat_members cm ON u.id = cm.user_id
        WHERE cm.chat_id = ?
        ORDER BY CASE COALESCE(cm.role, 'member') WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.first_name
        """,
        (chat_id,),
        fetch="all",
    )

    return {
        "ok": True,
        "id": str(chat.get("id")),
        "title": normalize_chat_title(chat.get("type"), chat.get("title")),
        "author": chat.get("owner_id"),
        "type": chat.get("type") or "group",
        "description": chat.get("description"),
        "avatar": chat.get("avatar_url"),
        "created_at": chat.get("created_at"),
        "members": members,
    }


@router.post("/{chat_id}/members/role")
async def update_member_role(
        chat_id: str,
        data: RoleUpdate,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)

    requester_role = await require_member(connection_manager, chat_id, user_id)
    if requester_role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only chat owner can manage roles")

    role = (data.role or "member").strip().lower()
    if role not in {"member", "admin"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role")

    member = await execute(
        connection_manager,
        "SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ?",
        (chat_id, data.user_id),
        fetch="one",
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if str(data.user_id) == str(user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner role cannot be changed")

    await execute(
        connection_manager,
        "UPDATE chat_members SET role = ? WHERE chat_id = ? AND user_id = ?",
        (role, chat_id, data.user_id),
    )
    return {"ok": True}


@router.get("/{chat_id}/member")
async def get_member(
        chat_id: str,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)
    role = await get_member_role(connection_manager, chat_id, user_id)
    return {"ok": True, "is_member": bool(role), "user_id": user_id, "role": role}


@router.get("/{chat_id}/join")
async def join_chat(
        chat_id: str,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)

    chat = await get_chat(connection_manager, chat_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    await add_chat_member(connection_manager, chat_id, user_id, "member")
    await _broadcast(chat_id, {"event": "member_joined", "chat_id": chat_id, "user_id": user_id})
    return {"ok": True}


@router.get("/{chat_id}/leave")
async def leave_chat(
        chat_id: str,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)
    role = await require_member(connection_manager, chat_id, user_id)

    if role == "owner":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner cannot leave chat")

    await execute(connection_manager, "DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?", (chat_id, user_id))
    return {"ok": True}


@router.post("/delete")
async def delete_chat(
        data: ChatDelete,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)

    requester_role = await require_member(connection_manager, data.chat_id, user_id)
    if requester_role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only chat owner can delete chat")

    chat = await get_chat(connection_manager, data.chat_id)
    if chat and str(chat.get("type") or "") == "favorites":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="System favorites chat cannot be deleted")

    await execute(connection_manager, "DELETE FROM favorites WHERE message_id IN (SELECT id FROM messages WHERE chat_id = ?)",
                  (data.chat_id,))
    await execute(connection_manager, "DELETE FROM message_reads WHERE message_id IN (SELECT id FROM messages WHERE chat_id = ?)",
                  (data.chat_id,))
    await execute(connection_manager, "DELETE FROM messages WHERE chat_id = ?", (data.chat_id,))
    await execute(connection_manager, "DELETE FROM chat_members WHERE chat_id = ?", (data.chat_id,))
    await execute(connection_manager, "DELETE FROM chats WHERE id = ?", (data.chat_id,))

    await _broadcast(data.chat_id, {"event": "chat_deleted", "chat_id": data.chat_id})
    return {"ok": True}


@router.patch("/{chat_id}/avatar")
async def update_chat_avatar(
        chat_id: str,
        data: AvatarUpdate,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)

    requester_role = await require_member(connection_manager, chat_id, user_id)
    if requester_role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only chat owner can update chat avatar")

    await execute(connection_manager, "UPDATE chats SET avatar_url = ? WHERE id = ?", (data.avatar_url, chat_id))
    await _broadcast(chat_id, {"event": "chat_updated", "chat_id": chat_id})
    return {"ok": True}


@router.patch("/users/me/avatar")
async def update_my_avatar(
        data: AvatarUpdate,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)
    await execute(connection_manager, "UPDATE users SET avatar_url = ? WHERE id = ?", (data.avatar_url, user_id))
    return {"ok": True}


@router.get("/{chat_id}/messages")
async def get_messages(
        chat_id: str,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)
    await require_member(connection_manager, chat_id, user_id)

    newly_read_message_ids = await mark_chat_messages_as_read(connection_manager, chat_id, user_id)
    if newly_read_message_ids:
        await _broadcast(
            chat_id,
            {
                "event": "messages_read",
                "chat_id": str(chat_id),
                "reader_user_id": str(user_id),
                "message_ids": newly_read_message_ids,
            },
        )

    rows = await execute(
        connection_manager,
        """
        SELECT
            m.id,
            m.chat_id,
            m.text,
            m.created_at,
            m.author,
            m.message_type,
            m.media_url,
            m.media_mime,
            m.forwarded_from_message_id,
            COALESCE(m.is_deleted, 0) AS is_deleted,
            u.first_name || ' ' || u.last_name AS author_name
        FROM messages m
        LEFT JOIN users u ON m.author = u.id
        WHERE m.chat_id = ?
        ORDER BY m.created_at ASC, m.id ASC
        """,
        (chat_id,),
        fetch="all",
    )

    payload = []
    for row in rows:
        payload.append(await serialize_message(connection_manager, row, user_id))
    return payload


@router.post("/{chat_id}/messages/send")
async def send_message(
        chat_id: str,
        data: MessageCreate,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)
    chat = await get_chat(connection_manager, chat_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    role = await require_member(connection_manager, chat_id, user_id)
    chat_type = (chat.get("type") or "group").lower()
    if chat_type == "channel" and role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner/admin can post to channel")
    if chat_type == "favorites" and role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can post to favorites chat")
    message_type = (data.message_type or "text").strip().lower()
    if message_type not in {"text", "photo", "video", "gif", "voice", "music", "file"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported message type")

    text = (data.text or "").strip()
    if message_type == "text" and not text:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Text is required")

    now = datetime.utcnow().replace(microsecond=0).isoformat()
    await execute(
        connection_manager,
        """
        INSERT INTO messages(chat_id, text, author, created_at, message_type, media_url, media_mime, forwarded_from_message_id, is_deleted)
        VALUES(?, ?, ?, ?, ?, ?, ?, NULL, 0)
        """,
        (
            str(chat_id),
            text,
            str(user_id),
            now,
            message_type,
            data.media_url,
            data.media_mime,
        ),
    )

    new_row = await execute(
        connection_manager,
        """
        SELECT
            m.id,
            m.chat_id,
            m.text,
            m.created_at,
            m.author,
            m.message_type,
            m.media_url,
            m.media_mime,
            m.forwarded_from_message_id,
            COALESCE(m.is_deleted, 0) AS is_deleted,
            u.first_name || ' ' || u.last_name AS author_name
        FROM messages m
        LEFT JOIN users u ON m.author = u.id
        WHERE m.chat_id = ?
        ORDER BY m.id DESC
        LIMIT 1
        """,
        (chat_id,),
        fetch="one",
    )

    if not new_row:
        return {"ok": False}

    serialized = await serialize_message(connection_manager, new_row, user_id)
    await _broadcast(chat_id, {"event": "message_created", "chat_id": chat_id, "message": serialized})
    return {"ok": True, "message": serialized}


@router.post("/{chat_id}/messages/delete")
async def delete_message(
        chat_id: str,
        data: MessageDelete,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)
    role = await require_member(connection_manager, chat_id, user_id)

    message = await execute(
        connection_manager,
        "SELECT id, author FROM messages WHERE id = ? AND chat_id = ?",
        (data.message_id, chat_id),
        fetch="one",
    )
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    is_author = str(message.get("author")) == str(user_id)
    if not is_author and role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete this message")

    await execute(connection_manager, "UPDATE messages SET is_deleted = 1, text = '' WHERE id = ?", (data.message_id,))
    await _broadcast(chat_id, {"event": "message_deleted", "chat_id": chat_id, "message_id": data.message_id})
    return {"ok": True}


@router.post("/{chat_id}/messages/forward")
async def forward_message(
        chat_id: str,
        data: MessageForward,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)

    await require_member(connection_manager, chat_id, user_id)

    source = await execute(
        connection_manager,
        "SELECT text, message_type, media_url, media_mime FROM messages WHERE id = ? AND chat_id = ?",
        (data.message_id, chat_id),
        fetch="one",
    )
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source message not found")

    target_chat = await get_chat(connection_manager, data.target_chat_id)
    if not target_chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target chat not found")

    target_role = await require_member(connection_manager, data.target_chat_id, user_id)
    if (target_chat.get("type") or "group").lower() == "channel" and target_role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot post to target channel")

    now = datetime.utcnow().replace(microsecond=0).isoformat()
    await execute(
        connection_manager,
        """
        INSERT INTO messages(chat_id, text, author, created_at, message_type, media_url, media_mime, forwarded_from_message_id, is_deleted)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, 0)
        """,
        (
            data.target_chat_id,
            source.get("text") or "",
            user_id,
            now,
            source.get("message_type") or "text",
            source.get("media_url"),
            source.get("media_mime"),
            data.message_id,
        ),
    )

    await _broadcast(data.target_chat_id, {"event": "message_forwarded", "chat_id": data.target_chat_id})
    return {"ok": True}


@router.post("/{chat_id}/messages/favorite")
async def favorite_message(
        chat_id: str,
        data: FavoritePayload,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)
    await require_member(connection_manager, chat_id, user_id)

    source = await execute(
        connection_manager,
        "SELECT id, text, message_type, media_url, media_mime FROM messages WHERE id = ? AND chat_id = ?",
        (data.message_id, chat_id),
        fetch="one",
    )
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    created_at = datetime.utcnow().isoformat()
    await execute(
        connection_manager,
        "INSERT OR IGNORE INTO favorites(user_id, message_id, created_at) VALUES(?, ?, ?)",
        (user_id, data.message_id, created_at),
    )

    favorites_chat_id = await get_or_create_favorites_chat(connection_manager, user_id)

    if str(chat_id) != str(favorites_chat_id):
        existing_copy = await execute(
            connection_manager,
            """
            SELECT id
            FROM messages
            WHERE chat_id = ? AND author = ? AND forwarded_from_message_id = ? AND COALESCE(is_deleted, 0) = 0
            LIMIT 1
            """,
            (favorites_chat_id, str(user_id), str(data.message_id)),
            fetch="one",
        )

        if not existing_copy:
            now = datetime.utcnow().replace(microsecond=0).isoformat()
            await execute(
                connection_manager,
                """
                INSERT INTO messages(chat_id, text, author, created_at, message_type, media_url, media_mime, forwarded_from_message_id, is_deleted)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, 0)
                """,
                (
                    favorites_chat_id,
                    source.get("text") or "",
                    str(user_id),
                    now,
                    source.get("message_type") or "text",
                    source.get("media_url"),
                    source.get("media_mime"),
                    str(data.message_id),
                ),
            )

            copy_message = await execute(
                connection_manager,
                "SELECT id FROM messages WHERE chat_id = ? AND author = ? ORDER BY id DESC LIMIT 1",
                (favorites_chat_id, str(user_id)),
                fetch="one",
            )
            if copy_message:
                await execute(
                    connection_manager,
                    "INSERT OR IGNORE INTO favorites(user_id, message_id, created_at) VALUES(?, ?, ?)",
                    (user_id, str(copy_message["id"]), datetime.utcnow().isoformat()),
                )

            await _broadcast(favorites_chat_id, {"event": "message_created", "chat_id": favorites_chat_id})

    return {"ok": True, "favorites_chat_id": favorites_chat_id}


@router.post("/{chat_id}/messages/unfavorite")
async def unfavorite_message(
        chat_id: str,
        data: FavoritePayload,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)
    await require_member(connection_manager, chat_id, user_id)

    source_message_id = str(data.message_id)
    source_ref = await execute(
        connection_manager,
        "SELECT forwarded_from_message_id FROM messages WHERE id = ? AND chat_id = ?",
        (str(data.message_id), str(chat_id)),
        fetch="one",
    )
    if source_ref and source_ref.get("forwarded_from_message_id"):
        source_message_id = str(source_ref.get("forwarded_from_message_id"))

    await execute(
        connection_manager,
        "DELETE FROM favorites WHERE user_id = ? AND message_id IN (?, ?)",
        (user_id, str(data.message_id), source_message_id),
    )

    favorites_chat_id = await get_or_create_favorites_chat(connection_manager, user_id)

    favorite_copies = await execute(
        connection_manager,
        """
        SELECT id
        FROM messages
        WHERE chat_id = ?
          AND author = ?
          AND (forwarded_from_message_id = ? OR id = ?)
          AND COALESCE(is_deleted, 0) = 0
        """,
        (favorites_chat_id, str(user_id), source_message_id, str(data.message_id)),
        fetch="all",
    )

    for copy in favorite_copies:
        copy_id = str(copy["id"])
        await execute(
            connection_manager,
            "UPDATE messages SET is_deleted = 1, text = '' WHERE id = ?",
            (copy_id,),
        )
        await execute(
            connection_manager,
            "DELETE FROM favorites WHERE user_id = ? AND message_id = ?",
            (user_id, copy_id),
        )
        await _broadcast(
            favorites_chat_id,
            {
                "event": "message_deleted",
                "chat_id": favorites_chat_id,
                "message_id": copy_id,
            },
        )

    return {"ok": True, "favorites_chat_id": favorites_chat_id}


@router.get("/favorites/list")
async def favorites_list(
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)
    favorites_chat_id = await get_or_create_favorites_chat(connection_manager, user_id)

    rows = await execute(
        connection_manager,
        """
        SELECT
            m.id,
            m.chat_id,
            m.text,
            m.created_at,
            m.author,
            m.message_type,
            m.media_url,
            m.media_mime,
            m.forwarded_from_message_id,
            COALESCE(m.is_deleted, 0) AS is_deleted,
            u.first_name || ' ' || u.last_name AS author_name
        FROM messages m
        LEFT JOIN users u ON m.author = u.id
        WHERE m.chat_id = ? AND COALESCE(m.is_deleted, 0) = 0
        ORDER BY m.created_at DESC, m.id DESC
        """,
        (favorites_chat_id,),
        fetch="all",
    )

    out = []
    for row in rows:
        out.append(await serialize_message(connection_manager, row, user_id))
    return out


@router.post("/{chat_id}/ws-ticket")
async def create_ws_ticket(
        chat_id: str,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency),
):
    await ensure_schema(connection_manager)
    await require_member(connection_manager, chat_id, user_id)

    return {
        "ok": True,
        "ticket": _issue_ws_ticket(chat_id, user_id),
    }


@router.websocket("/{chat_id}/ws")
async def messages_ws(
        websocket: WebSocket,
        chat_id: str,
        ticket: Optional[str] = Query(None),
        session_id: Optional[str] = Cookie(None),
):
    await websocket.accept()

    connection_manager = cm

    try:
        await ensure_schema(connection_manager)

        user_id = _consume_ws_ticket(chat_id, ticket)
        if not user_id:
            user_id = await _get_user_id_from_session(connection_manager, session_id)

        if not user_id:
            await websocket.send_json({"event": "error", "detail": "Unauthorized websocket session"})
            await websocket.close(code=4401)
            return

        role = await get_member_role(connection_manager, chat_id, user_id)
        if not role:
            await websocket.send_json({"event": "error", "detail": "Not a chat member"})
            await websocket.close(code=4403)
            return

        chat_ws_connections.setdefault(str(chat_id), set()).add(websocket)

        while True:
            payload = await websocket.receive_json()
            if payload.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
    finally:
        chat_ws_connections.get(str(chat_id), set()).discard(websocket)
