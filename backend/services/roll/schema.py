from core.method_generator import DBField, Schema

import json


class Rolls(Schema):
    __tablename__ = "rolls"

    id: int = DBField(primary_key=True, autoincrement=True)
    user_id: int
    content: bytes
    rolled: str = DBField(default=json.dumps([]))
