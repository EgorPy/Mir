import chatTemplateHtml from '/pages/widgets/chat.js';
import { setupMessageInput } from '/static/chat_dialog.js';
import { BACKEND_URL } from '/static/config.js';
import { openChat } from './messages.js';
import { getChatState, setChatState } from './chat_state.js';

const tempDiv = document.createElement('div');
tempDiv.innerHTML = chatTemplateHtml;
const chatTemplate = tempDiv.firstElementChild;

export async function fetchChats() {
    const response = await fetch(`${BACKEND_URL}/chats/list`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

async function fetchChatData(chatId) {
    const response = await fetch(`${BACKEND_URL}/chats/${chatId}/info`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

export function renderChats(chats, {
    container,
    emptyElement,
    loadingElement
}) {
    if (!container || !chatTemplate) return;

    const chatsArray = Object.values(chats);

    Array.from(container.children).forEach(child => {
        if (child !== loadingElement) {
            child.style.display = "none";
        }
    });

    Array.from(container.querySelectorAll('.chat-main')).forEach(chat => {
        chat.remove();
    });

    if (loadingElement) {
        loadingElement.style.display = "none";
    }

    if (chatsArray.length === 0) {
        if (emptyElement) emptyElement.style.display = "block";
        return;
    }

    const fragment = document.createDocumentFragment();

    chatsArray.forEach(chat => {
        const chatElement = chatTemplate.cloneNode(true);

        chatElement.setAttribute('data-chat-id', chat.id);
        chatElement.setAttribute('data-chat-title', chat.title);

        const nameElement = chatElement.querySelector('.chat-name');
        const lastMessage = chatElement.querySelector('.chat-last-message');

        if (nameElement) nameElement.textContent = chat.title;
        if (lastMessage) lastMessage.textContent = '';

        fragment.appendChild(chatElement);
    });

    container.appendChild(fragment);
}

function attachChatHandlers() {
    const chatsContainer = document.querySelector('#chats');
    if (!chatsContainer) return;

    chatsContainer.addEventListener('click', async (e) => {
        const chatElement = e.target.closest('.chat-main');
        if (!chatElement) return;

        const chatId = chatElement.getAttribute('data-chat-id');
        if (!chatId) return;

        let chatObject = getChatState(chatId);

        if (chatObject === undefined) {
            chatObject = await fetchChatData(chatId);
            setChatState(chatId, {
                id: chatObject.id,
                title: chatObject.title,
                members: chatObject.members
            });
        }

        openChat(chatObject);

        document
            .querySelectorAll('.chat-main.selected')
            .forEach(el => el.classList.remove('selected'));

        chatElement.classList.add('selected');
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const chats = await fetchChats();
        renderChats(chats, {
            container: document.querySelector('#chats'),
            emptyElement: document.querySelector('.no-chats-yet'),
            loadingElement: document.querySelector('.chats-loading')
        });
        attachChatHandlers();
        setupMessageInput();
    } catch (error) {
        console.error('Error loading chats:', error);

        const chatsContainer = document.querySelector('#chats');
        const loadingMsg = chatsContainer?.querySelector('.chats-loading');

        if (loadingMsg) {
            loadingMsg.textContent = 'Ошибка загрузки чатов';
        }
    }
});
