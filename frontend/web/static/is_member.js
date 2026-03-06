import { apiFetchJson } from '/static/api_client.js';

export async function isMember(chatId) {
    try {
        const result = await apiFetchJson(`/chats/${chatId}/member`, {
            method: 'GET',
            cacheTtlMs: 3000
        });

        return Boolean(result?.is_member);
    } catch {
        return false;
    }
}
