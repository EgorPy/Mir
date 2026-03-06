""" Authentication, authorization, registration logic """

from backend.services.auth.logic.security import verify_password, hash_password

from core.method_generator import AutoDB, cm
from core.config import config

from datetime import datetime, timedelta
from uuid import uuid4


class AuthLogic:
    @staticmethod
    async def login_user(email: str, password: str):
        db = AutoDB(cm)

        hashed_password = await db.get_password_from_users(email=email)
        if not hashed_password or not verify_password(password, hashed_password):
            return None

        user_id = await db.get_id_from_users(email=email)
        await db.delete_session(user_id=user_id)

        expires_at = str(datetime.now() + timedelta(seconds=int(config.SESSION_DURATION)))
        response = await db.insert_session(
            id=str(uuid4()),
            user_id=user_id,
            duration=config.SESSION_DURATION,
            expires_at=expires_at
        )

        if response and len(response) > 0:
            session_id = response[0]["id"]
            return session_id
        return None

    @staticmethod
    async def register_user(
            first_name: str,
            last_name: str,
            email: str,
            password: str,
    ):
        db = AutoDB(cm)

        exists = await db.is_user_exists(email=email)
        if exists:
            return None

        await db.insert_user(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=hash_password(password),
        )

        user_id = await db.get_id_from_users(email=email)
        if user_id:
            public_id = f"favorites_{user_id}"

            await db.execute_async(
                """
                CREATE TABLE IF NOT EXISTS chats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT,
                    owner_id TEXT,
                    title TEXT,
                    public_id TEXT,
                    type TEXT,
                    description TEXT,
                    avatar_url TEXT
                )
                """
            )
            await db.execute_async(
                """
                CREATE TABLE IF NOT EXISTS chat_members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id TEXT,
                    user_id TEXT,
                    role TEXT,
                    joined_at TEXT
                )
                """
            )

            chat = await db.execute_async(
                "SELECT id FROM chats WHERE public_id = ? AND type = 'favorites'",
                (public_id,)
            )

            if not chat:
                now = datetime.utcnow().isoformat()
                await db.execute_async(
                    """
                    INSERT INTO chats(owner_id, title, public_id, type, description, created_at)
                    VALUES(?, 'Favorites', ?, 'favorites', 'Personal saved messages', ?)
                    """,
                    (str(user_id), public_id, now)
                )

                chat = await db.execute_async(
                    "SELECT id FROM chats WHERE public_id = ? AND type = 'favorites' ORDER BY id DESC LIMIT 1",
                    (public_id,)
                )

            if chat:
                chat_id = str(chat[0]["id"])
                member_exists = await db.execute_async(
                    "SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ?",
                    (chat_id, str(user_id))
                )
                if not member_exists:
                    await db.execute_async(
                        "INSERT INTO chat_members(chat_id, user_id, role, joined_at) VALUES(?, ?, 'owner', ?)",
                        (chat_id, str(user_id), datetime.utcnow().isoformat())
                    )

        return await AuthLogic.login_user(email, password)

    @staticmethod
    async def logout_user(session_id: str):
        """ Logout user """

        db = AutoDB(cm)
        await db.delete_session(id=session_id)

