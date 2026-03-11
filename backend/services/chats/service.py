from core.method_generator import AutoDB, ConnectionManager, cm

from backend.services.auth.api.auth import check_user_session
from backend.services.chats.websockets_manager import manager
from backend.services.auth.schema import Users
from backend.services.chats.schema import *

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
    public_id: str


class ChatDelete(BaseModel):
    chat_id: str


class SearchData(BaseModel):
    public_id: str  # it can be public_id of public chat (channel or group) or email of a user


async def add_chat_member(chat_id: str, user_id: str, connection_manager: ConnectionManager = Depends(cm.dependency)):
    db = AutoDB(connection_manager)

    await db.insert_async(
        ChatMembers,
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
        "SELECT DISTINCT c.* FROM chats c INNER JOIN chat_members cm ON c.id = cm.chat_id WHERE cm.user_id = ?",
        (user_id,)
    )

    chats_dict = {}
    if not result:
        return chats_dict

    for chat in result:
        chat_dict = dict(chat) if hasattr(chat, "keys") else chat
        chats_dict[chat_dict['id']] = chat_dict

    return chats_dict


@router.get("/search/{public_id}")
async def search_chats(
        public_id: str,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency)
):
    db = AutoDB(connection_manager)

    result = await db.select_async(
        Chats,
        {"title": str(public_id)}
    )

    if result:
        return {"ok": True, "chats": result}

    result = await db.execute_async(
        "SELECT id, first_name, last_name, email FROM users WHERE email = ?", (str(public_id),)
    )

    if not result:
        return {"ok": True, "chats": []}

    return {"ok": True, "chats": [result[0]]}


@router.post("/create")
async def create_chat(
        data: ChatCreate,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency)
):
    db = AutoDB(connection_manager)

    result = await db.insert_async(
        Chats,
        owner_id=str(user_id),
        title=str(data.title),
        public_id=str(data.public_id)
    )

    if not result:
        return {"ok": False}

    await add_chat_member(result.get("id", None), user_id, connection_manager)

    return {"ok": True, "id": result.get("id", None), "result": result}


@router.get("/{chat_id}/info")
async def chat_info(
        chat_id: str,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency)
):
    db = AutoDB(connection_manager)

    members = await db.execute_async("""SELECT u.id, u.first_name, u.last_name, cm.role FROM users u 
INNER JOIN chat_members cm ON u.id = cm.user_id WHERE cm.chat_id = ?""", (chat_id,))
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


@router.get("/{chat_id}/leave")
async def leave_chat(
        chat_id: str,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency)
):
    db = AutoDB(connection_manager)
    await db.delete_async(
        ChatMembers,
        chat_id=chat_id,
        user_id=user_id
    )
    return {"ok": True}


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
    result = await db.delete_async(
        Chats,
        id=str(data.chat_id)
    )

    # delete chat members
    await db.delete_async(
        ChatMembers,
        chat_id=str(data.chat_id)
    )

    # delete chat messages
    await db.delete_async(
        Messages,
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
            m.read_at,
            u.first_name || ' ' || u.last_name AS author,
            u.id AS user_id
        FROM messages m
        LEFT JOIN users u ON m.author = u.id
        WHERE m.chat_id = ?
        ORDER BY m.created_at ASC
    """

    messages = await db.execute_async(query, (chat_id,))
    return messages


async def get_any_member(chat_id: str,
                         user_id: str,
                         connection_manager: ConnectionManager = Depends(cm.dependency)):
    db = AutoDB(connection_manager)

    result = await db.execute_async("SELECT COUNT(id) FROM chat_members WHERE chat_id = ? AND user_id = ?",
                                    (chat_id, user_id))

    if not result:
        return {"ok": True, "is_member": False, "user_id": user_id}

    return {"ok": True, "is_member": bool(result[0].get("COUNT(id)")), "user_id": user_id}


@router.get("/{chat_id}/member")
async def get_member(chat_id: str,
                     user_id: str = Depends(check_user_session),
                     connection_manager: ConnectionManager = Depends(cm.dependency)):
    return await get_any_member(chat_id, user_id, connection_manager)


@router.get("/{chat_id}/join/")
async def join(chat_id: str,
               user_id: str = Depends(check_user_session),
               connection_manager: ConnectionManager = Depends(cm.dependency)):
    await add_chat_member(chat_id, user_id, connection_manager)
    return {"ok": True}

# @router.post("/{chat_id}/messages/send")
# async def send_message(
#         chat_id: str,
#         data: MessageCreate,
#         user_id: str = Depends(check_user_session),
#         connection_manager: ConnectionManager = Depends(cm.dependency)
# ):
#     db = AutoDB(connection_manager)
#
#     message = await db.insert_async(
#         Messages,
#         chat_id=str(chat_id),
#         text=data.text,
#         author=str(user_id),
#         created_at=datetime.now().replace(microsecond=0)
#     )
#     user = await db.select_one_async(
#         Users,
#         id=str(user_id)
#     )
#
#     if not message:
#         return {"ok": False}
#     message["user_id"] = message.get("author")
#     message["author"] = f"{user.get('first_name')} {user.get('last_name')}"
#
#     await manager.send_chat(chat_id, {
#         "type": "new_message",
#         "message": message
#     })
#     return {"ok": True, "message": message}
