import { BACKEND_URL } from "/static/config.js"
import { login } from "/static/index_login.js"

fetch(`${BACKEND_URL}/auth/me`, {
    credentials: "include"
}).then(async res => {
    if (res.ok) {
        const data = await res.json()
        document.querySelector("#login_button").innerText = "Профиль"
        document.querySelector("#login_button").onclick = () => window.location.href = "/profile"
    } else {
        document.querySelector("#login_button").innerText = "Войти"
//        document.querySelector("#login_button").onclick = () => window.location.href = "/login"
    }
})
