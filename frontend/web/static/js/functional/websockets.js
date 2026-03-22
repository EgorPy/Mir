import { getUserId } from '../fetch/get_user_id.js'

class WSClient {
    constructor(url, userId) {
        this.url = url
        this.userId = userId
        this.ws = null

        this.handlers = new Map()
        this.statusHandlers = new Set()

        this.queue = []

        this.reconnectDelay = 1000
        this.maxReconnectDelay = 10000

        this.connect()
        this.startHeartbeat()
    }

    async fetchWsNonce() {
        try {
            const res = await fetch(`${window.BACKEND_URL}/ws-nonce?user_id=${this.userId}`)
            const data = await res.json()
            return data.nonce
        } catch (err) {
            console.error("Failed to fetch WS nonce:", err)
            return null
        }
    }

    async connect() {
        this.setStatus("connecting")

        this.ws = new WebSocket(this.url)

        this.ws.onopen = async () => {
            this.setStatus("connected")
            this.reconnectDelay = 1000

            const nonce = await this.fetchWsNonce()
            if (!nonce) {
                console.error("Cannot get WS nonce, closing connection")
                this.ws.close()
                return
            }
            window.WS_NONCE = nonce

            this.send({
                type: "auth",
                nonce: window.WS_NONCE,
                user_id: userId
            })

            while (this.queue.length)
            this.ws.send(this.queue.shift())
        }

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data)

//            console.log("WS IN: ", data)

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
const userId = await getUserId()
const ws = new WSClient(`${protocol}://${backend.host}/ws`, userId)

export async function wsSend(data) {
    ws.send(data)
}

export function wsOn(type, handler) {
    ws.on(type, handler)
}

export function wsOnStatus(handler) {
    ws.onStatus(handler)
}

wsOn("auth_ok", (data) => {
    window.SESSION_ID = data.session_id
})
