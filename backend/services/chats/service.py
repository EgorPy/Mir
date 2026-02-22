from core.method_generator import AutoDB, ConnectionManager, cm
from core.logger import logger

from backend.services.auth.api.auth import check_user_session

from fastapi import APIRouter, HTTPException
from fastapi.params import Depends
from pydantic import BaseModel
from typing import Dict, List
from datetime import datetime
from uuid import uuid4

router = APIRouter()


# cm уже импортирован из core.method_generator, не нужно создавать новый


class Service:
    def __init__(self, name: str, app):
        self.name = name
        self.app = app


SERVICE = Service(
    name="chats",
    app=router
)

CHATS: Dict[str, Dict[str, str]] = {}
MESSAGES: Dict[str, List[Dict]] = {}


class ChatCreate(BaseModel):
    title: str


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
    if result:
        for chat in result:
            if hasattr(chat, 'keys'):
                chat_dict = dict(chat)
            else:
                chat_dict = chat
            chats_dict[chat_dict['id']] = chat_dict

    print(f"DEBUG: Returning {len(chats_dict)} chats")
    return chats_dict


@router.post("/create")
async def create_chat(
        data: ChatCreate,
        user_id: str = Depends(check_user_session),
        connection_manager: ConnectionManager = Depends(cm.dependency)
):
    db = AutoDB(connection_manager)
    chat_id = str(uuid4())

    result = await db.insert_chat(
        id=chat_id,
        owner_id=str(user_id),
        title=str(data.title)
    )

    return {"ok": True, "id": chat_id, "result": result}


class ChatDelete(BaseModel):
    chat_id: str


@router.post("/delete")
def delete_chat(data: ChatDelete):
    if data.chat_id not in CHATS:
        raise HTTPException(status_code=404, detail="Chat not found")

    del CHATS[data.chat_id]
    if data.chat_id in MESSAGES:
        del MESSAGES[data.chat_id]
    return {"ok": True}


class MessageSend(BaseModel):
    chat_id: str
    text: str
    author: str


@router.post("/messages/send")
def send_message(data: MessageSend):
    """ Send a message to a chat """

    if data.chat_id not in CHATS:
        raise HTTPException(status_code=404, detail="Chat not found")

    message = {
        "id": str(uuid4()),
        "chat_id": data.chat_id,
        "text": data.text,
        "author": data.author,
        "time": datetime.now().isoformat()
    }

    if data.chat_id not in MESSAGES:
        MESSAGES[data.chat_id] = []

    MESSAGES[data.chat_id].append(message)
    return {"ok": True, "message": message}


@router.get("/messages/{chat_id}")
def get_messages(chat_id: str):
    """ Get all messages for a specific chat """

    if chat_id not in CHATS:
        raise HTTPException(status_code=404, detail="Chat not found")

    return MESSAGES.get(chat_id, [])
