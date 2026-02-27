from core.method_generator import AutoDB, ConnectionManager, cm

from backend.services.auth.api.auth import check_user_session

from fastapi.params import Depends
from pydantic import BaseModel
from fastapi import APIRouter
from datetime import datetime
from fastapi import status

router = APIRouter()


class Service:
    def __init__(self, name: str, app):
        self.name = name
        self.app = app


SERVICE = Service(
    name="chats",
    app=router
)


class ChatCreate(BaseModel):
    title: str


class ChatDelete(BaseModel):
    chat_id: str


async def add_chat_member(chat_id: str, user_id: str, connection_manager: ConnectionManager = Depends(cm.dependency)):
    db = AutoDB(connection_manager)

    await db.insert_chat_member(
        chat_id=chat_id,
        user_id=user_id
    )


@router.get("/list")
async def list_chats(
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency)
):
    """ Get a list of all chats for current user """

    db = AutoDB(connection_manager)

    result = await db.execute_async(
        "SELECT * FROM chats WHERE owner_id = ?",
        (user_id,)
    )

    chats_dict = {}
    if not result:
        return chats_dict

    for chat in result:
        chat_dict = dict(chat) if hasattr(chat, "keys") else chat
        chats_dict[chat_dict['id']] = chat_dict

    return chats_dict


@router.post("/create")
async def create_chat(
        data: ChatCreate,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency)
):
    db = AutoDB(connection_manager)

    result = await db.insert_chat(
        owner_id=str(user_id),
        title=str(data.title)
    )

    if not result:
        return {"ok": False}

    await add_chat_member(result[0].get("id", None), user_id, connection_manager)

    return {"ok": True, "id": result[0].get("id", None), "result": result[0]}


@router.get("/{chat_id}/info")
async def chat_info(
        chat_id: str,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency)
):
    db = AutoDB(connection_manager)

    members = await db.execute_async(
        "SELECT u.id, u.first_name, u.last_name FROM users u INNER JOIN chat_members cm ON u.id = cm.user_id WHERE cm.chat_id = ?",
        (chat_id,))
    result = await db.execute_async("SELECT id, title, owner_id FROM chats WHERE id = ?", (chat_id,))

    if not result:
        return {"ok": False}

    return {
        "ok": True,
        "id": result[0].get("id", None),
        "title": result[0].get("title", None),
        "author": result[0].get("owner_id", None),
        "members": members
    }


@router.post("/delete")
async def delete_chat(
        data: ChatDelete,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency)
):
    db = AutoDB(connection_manager)

    is_owner = await db.execute_async("SELECT COUNT(id) FROM chats WHERE owner_id = ? AND id = ?",
                                      (user_id, str(data.chat_id)))
    if not is_owner:
        return status.HTTP_403_FORBIDDEN

    # delete chat
    result = await db.delete_chat(
        id=str(data.chat_id)
    )

    # delete chat members
    await db.delete_chat_member(
        chat_id=str(data.chat_id)
    )

    # delete chat messages
    await db.delete_message(
        chat_id=str(data.chat_id)
    )

    # you need to delete rows from every table connected to chats table # maybe need to come up with a solution for this one

    return {"ok": bool(result)}


class MessageCreate(BaseModel):
    text: str


@router.get("/{chat_id}/messages")
async def get_messages(
        chat_id: str,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency)
):
    db = AutoDB(connection_manager)

    query = """
        SELECT 
            m.id,
            m.chat_id,
            m.text,
            m.created_at,
            u.first_name || ' ' || u.last_name AS author
        FROM messages m
        LEFT JOIN users u ON m.author = u.id
        WHERE m.chat_id = ?
        ORDER BY m.created_at ASC
    """

    messages = await db.execute_async(query, (chat_id,))
    return messages


@router.post("/{chat_id}/messages/send")
async def send_message(
        chat_id: str,
        data: MessageCreate,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency)
):
    db = AutoDB(connection_manager)

    inserted = await db.insert_messages(
        chat_id=str(chat_id),
        text=data.text,
        author=str(user_id),
        created_at=datetime.now().replace(microsecond=0)
    )

    if not inserted:
        return {"ok": False}

    messages = await db.get_messages(chat_id=chat_id)
    return {"ok": True, "messages": messages}
