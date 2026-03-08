class WSClient {
    constructor(url) {
        this.url = url
        this.ws = null

        this.handlers = new Map()
        this.statusHandlers = new Set()

        this.queue = []

        this.reconnectDelay = 1000
        this.maxReconnectDelay = 10000

        this.connect()
        this.startHeartbeat()
    }

    connect() {

        this.setStatus("connecting")

        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {

            this.setStatus("connected")

            this.reconnectDelay = 1000

            while (this.queue.length)
            this.ws.send(this.queue.shift())
        }

        this.ws.onmessage = (event) => {

            const data = JSON.parse(event.data)

            const handlers = this.handlers.get(data.type)

            if (!handlers) return

            handlers.forEach(h => h(data))
        }

        this.ws.onclose = () => {

            this.setStatus("reconnecting")

            setTimeout(() => this.connect(), this.reconnectDelay)

            this.reconnectDelay = Math.min(
                this.reconnectDelay * 2,
                this.maxReconnectDelay
            )
        }

        this.ws.onerror = () => {
            this.ws.close()
        }
    }

    startHeartbeat() {
        setInterval(() => {
            this.send({ type: "ping" })
        }, 25000)
    }

    send(data) {

        const payload = JSON.stringify(data)

        if (this.ws.readyState === WebSocket.OPEN)
        this.ws.send(payload)
        else
        this.queue.push(payload)
    }

    on(type, handler) {

        if (!this.handlers.has(type))
        this.handlers.set(type, new Set())

        this.handlers.get(type).add(handler)
    }

    onStatus(handler) {
        this.statusHandlers.add(handler)
    }

    setStatus(state) {
        this.statusHandlers.forEach(h => h(state))
    }

}

const backend = new URL(window.BACKEND_URL)
const protocol = backend.protocol === "https:" ? "wss" : "ws"
const ws = new WSClient(`${protocol}://${backend.host}/ws`)

export function wsSend(data) {
    ws.send(data)
}

export function wsOn(type, handler) {
    ws.on(type, handler)
}

export function wsOnStatus(handler) {
    ws.onStatus(handler)
}
