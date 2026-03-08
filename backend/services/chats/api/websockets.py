from fastapi import WebSocket, WebSocketDisconnect
from fastapi.params import Depends

from backend.services.auth.api.auth import check_user_session
from backend.services.chats.service import router

from core.logger import logger

clients = []


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, user_id: str = Depends(check_user_session)):
    logger.info("Websocket started")
    await ws.accept()
    logger.info(f"Connected websocket for user {user_id}")
    clients.append(ws)

    client_index = 0

    try:
        while True:
            message = await ws.receive_text()
            client_index = 0

            logger.info(f"Websocket message: {message}")

            for client in clients:
                await client.send_text(f"Aboba {message}")
    except WebSocketDisconnect:
        logger.info(f"Client {user_id} disconnected")
        clients.remove(ws)
