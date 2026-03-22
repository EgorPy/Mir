import permissions from "/shared/permissions.json";
import { wsOn } from "/static/websockets.js";
import { getChatState, setChatStateForce } from "/static/state/chat_state.js";


const permissionList = [];
Object.values(permissions).forEach(group => {
    Object.values(group).forEach(p => permissionList.push(p));
});
permissionList.sort();

export const PermissionBits = {};
permissionList.forEach((perm, i) => {
    PermissionBits[perm] = 1 << i;
});

export function hasPermission(mask, perm) {
    return (mask & PermissionBits[perm]) !== 0;
}


// key: `${chatId}:${userId}`, value: bitmask
const permissionsCache = new Map();

export async function getPermissions(chatId, userId) {
    if (!chatId || !userId) return 0;

    const key = `${chatId}:${userId}`;
    if (permissionsCache.has(key)) return permissionsCache.get(key);

    try {
        const response = await fetch(`/api/chats/${chatId}/permissions/${userId}`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();
        permissionsCache.set(key, data.permissions);
        return data.permissions;
    } catch (e) {
        console.error("Failed to fetch permissions:", e);
        return 0;
    }
}

wsOn("permissions_updated", (data) => {
    const { chat_id, user_id, permissions } = data;
    const key = `${chat_id}:${user_id}`;
    permissionsCache.set(key, permissions);

    const chat = getChatState(chat_id);
    if (chat) {
        setChatStateForce(chat_id, {
            ...chat,
            permissions: chat.user_id === user_id ? permissions : chat.permissions,
        });
    }
});
