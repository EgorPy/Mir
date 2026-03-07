""" Authentication, authorization, registration logic """

from backend.services.auth.logic.security import verify_password, hash_password
from backend.services.auth.schema import *

from core.method_generator import AutoDB, cm
from core.config import config

from datetime import datetime, timedelta
from uuid import uuid4


class AuthLogic:
    @staticmethod
    async def login_user(email: str, password: str):
        db = AutoDB(cm)

        hashed_password = await db.select_one_async(Users, email=email)
        if not hashed_password or not verify_password(password, hashed_password):
            return None

        result = await db.select_one_async(Users, email=email)
        if not result:
            return
        user_id = result.id
        await db.delete_async(Sessions, user_id=user_id)

        expires_at = str(datetime.now() + timedelta(seconds=int(config.SESSION_DURATION)))
        response = await db.insert_async(
            Sessions,
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

        exists = await db.select_one_async(email=email)
        if exists:
            return None

        await db.insert_async(Users,
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
        await db.delete_async(Users, id=session_id)
