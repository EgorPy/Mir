import { wsOnStatus } from '/static/websockets.js'

const status = document.querySelector(".ws-status")

wsOnStatus((state) => {
    if (state === "connecting")
    status.textContent = "Подключение..."

    if (state === "connected")
    status.textContent = "Подключено"

    if (state === "reconnecting")
    status.textContent = "Переподключение..."
})
