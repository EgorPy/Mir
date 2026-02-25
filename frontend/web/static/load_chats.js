import chatTemplateHtml from '/pages/widgets/chat.js';
import { setupChatClickHandlers } from '/static/chat_dialog.js';
import { BACKEND_URL } from '/static/config.js'

const tempDiv = document.createElement('div');
tempDiv.innerHTML = chatTemplateHtml;
const chatTemplate = tempDiv.firstElementChild;

if (!chatTemplate) {
    console.error('Failed to create chat template from:', chatTemplateHtml);
}

async function loadChats() {
    try {
        const response = await fetch(`${BACKEND_URL}/chats/list`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const chats = await response.json();

        const chatsContainer = document.querySelector('.chats');
        if (!chatsContainer) {
            console.error('Chats container not found');
            return;
        }

        const noChatsMsg = chatsContainer.querySelector('.no-chats-yet');
        const loadingMsg = chatsContainer.querySelector('.chats-loading');

        if (loadingMsg) loadingMsg.style.display = 'none';

        Array.from(chatsContainer.children).forEach(child => {
            if (!child.classList.contains('no-chats-yet') &&
            !child.classList.contains('chats-loading')) {
                child.remove();
            }
        });

        const chatsArray = Object.values(chats);

        if (chatsArray.length === 0) {
            if (noChatsMsg) {
                noChatsMsg.style.display = 'block';
                noChatsMsg.textContent = 'У вас пока нет чатов, вы можете начать общение с людьми из ваших контактов.';
            }
            return;
        }

        if (noChatsMsg) noChatsMsg.style.display = 'none';

        chatsArray.forEach(chat => {
            if (!chatTemplate) {
                console.error('Chat template is not available');
                return;
            }

            const chatElement = chatTemplate.cloneNode(true);
            chatElement.setAttribute('data-chat-id', chat.id);
            const nameElement = chatElement.querySelector('.chat-name');
            const lastMessage = chatElement.querySelector('.chat-last-message');

            if (nameElement) nameElement.textContent = chat.title;
            if (lastMessage) lastMessage.textContent = '';

            chatsContainer.appendChild(chatElement);
        });

        setupChatClickHandlers();
    } catch (error) {
        console.error('Error loading chats:', error);
        const chatsContainer = document.querySelector('.chats');
        const loadingMsg = chatsContainer?.querySelector('.chats-loading');
        if (loadingMsg) {
            loadingMsg.textContent = 'Ошибка загрузки чатов';
            loadingMsg.style.color = '#ff4444';
        }
    }
}

async function createChat(title) {
    try {
        const response = await fetch(`${window.BACKEND_URL || ''}/chats/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title })
        });

        const result = await response.json();
        if (result.ok) {
            await loadChats();
        }
        return result;
    } catch (error) {
        console.error('Error creating chat:', error);
    }
}

async function deleteChat(chatId) {
    try {
        const response = await fetch(`${window.BACKEND_URL || ''}/chats/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ chat_id: chatId })
        });

        const result = await response.json();
        if (result.ok) {
            await loadChats();
        }
        return result;
    } catch (error) {
        console.error('Error deleting chat:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadChats();
});