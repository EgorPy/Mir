import { wsSend } from '/static/websockets.js'
import { getUserId } from '/static/get_user_id.js'

const container = document.querySelector('.messages-container')
const messageOptions = document.querySelector("#messageOptions")
const deleteMessagesBtn = document.querySelector("#deleteMessages")
const forwardMessagesBtn = document.querySelector("#forwardMessages")
const chatHeader = document.querySelector('#chatHeader');

let selecting = false

let selectedMessages = new Set()
let dragVisited = new Set()
let userId = null

async function initUserId() {
    userId = String(await getUserId())
}

initUserId()

function canDeleteSelected() {
    for (const id of selectedMessages) {
        const messageEl = document.querySelector(`.message[data-message-id="${id}"]`)
        if (!messageEl) continue
        if (messageEl.dataset.authorId !== userId) {
            return false
        }
    }
    return true
}

async function deleteMessages() {
    const chatId = chatHeader?.dataset.chatId
    if (!canDeleteSelected()) return

    wsSend({
        type: "delete_messages",
        chat_id: chatId,
        messages: [...selectedMessages]
    })

    selectedMessages.forEach(id => {
        const el = document.querySelector(`.message[data-message-id="${id}"]`)
        if (el) el.remove()
    })

    selectedMessages.clear()
    updateHeader()
}

function getMessageFromEvent(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY)
    return el?.closest('.message')
}

function updateHeader() {
    if (selectedMessages.size > 0) {
        messageOptions.style.display = "flex"
    } else {
        messageOptions.style.display = "none"
    }

    if (canDeleteSelected()) {
        deleteMessagesBtn.style.display = "block"
    } else {
        deleteMessagesBtn.style.display = "none"
    }
}

function toggleMessage(message) {
    if (!message) return

    const id = message.dataset.messageId

    if (dragVisited.has(id)) return
    dragVisited.add(id)

    if (selectedMessages.has(id)) {
        selectedMessages.delete(id)
        message.classList.remove('selected')
    } else {
        selectedMessages.add(id)
        message.classList.add('selected')
    }

    updateHeader()
}

container.addEventListener('mousedown', e => {
    selecting = true
    dragVisited.clear()

    const message = e.target.closest('.message')
    toggleMessage(message)
})

document.addEventListener('mousemove', e => {
    if (!selecting) return

    const message = getMessageFromEvent(e)

    if (message && container.contains(message)) {
        toggleMessage(message)
    }
})

document.addEventListener('mouseup', () => {
    selecting = false
})

deleteMessagesBtn.addEventListener("click", deleteMessages)
