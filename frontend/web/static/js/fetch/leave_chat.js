export async function leaveChat(chatId) {
    const response = await fetch(`${window.BACKEND_URL}/chats/${chatId}/leave`, {
        credentials: "include"
    })
    window.location.href = "/"
}
