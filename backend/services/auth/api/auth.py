""" Auth endpoints and validation """

from fastapi import APIRouter, Form, status, Depends, HTTPException, Cookie
from fastapi.responses import JSONResponse
from typing_extensions import Annotated
from datetime import datetime
from typing import Optional
import sqlite3

from backend.services.auth.logic.auth_logic import AuthLogic

from core.method_generator import AutoDB, ConnectionManager
from core.redirects import redirect_on_success
from core.config import config
from core.logger import logger

router = APIRouter()
cm = ConnectionManager()


@router.post("/login/", status_code=status.HTTP_200_OK)
@redirect_on_success("/profile")
async def login(
        email: Annotated[str, Form(min_length=5, max_length=256,
                                   pattern=r"^\s*[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\s*$")],
        password: Annotated[str, Form(min_length=8, max_length=256, pattern=r"^\S+$")],
        connection=Depends(cm.dependency)
):
    """ Login endpoint """

    session_id = await AuthLogic.login_user(email, password, connection)

    if not session_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    response = JSONResponse(content={"message": "Login successful"})
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=False,  # TODO: set True in production (only HTTPS)
        samesite="strict",
        max_age=config.SESSION_DURATION,
        path="/"
    )
    return response


@router.post("/register/", status_code=status.HTTP_201_CREATED)
async def register(
        first_name: Annotated[str, Form(min_length=2, max_length=32, pattern=r"^[^\d]+$")],
        last_name: Annotated[str, Form(min_length=2, max_length=32, pattern=r"^[^\d]+$")],
        phone: Annotated[str, Form(min_length=4, max_length=16, pattern=r"^\s*\+\d+\s*$")],
        email: Annotated[str, Form(min_length=5, max_length=256,
                                   pattern=r"^\s*[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\s*$")],
        password: Annotated[str, Form(min_length=8, max_length=256, pattern=r"^\S+$")],
        connection: sqlite3.Connection = Depends(cm.dependency)
):
    """ Register endpoint """

    session_id = await AuthLogic.register_user(
        first_name.strip().capitalize(),
        last_name.strip().capitalize(),
        phone.strip(),
        email.strip(),
        password.strip(),
        connection
    )
    if not session_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT)

    response = JSONResponse(content={"message": "Registered and logged in"})
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=False,
        samesite="strict",
        max_age=config.SESSION_DURATION,
        path="/"
    )
    return response


async def check_user_session(session_id: Optional[str] = Cookie(None),
                             connection: sqlite3.Connection = Depends(cm.dependency)):
    """ Checks validity of user session """

    db = AutoDB(connection)

    if not session_id:
        logger.info("No session provided")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No session provided")
    db.create_table_if_not_exists("sessions")
    db.create_column_if_not_exists("sessions", "expires_at")
    user_id = db.execute("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?",
                         (session_id, datetime.utcnow()))
    if not user_id:
        logger.info("Invalid or expired session")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
    return user_id


async def check_user_session_for_logout(session_id: Optional[str] = Cookie(None),
                                        connection: sqlite3.Connection = Depends(cm.dependency)):
    """ Checks validity of user session for logout """

    db = AutoDB(connection)

    if not session_id:
        logger.info("No session provided")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No session provided")
    db.create_table_if_not_exists("sessions")
    db.create_column_if_not_exists("sessions", "expires_at")
    user_id = db.execute("SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?",
                         (session_id, datetime.utcnow()))
    if not user_id:
        logger.info("Invalid or expired session")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
    return session_id


@router.get("/logout/")
async def logout(session_id: str = Depends(check_user_session_for_logout),
                 connection: sqlite3.Connection = Depends(cm.dependency)):
    """ Logout endpoint """

    await AuthLogic.logout_user(session_id, connection)
    return {"message": "Logged out"}


@router.get("/me")
async def get_me(user_id: int = Depends(check_user_session)):
    """ Check if a user is logged in endpoint """

    return {"user_id": user_id}
