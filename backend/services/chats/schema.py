from core.method_generator import DBField, Schema


class ChatMembers(Schema):
    __tablename__ = "chat_members"

    id: int = DBField(primary_key=True, autoincrement=True)
    chat_id: str
    user_id: str
    role: str = DBField(default="member")
    joined_at: str


class Chats(Schema):
    __tablename__ = "chats"

    id: int = DBField(primary_key=True, autoincrement=True)
    created_at: str = DBField(default="CURRENT_TIMESTAMP")
    owner_id: str
    title: str
    public_id: str
    type: str = DBField(default="group")
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
    message_type: str = DBField(default="text")
    media_url: str = None
    forwarded_message_id: int = None
