from core.method_generator import DBField, Schema

from backend.services.chats.constants import role, chat, message_type


class ChatMembers(Schema):
    __tablename__ = "chat_members"

    id: int = DBField(primary_key=True, autoincrement=True)
    chat_id: str
    user_id: str
    role: str = DBField(default=role.MEMBER)
    joined_at: str
    permissions: str = DBField(default="{}")


class Chats(Schema):
    __tablename__ = "chats"

    id: int = DBField(primary_key=True, autoincrement=True)
    created_at: str = DBField(default="CURRENT_TIMESTAMP")
    owner_id: str
    title: str
    public_id: str
    type: str = DBField(default=chat.GROUP)
    description: str = None
    avatar_url: str = None


class Messages(Schema):
    __tablename__ = "messages"

    id: int = DBField(primary_key=True, autoincrement=True)
    chat_id: str
    text: str = None
    author: str
    created_at: str
    read_at: str = None
    message_type: str = DBField(default=message_type.TEXT)
    media_url: str = None
    forwarded_message_id: int = None
