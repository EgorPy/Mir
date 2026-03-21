from core.method_generator import AutoDB, cm

from backend.services.auth.api.auth import check_user_session
from backend.services.chats.schema import ChatMembers
from backend.tech.websockets.websockets_manager import ws_manager

from fastapi import APIRouter, Depends, HTTPException, status

app = APIRouter()


@app.get("/chats/{chat_id}/permissions/{user_id}")
async def get_permissions(chat_id: int, user_id: int, current_user=Depends(check_user_session)):
    db = AutoDB(cm)

    member = await db.select_one_async(ChatMembers, chat_id=chat_id, user_id=user_id)
    if not member:
        raise HTTPException(status_code=404, detail="User not in chat")

    return {"permissions": member.get("permissions", 0)}


@app.post("/chats/{chat_id}/permissions/update")
async def update_permissions(chat_id: int, data: dict, current_user=Depends(check_user_session)):
    target_user_id = data.get("user_id")
    new_permissions = data.get("permissions")
    if not target_user_id or new_permissions is None:
        raise HTTPException(400, "Missing parameters")

    db = AutoDB(cm)

    permissions = await db.select_one_async(ChatMembers, chat_id=chat_id, user_id=current_user["id"])
    if not permissions:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    if permissions.get("promote_members") != 1:
        raise HTTPException(403, "You are not allowed to update permissions")

    target_member = await db.select_one_async(ChatMembers, chat_id=chat_id, user_id=target_user_id)
    if not target_member:
        raise HTTPException(404, "Target user not in chat")

    await db.update_async(ChatMembers, {"permissions": new_permissions},
                          {"chat_id": chat_id, "user_id": target_user_id})

    await ws_manager.send_chat(chat_id, {
        "type": "permissions_updated",
        "chat_id": chat_id,
        "user_id": target_user_id,
        "permissions": new_permissions
    })

    return {"ok": True}
