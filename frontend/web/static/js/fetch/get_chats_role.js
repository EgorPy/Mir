export async function getChatsRole() {
    const response = await fetch(`${window.BACKEND_URL}/chats/chats_role`, {
        credentials: "include"
    })
    const result = await response.json()
    return result
}
