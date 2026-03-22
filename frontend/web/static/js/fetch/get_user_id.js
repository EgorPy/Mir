export async function getUserId() {
    const response = await fetch(`${window.BACKEND_URL}/auth/me`, {
        credentials: "include"
    })
    const result = await response.json()
    return result.user_id
}
