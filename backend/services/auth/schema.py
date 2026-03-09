from core.method_generator import DBField, Schema


class Sessions(Schema):
    __tablename__ = "sessions"

    id: str = DBField(primary_key=True)
    user_id: str
    duration: str
    expires_at: str


class Users(Schema):
    __tablename__ = "users"

    id: int = DBField(primary_key=True, autoincrement=True)
    email: str
    first_name: str
    last_name: str
    password: str
    avatar_url: str = None
