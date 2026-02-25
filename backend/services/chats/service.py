from core.method_generator import AutoDB, ConnectionManager, cm

from backend.services.auth.api.auth import check_user_session

from fastapi.params import Depends
from pydantic import BaseModel
from fastapi import APIRouter
from fastapi import status
from uuid import uuid4

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

    return {"ok": True, "id": result[0].get("id", None), "result": result[0]}


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

    result = await db.delete_chat(
        id=str(data.chat_id)
    )

    return {"ok": bool(result)}
