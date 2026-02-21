""" Authentication, authorization, registration logic """

from backend.services.auth.logic.security import verify_password, hash_password

from core.method_generator import AutoDB
from core.config import config

from datetime import datetime, timedelta


class AuthLogic:
    @staticmethod
    async def login_user(email: str, password: str, connection):

        db = AutoDB(connection)

        hashed_password = db.get_password_from_users(email=email)
        if not hashed_password or not verify_password(password, hashed_password):
            return None

        user_id = db.get_id_from_users(email=email)
        db.delete_session(user_id=user_id)
        response = db.insert_session(user_id=user_id, duration=config.SESSION_DURATION,
                                     expires_at=str(datetime.now() + timedelta(seconds=int(config.SESSION_DURATION))))
        session_id = response[0]["id"]

        return session_id

    @staticmethod
    async def register_user(first_name, last_name, phone, email, password, connection):

        db = AutoDB(connection)

        if db.is_user_exists(email=email):
            return None

        db.insert_user(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=hash_password(password),
            phone=phone
        )

        return await AuthLogic.login_user(email, password, connection)

    @staticmethod
    async def logout_user(session_id, connection):
        """ Logout user """

        db = AutoDB(connection)
        db.delete_session(id=session_id)
