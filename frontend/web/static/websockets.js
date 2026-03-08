const ws = new WebSocket(`ws://${window.BACKEND_URL}:8000/ws`)

ws.onmessage = (event) => {
    console.log("Message received: ", event.data)
}

function send(text) {
    ws.send(text)
}
