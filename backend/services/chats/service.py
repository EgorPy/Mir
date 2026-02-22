from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict
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


class ChatCreate(BaseModel):
    title: str


@router.get("/list")
def list_chats():
    return CHATS


@router.post("/create")
def create_chat(data: ChatCreate):
    chat_id = str(uuid4())
    CHATS[chat_id] = {"id": chat_id, "title": data.title}
    print(CHATS)
    return {"ok": True, "id": chat_id}


class ChatDelete(BaseModel):
    chat_id: str


@router.post("/delete")
def delete_chat(data: ChatDelete):
    if data.chat_id not in CHATS:
        raise HTTPException(status_code=404, detail="Chat not found")

    del CHATS[data.chat_id]
    return {"ok": True}
