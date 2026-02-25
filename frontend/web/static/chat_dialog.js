import messageTemplateHtml from '/pages/widgets/message.js';

const tempDiv = document.createElement('div');
tempDiv.innerHTML = messageTemplateHtml;
const messageTemplate = tempDiv.firstElementChild;

let currentChatId = null;
let inputInitialized = false;

export async function loadMessages(chatId) {
    currentChatId = chatId;

    const messagesContainer = document.querySelector('.messages-container');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';

    try {
        const baseUrl = window.BACKEND_URL || '';
        const response = await fetch(`${baseUrl}/chats/${chatId}/messages`);

        if (!response.ok) throw new Error(`HTTP error ${response.status}`);

        const messages = await response.json();

        messages.forEach(msg => {
            const messageElement = messageTemplate.cloneNode(true);
            messageElement.querySelector('.message-author').textContent = msg.author;
            messageElement.querySelector('.message-date').textContent = formatTime(msg.created_at);
            messageElement.querySelector('.message-text').textContent = msg.text;
            messagesContainer.appendChild(messageElement);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

export async function sendMessage(text) {
    if (!currentChatId) return;

    try {
        const baseUrl = window.BACKEND_URL || '';
        const response = await fetch(`${baseUrl}/chats/${currentChatId}/messages/send`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, author: 'Я' })
        });

        const result = await response.json();
        if (result.ok) {
            await loadMessages(currentChatId);
        }

    } catch (error) {
        console.error('Error sending message:', error);
    }
}

function formatTime(isoString) {
    if (!isoString) return "";

    const date = new Date(isoString);

    if (isNaN(date)) return "";

    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}


export function setupMessageInput() {
    if (inputInitialized) return;
    inputInitialized = true;

    const input = document.querySelector('.message-input');
    const button = document.querySelector('.send-message-btn');
    if (!input || !button) return;

    button.addEventListener('click', async () => {
        const text = input.value.trim();
        if (!text) return;
        await sendMessage(text);
        input.value = '';
        const messagesContainer = document.querySelector('.messages-container');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            button.click();
        }
    });
}