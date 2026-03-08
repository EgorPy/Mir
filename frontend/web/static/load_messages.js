import messageTemplateHtml from '/pages/widgets/message.js'
import { getUserId } from '/static/get_user_id.js'
import { getChatState } from '/static/chat_state.js'

const tempDiv = document.createElement('div')
tempDiv.innerHTML = messageTemplateHtml
const messageTemplate = tempDiv.firstElementChild
const noMessagesYet = document.querySelector(".no-messages-yet")
const messagesContainer = document.querySelector('.messages-container')

let currentChatId = null
let userId = null
let inputInitialized = false
let chatState = null

export async function loadMessages(chatId) {
    currentChatId = chatId
    chatState = getChatState(currentChatId)
    userId = await getUserId()
    clearMessages()
    const messages = await fetchMessages(chatId)
    insertMessages(messages)
}

export async function fetchMessages(chatId) {
    const response = await fetch(`${window.BACKEND_URL}/chats/${chatId}/messages`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) throw new Error(`HTTP error ${response.status}`)
    const messages = await response.json()
    return messages
}

export function insertMessage(message) {
    updateUI([message])
    const messageElement = messageTemplate.cloneNode(true)
    messageElement.querySelector('.message-author').textContent = message.author
    messageElement.querySelector('.message-date').textContent = formatTime(message.created_at)
    messageElement.querySelector('.message-text').textContent = message.text

    if (message.user_id == userId) {
        messageElement.querySelector('.unread').style.display = 'block'
    }

    messagesContainer.appendChild(messageElement)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
}

export function clearMessages() {
    messagesContainer.innerHTML = ''
}

function updateUI(messages) {
    if (messages.length == 0) {
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
        const messageElement = messageTemplate.cloneNode(true)
        messageElement.querySelector('.message-author').textContent = msg.author
        messageElement.querySelector('.message-date').textContent = formatTime(msg.created_at)
        messageElement.querySelector('.message-text').textContent = msg.text

        if (msg.user_id == userId) {
            if (chatState.members.length <= 1) {
                messageElement.querySelector('.read').style.display = 'block'
            } else if (true) {
                messageElement.querySelector('.unread').style.display = 'block'
            }
        }

        messagesContainer.appendChild(messageElement)
    })
    messagesContainer.scrollTop = messagesContainer.scrollHeight
}

export async function sendMessage(text) {
    if (!currentChatId) return

    const baseUrl = window.BACKEND_URL || ''
    const response = await fetch(`${baseUrl}/chats/${currentChatId}/messages/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    })

    const result = await response.json()
    if (!result.ok) return
    await insertMessage(result.message)
}

function formatTime(isoString) {
    if (!isoString) return ""
    const date = new Date(isoString)
    if (isNaN(date)) return ""
    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    })
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
        const messagesContainer = document.querySelector('.messages-container')
        messagesContainer.scrollTop = messagesContainer.scrollHeight
    })

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            button.click()
        }
    })
}
