import messageTemplateHtml from '/pages/widgets/message.js';

const tempDiv = document.createElement('div');
tempDiv.innerHTML = messageTemplateHtml;
const messageTemplate = tempDiv.firstElementChild;

let currentChatId = null;

export async function loadMessages(chatId) {
    try {
        currentChatId = chatId;

        const baseUrl = window.BACKEND_URL || '';
        const response = await fetch(`${baseUrl}/chats/${chatId}/messages`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const messages = await response.json();
        console.log('Messages loaded:', messages);

        const actualChat = document.querySelector('.actual-chat');
        if (!actualChat) return;

        Array.from(actualChat.children).forEach(child => {
            if (!child.classList.contains('select-chat')) {
                child.remove();
            }
        });

        const selectChat = actualChat.querySelector('.select-chat');
        if (selectChat) selectChat.style.display = 'none';

        messages.forEach(msg => {
            const messageElement = messageTemplate.cloneNode(true);

            const authorEl = messageElement.querySelector('.message-author');
            const timeEl = messageElement.querySelector('.message-time');
            const textEl = messageElement.querySelector('.message-text');
            const avatarEl = messageElement.querySelector('.message-avatar img');

            if (authorEl) authorEl.textContent = msg.author;
            if (timeEl) timeEl.textContent = formatTime(msg.time);
            if (textEl) textEl.textContent = msg.text;
            if (avatarEl) avatarEl.alt = msg.author;

            actualChat.appendChild(messageElement);
        });

        actualChat.scrollTop = actualChat.scrollHeight;

    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

export async function sendMessage(text) {
    if (!currentChatId) {
        console.error('No chat selected');
        return;
    }

    try {
        const baseUrl = window.BACKEND_URL || '';
        const response = await fetch(`${baseUrl}/chats/${chatId}/messages/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: currentChatId,
                text: text,
                author: 'Я'
            })
        });

        const result = await response.json();
        if (result.ok) {
            await loadMessages(currentChatId);
        }
        return result;
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function setupChatClickHandlers() {
    document.querySelector('.chats').addEventListener('click', (e) => {
        const chatElement = e.target.closest('.chat-main');
        if (!chatElement) return;

        const chatId = chatElement.dataset.chatId;
        console.log(chatId);
        if (chatId) {
            document.querySelectorAll('.chat.selected').forEach(el => {
                el.classList.remove('selected');
            });

            chatElement.classList.add('selected');

            loadMessages(chatId);
        }
    });
}