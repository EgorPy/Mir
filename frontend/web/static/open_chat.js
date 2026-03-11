import { sendMessage, loadMessages } from './load_messages.js';
import { adjustChatHeader } from './chat_title.js'
import { isMember } from './is_member.js'
import { fetchChatData } from './load_chats.js'
import { getChatState, setChatStateForce } from './chat_state.js';

const actualChat = document.querySelector('.actual-chat');
const chatHeader = actualChat.querySelector('#chatHeader');
const chatTitleEl = chatHeader.querySelector('.chat-title');
const closeChatBtn = chatHeader.querySelector('.close-chat-btn');
const messageInputWrapper = actualChat.querySelector('.chat-input');
const messageInput = messageInputWrapper.querySelector('.message-input');
const sendBtn = messageInputWrapper.querySelector('.send-message-btn');
const messagesContainer = actualChat.querySelector('.messages-container');

const joinChat = actualChat.querySelector('.join-chat')

let tempChatId = null;

export async function openChat(chat) {
    chatHeader.style.display = 'flex';
    chatHeader.setAttribute('data-chat-id', chat.id);

    tempChatId = chat.id

    chatTitleEl.textContent = chat.title;
    const selectChat = actualChat.querySelector('.select-chat');
    if (selectChat) selectChat.style.display = 'none';

    const isUserMember = await isMember(chat.id)
    if (isUserMember) {
        messageInputWrapper.style.display = 'flex';
        joinChat.style.display = 'none'
    } else {
        messageInputWrapper.style.display = 'none';
        joinChat.style.display = 'block'
    }

    messagesContainer.innerHTML = '';
    actualChat.dataset.chatId = chat.id;

    loadMessages(chat.id);
    adjustChatHeader();
}

async function doJoinChat() {
    const response = await fetch(`${window.BACKEND_URL}/chats/${tempChatId}/join`, {
        credentials: "include"
    })

    if (!response.ok) return
    messageInputWrapper.style.display = 'flex';
    joinChat.style.display = 'none'

    const chatObject = await fetchChatData(tempChatId);
    setChatStateForce(tempChatId, {
        id: chatObject.id,
        title: chatObject.title,
        members: chatObject.members
    });
}

joinChat.addEventListener('click', doJoinChat)

closeChatBtn.addEventListener('click', () => {
    chatHeader.style.display = 'none';
    messageInputWrapper.style.display = 'none';
    messagesContainer.innerHTML = '';

    const selectChat = actualChat.querySelector('.select-chat');
    if (selectChat) selectChat.style.display = 'block';

    delete actualChat.dataset.chatId;
});
