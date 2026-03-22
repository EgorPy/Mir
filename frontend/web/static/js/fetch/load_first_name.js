export async function loadFirstName() {
    const response = await fetch(`${window.BACKEND_URL}/auth/name`, {
        credentials: "include"
    })
    const result = await response.json()
    if (!result.name) return
    profileName.textContent = result.name
}
