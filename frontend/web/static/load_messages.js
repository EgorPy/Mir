import messageTemplateHtml from '/pages/widgets/message.js'
import { getUserId } from '/static/get_user_id.js'
import { getChatState } from '/static/chat_state.js'
import { wsSend, wsOn } from '/static/websockets.js'

const tempDiv = document.createElement('div')
tempDiv.innerHTML = messageTemplateHtml
const messageTemplate = tempDiv.firstElementChild

const noMessagesYet = document.querySelector(".no-messages-yet")
const messagesContainer = document.querySelector('.messages-container')

let currentChatId = null
let userId = null
let inputInitialized = false
let chatState = null

const messageElements = new Map()

export async function loadMessages(chatId) {
    currentChatId = chatId

    await wsSend({
        type: "subscribe_chat",
        chat_id: chatId
    })

    chatState = getChatState(currentChatId)
    userId = String(await getUserId())

    clearMessages()
    const messages = await fetchMessages(chatId)
    insertMessages(messages)

    messages.forEach(msg => {
        if (String(msg.user_id) !== userId && !msg.read_at) {
            wsSend({
                type: "message_read",
                chat_id: chatId,
                message_id: msg.id
            })
        }
    })
}

export async function fetchMessages(chatId) {
    const response = await fetch(`${window.BACKEND_URL}/chats/${chatId}/messages`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) throw new Error(`HTTP error ${response.status}`)
    return await response.json()
}

function renderMessage(message) {
    const el = messageTemplate.cloneNode(true)
    el.dataset.messageId = message.id
    el.dataset.authorId = String(message.user_id)

    el.querySelector('.message-author').textContent = message.author
    el.querySelector('.message-date').textContent = formatTime(message.created_at)
    el.querySelector('.message-text').textContent = message.text

    const unread = el.querySelector('.unread')
    const read = el.querySelector('.read')

    unread.style.display = "none"
    read.style.display = "none"

    if (String(message.user_id) === userId) {
        if (message.read_at) {
            read.style.display = "block"
        } else {
            unread.style.display = "block"
        }
    }

    messageElements.set(message.id, el)
    return el
}

export function insertMessage(message) {
    updateUI([message])
    const el = renderMessage(message)
    messagesContainer.appendChild(el)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
}

export function clearMessages() {
    messageElements.clear()
    messagesContainer.innerHTML = ''
}

function updateUI(messages) {
    if (messages.length === 0) {
        noMessagesYet.style.display = "block"
        messagesContainer.style.display = "none"
    } else {
        noMessagesYet.style.display = "none"
        messagesContainer.style.display = "block"
    }
}

export function insertMessages(messages) {
    updateUI(messages)
    messages.forEach(msg => {
        const el = renderMessage(msg)
        messagesContainer.appendChild(el)
    })
    messagesContainer.scrollTop = messagesContainer.scrollHeight
}

export async function sendMessage(text) {
    if (!currentChatId) return
    wsSend({ type: "send_message", chat_id: currentChatId, text: text.trim() })
}

function formatTime(isoString) {
    if (!isoString) return ""
    const date = new Date(isoString)
    if (isNaN(date)) return ""
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function setupMessageInput() {
    if (inputInitialized) return
    inputInitialized = true

    const input = document.querySelector('.message-input')
    const button = document.querySelector('.send-message-btn')
    if (!input || !button) return

    button.addEventListener('click', async () => {
        const text = input.value.trim()
        if (!text) return
        input.value = ''
        await sendMessage(text)
    })

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            button.click()
        }
    })
}

wsOn("new_message", (data) => {
    const message = data.message
    if (message.chat_id != currentChatId) return

    insertMessage(message)

    if (String(message.user_id) !== userId) {
        wsSend({ type: "message_read", chat_id: message.chat_id, message_id: message.id })
    }
})

wsOn("message_read", (data) => {
    const el = messageElements.get(data.message_id)
    if (!el) return

    if (el.dataset.authorId !== userId) return

    const unread = el.querySelector('.unread')
    const read = el.querySelector('.read')

    if (unread) unread.style.display = "none"
    if (read) read.style.display = "block"
})
