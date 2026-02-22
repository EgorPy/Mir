""" Authentication, authorization, registration logic """

from backend.services.auth.logic.security import verify_password, hash_password

from core.method_generator import AutoDB, cm
from core.config import config

from datetime import datetime, timedelta


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

        return await AuthLogic.login_user(email, password)

    @staticmethod
    async def logout_user(session_id: str):
        """ Logout user """

        db = AutoDB(cm)
        await db.delete_session(id=session_id)
