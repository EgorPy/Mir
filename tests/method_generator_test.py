from core.method_generator import AutoDB, DBField, cm
from pydantic import BaseModel


class TestUsers(BaseModel):
    __tablename__ = "test_users"

    id: int = DBField(primary_key=True, autoincrement=True, default=None)
    email: str = DBField(unique=True, index=True)
    name: str
    age: int


db = AutoDB(cm)

db.create_table_from_model(TestUsers)

# db.delete(TestUsers, email="use@gmail.com")
print(db.select_one(TestUsers, email="use@gmail.com"))

# print(*db.select(TestUsers), sep="\n")
# print(db.update(TestUsers, values={"name": "Vasya"}, where={"email": "user@gmail.com"}))
# print(db.insert(TestUsers, email="use@gmail.com", name="Petya", age=23))
