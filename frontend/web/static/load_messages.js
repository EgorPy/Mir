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
    await wsSend({ type: "subscribe_chat", chat_id: chatId })

    chatState = getChatState(currentChatId)
    userId = String(await getUserId())

    clearMessages()
    const messages = await fetchMessages(chatId)
    insertMessages(messages)

    checkVisibleMessages()
}

export async function fetchMessages(chatId) {
    const response = await fetch(`${window.BACKEND_URL}/chats/${chatId}/messages`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) throw new Error(`HTTP error ${response.status}`)
    return await response.json()
}

function updateRead(el, message, read, unread) {
    if (String(message.user_id) === userId) {
        if (el.dataset.readAt) {
            read.style.display = "block"
            unread.style.display = "none"
        } else {
            unread.style.display = "block"
            read.style.display = "none"
        }
    } else {
        unread.style.display = "none"
        read.style.display = "none"
    }
}

function renderMessage(message) {
    const el = messageTemplate.cloneNode(true)
    el.dataset.messageId = message.id
    el.dataset.authorId = String(message.user_id)
    el.dataset.readAt = message.read_at || ''

    el.querySelector('.message-author').textContent = message.author
    el.querySelector('.message-date').textContent = formatTime(message.created_at)
    el.querySelector('.message-text').textContent = message.text

    const unread = el.querySelector('.unread')
    const read = el.querySelector('.read')

    updateRead(el, message, read, unread)

    messageElements.set(message.id, el)
    return el
}

export function insertMessage(message) {
    updateUI([message])
    const el = renderMessage(message)
    messagesContainer.appendChild(el)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
    checkVisibleMessages()
}

export function insertMessages(messages) {
    updateUI(messages)
    messages.forEach(msg => {
        const el = renderMessage(msg)
        messagesContainer.appendChild(el)
    })
    messagesContainer.scrollTop = messagesContainer.scrollHeight
    checkVisibleMessages()
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

    messagesContainer.addEventListener('scroll', checkVisibleMessages)
}

function isElementVisible(el) {
    const rect = el.getBoundingClientRect()
    const containerRect = messagesContainer.getBoundingClientRect()
    return rect.bottom > containerRect.top && rect.top < containerRect.bottom
}

function checkVisibleMessages() {
    if (!currentChatId) return
    for (const [id, el] of messageElements) {
        if (el.dataset.authorId === userId) continue
        if (el.dataset.readAt) continue
        if (isElementVisible(el)) {
            wsSend({ type: "message_read", chat_id: currentChatId, message_id: id })
            el.dataset.readAt = new Date().toISOString()

            const unread = el.querySelector('.unread')
            const read = el.querySelector('.read')

            const message = {
                id,
                user_id: el.dataset.authorId
            }

            updateRead(el, message, read, unread)
        }
    }
}

wsOn("new_message", (data) => {
    const message = data.message
    if (message.chat_id != currentChatId) return
    insertMessage(message)
})

wsOn("message_read", (data) => {
    const el = messageElements.get(data.message_id)
    if (!el) return

    const unread = el.querySelector('.unread')
    const read = el.querySelector('.read')

    const message = {
        id: data.message_id,
        user_id: el.dataset.authorId
    }

    updateRead(el, message, read, unread)

    el.dataset.readAt = new Date().toISOString()
})
