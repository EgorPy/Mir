from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List
from datetime import datetime
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

CHATS: Dict[str, Dict[str, str]] = {}
MESSAGES: Dict[str, List[Dict]] = {}


class ChatCreate(BaseModel):
    title: str


@router.get("/list")
def list_chats():
    return CHATS


@router.post("/create")
def create_chat(data: ChatCreate):
    chat_id = str(uuid4())
    CHATS[chat_id] = {"id": chat_id, "title": data.title}
    MESSAGES[chat_id] = []
    print(CHATS)
    return {"ok": True, "id": chat_id}


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