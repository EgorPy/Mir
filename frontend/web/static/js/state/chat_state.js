const chatStates = {}

export function setChatState(chatId, obj) {
    if (chatId in chatStates) return
    chatStates[chatId] = obj
}

export function setChatStateForce(chatId, obj) {
    chatStates[chatId] = obj
}

export function getChatState(chatId) {
    return chatStates[chatId]
}

export function getChatStates() {
    return chatStates
}
