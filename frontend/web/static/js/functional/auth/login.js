import { BACKEND_URL } from "../../config.js"

document.querySelector(".login-form").addEventListener("submit", async function(event) {
    event.preventDefault()

    const email = document.querySelector("#email_input").value
    const password = document.querySelector("#password_input").value

    const errorText = document.querySelector(".error-text")

    const response = await fetch(`${BACKEND_URL}/auth/login/`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            email,
            password
        })
    })

    if (response.ok) {
        const result = await response.json()
        window.location.href = "/roll"
    } else {
        const error = await response.json()
        if (response.status === 401) {
            errorText.innerHTML = "Неверная почта или пароль."
        } else if (response.status === 422) {
            errorText.innerHTML = "Некорректный формат данных."
        } else {
            errorText.innerHTML = "Ошибка: " + response.status
        }
    }
})
