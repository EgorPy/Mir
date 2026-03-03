export async function isMember(chatId) {
    const response = await fetch(`${window.BACKEND_URL}/chats/${chatId}/member`, {
        credentials: "include"
    })

    if (!response.ok) return
    const result = await response.json()
    return result.is_member
}
