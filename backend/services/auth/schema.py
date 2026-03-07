from pydantic import BaseModel, Field


class Users(BaseModel):
    id: int | None = Field(default=None, primary_key=True, autoincrement=True)
    email: str = Field(index=True, unique=True)
    first_name: str
    last_name: str
    password: str
    avatar_url: str | None = None
