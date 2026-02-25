import { sendMessage, loadMessages } from './chat_dialog.js';
import { adjustChatHeader } from './chat_title.js'

const actualChat = document.querySelector('.actual-chat');
const chatHeader = actualChat.querySelector('.chat-header');
const chatTitleEl = chatHeader.querySelector('.chat-title');
const closeChatBtn = chatHeader.querySelector('.close-chat-btn');
const messageInputWrapper = actualChat.querySelector('.chat-input');
const messageInput = messageInputWrapper.querySelector('.message-input');
const sendBtn = messageInputWrapper.querySelector('.send-message-btn');
const messagesContainer = actualChat.querySelector('.messages-container');

export function openChat(chatId, title) {
    chatHeader.style.display = 'flex';
    messageInputWrapper.style.display = 'flex';
    chatTitleEl.textContent = title;

    const selectChat = actualChat.querySelector('.select-chat');
    if (selectChat) selectChat.style.display = 'none';

    messagesContainer.innerHTML = '';
    actualChat.dataset.chatId = chatId;

    loadMessages(chatId);
    adjustChatHeader();
}

closeChatBtn.addEventListener('click', () => {
    chatHeader.style.display = 'none';
    messageInputWrapper.style.display = 'none';
    messagesContainer.innerHTML = '';

    const selectChat = actualChat.querySelector('.select-chat');
    if (selectChat) selectChat.style.display = 'block';

    delete actualChat.dataset.chatId;
});
