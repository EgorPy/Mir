import chatTemplateHtml from '/pages/widgets/chat.js';
import { setupMessageInput } from '/static/chat_dialog.js';
import { BACKEND_URL } from '/static/config.js';
import { openChat } from './messages.js';
import { getChatState, setChatState, getChatStates } from './chat_state.js'

const tempDiv = document.createElement('div');
tempDiv.innerHTML = chatTemplateHtml;
const chatTemplate = tempDiv.firstElementChild;

async function loadChats() {
    try {
        const response = await fetch(`${BACKEND_URL}/chats/list`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const chats = await response.json();
        const chatsContainer = document.querySelector('.chats');
        if (!chatsContainer) return;

        const noChatsMsg = chatsContainer.querySelector('.no-chats-yet');
        const loadingMsg = chatsContainer.querySelector('.chats-loading');
        if (loadingMsg) loadingMsg.style.display = 'none';

        Array.from(chatsContainer.children).forEach(child => {
            if (!child.classList.contains('no-chats-yet') && !child.classList.contains('chats-loading')) {
                child.remove();
            }
        });

        const chatsArray = Object.values(chats);
        if (chatsArray.length === 0) {
            if (noChatsMsg) {
                noChatsMsg.style.display = 'block';
            }
            return;
        }

        if (noChatsMsg) noChatsMsg.style.display = 'none';

        chatsArray.forEach(chat => {
            if (!chatTemplate) return;

            const chatElement = chatTemplate.cloneNode(true);
            const chatId = chat.id
            chatElement.setAttribute('data-chat-id', chatId);
            chatElement.setAttribute('data-chat-title', chat.title);

            const nameElement = chatElement.querySelector('.chat-name');
            const lastMessage = chatElement.querySelector('.chat-last-message');

            if (nameElement) nameElement.textContent = chat.title;
            if (lastMessage) lastMessage.textContent = '';

            chatElement.addEventListener('click', async () => {
                console.log(getChatStates())

                let chatObject;
                chatObject = getChatState(chatId)
                if (chatObject === undefined) {
                    chatObject = await fetchChatData(chatId)
                    setChatState(chatId, {
                        "id": chatObject.id,
                        "title": chatObject.title,
                        "participants": chatObject.participants
                    })
                }
                console.log(chatObject)
                openChat(chatObject);
                document.querySelectorAll('.chat-main.selected')
                    .forEach(el => el.classList.remove('selected'));
                chatElement.classList.add('selected');
            });

            chatsContainer.appendChild(chatElement);
        });

        setupMessageInput();

    } catch (error) {
        console.error('Error loading chats:', error);
        const chatsContainer = document.querySelector('.chats');
        const loadingMsg = chatsContainer?.querySelector('.chats-loading');
        if (loadingMsg) {
            loadingMsg.textContent = 'Ошибка загрузки чатов';
        }
    }
}

async function fetchChatData(chatId) {
    const response = await fetch(`${BACKEND_URL}/chats/${chatId}/info`, {
        method: 'GET',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'}
    })
    return response.json()
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadChats();
});