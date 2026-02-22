import { BACKEND_URL } from "../static/config.js"

document.querySelector(".login-form").addEventListener("submit", async function(event) {
    event.preventDefault()

    const first_name = document.querySelector("#first_name_input").value
    const last_name = document.querySelector("#last_name_input").value
    const email = document.querySelector("#email_input").value
    const password = document.querySelector("#password_input").value

    const errorText = document.querySelector(".error-text")

    const response = await fetch(`${BACKEND_URL}/auth/register/`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        credentials: "include",
        body: new URLSearchParams({
            first_name,
            last_name,
            email,
            password
        })
    })

    if (response.ok) {
        const result = await response.json()
        window.location.href = "/profile"
    } else {
        const error = await response.json()
        console.log(error)
        errorText.style += "display: block;"
        if (response.status === 409) {
            errorText.innerHTML = "Аккаунт с таким email уже существует. <a href='/login'>Войти?</a>"
        } else if (response.status === 422) {
            errorText.innerHTML = "Некорректный формат данных."
        } else {
            errorText.innerHTML = "Ошибка: " + response.status
        }
    }
})