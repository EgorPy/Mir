import { loadMessages, closeMessageSocket } from '/static/load_messages.js';
import { adjustChatHeader } from '/static/chat_title.js';
import { isMember } from '/static/is_member.js';
import { fetchChatData } from '/static/load_chats.js';
import { setChatStateForce } from '/static/chat_state.js';
import { apiFetchJson } from '/static/api_client.js';

const actualChat = document.querySelector('.actual-chat');
const chatHeader = actualChat?.querySelector('.chat-header');
const chatTitleEl = chatHeader?.querySelector('.chat-title');
const closeChatBtn = chatHeader?.querySelector('.close-chat-btn');
const messageInputWrapper = actualChat?.querySelector('.chat-input');
const messagesContainer = actualChat?.querySelector('.messages-container');
const joinChatBtn = actualChat?.querySelector('.join-chat');
const chatAvatar = chatHeader?.querySelector('.chat-avatar');

let selectedChatId = null;

function normalizeHeaderTitle(chat) {
    const rawTitle = String(chat?.title || '').trim();
    const chatType = String(chat?.type || '').toLowerCase();

    if (chatType === 'private') {
        const noPrefix = rawTitle.replace(/^DM:\s*/i, '').trim();
        return noPrefix || 'Direct chat';
    }

    return rawTitle || 'Chat';
}

function applyChatHeader(chat) {
    if (!chatHeader) {
        return;
    }

    selectedChatId = String(chat.id);
    chatHeader.style.display = 'flex';
    chatHeader.dataset.chatId = selectedChatId;

    if (chatTitleEl) {
        chatTitleEl.textContent = normalizeHeaderTitle(chat);
    }

    if (chatAvatar) {
        chatAvatar.src = chat.avatar || chat.avatar_url || '../static/favicon.ico';
        chatAvatar.onerror = () => {
            chatAvatar.src = '../static/favicon.ico';
            chatAvatar.onerror = null;
        };
    }
}

export async function openChat(chat) {
    if (!actualChat || !chatHeader || !messageInputWrapper || !messagesContainer || !joinChatBtn) {
        return;
    }

    applyChatHeader(chat);

    const selectChatLabel = actualChat.querySelector('.select-chat');
    if (selectChatLabel) {
        selectChatLabel.style.display = 'none';
    }

    const member = await isMember(selectedChatId);
    if (!member) {
        messageInputWrapper.style.display = 'none';
        joinChatBtn.style.display = 'block';
        messagesContainer.innerHTML = '';
        actualChat.dataset.chatId = selectedChatId;

        const noMessages = actualChat.querySelector('.no-messages-yet');
        if (noMessages) {
            noMessages.style.display = 'none';
        }

        closeMessageSocket();
        adjustChatHeader();
        return;
    }

    messageInputWrapper.style.display = 'flex';
    joinChatBtn.style.display = 'none';

    messagesContainer.innerHTML = '';
    actualChat.dataset.chatId = selectedChatId;

    await loadMessages(selectedChatId);
    adjustChatHeader();
}

export function getSelectedChatId() {
    return selectedChatId;
}

export async function refreshOpenedChat() {
    if (!selectedChatId) {
        return;
    }

    const chatObject = await fetchChatData(selectedChatId, { forceRefresh: true });

    setChatStateForce(selectedChatId, {
        id: chatObject.id,
        title: chatObject.title,
        members: chatObject.members,
        type: chatObject.type,
        avatar: chatObject.avatar,
        author: chatObject.author
    });

    await openChat(chatObject);
}

export function closeChatView() {
    if (!actualChat || !chatHeader || !messageInputWrapper || !messagesContainer) {
        return;
    }

    chatHeader.style.display = 'none';
    messageInputWrapper.style.display = 'none';
    messagesContainer.innerHTML = '';

    const noMessages = actualChat.querySelector('.no-messages-yet');
    if (noMessages) {
        noMessages.style.display = 'none';
    }

    const selectChatLabel = actualChat.querySelector('.select-chat');
    if (selectChatLabel) {
        selectChatLabel.style.display = 'flex';
    }

    const actions = actualChat.querySelector('.message-actions');
    if (actions) {
        actions.style.display = 'none';
    }

    delete actualChat.dataset.chatId;
    selectedChatId = null;

    document.querySelectorAll('.chat-main.selected').forEach((node) => {
        node.classList.remove('selected');
    });

    closeMessageSocket();
}

async function joinChat() {
    if (!selectedChatId) {
        return;
    }

    await apiFetchJson(`/chats/${selectedChatId}/join/`, {
        method: 'GET'
    });

    if (messageInputWrapper && joinChatBtn) {
        messageInputWrapper.style.display = 'flex';
        joinChatBtn.style.display = 'none';
    }

    const chatObject = await fetchChatData(selectedChatId, { forceRefresh: true });
    setChatStateForce(selectedChatId, {
        id: chatObject.id,
        title: chatObject.title,
        members: chatObject.members,
        type: chatObject.type,
        avatar: chatObject.avatar,
        author: chatObject.author
    });

    await loadMessages(selectedChatId);
}

if (joinChatBtn) {
    joinChatBtn.addEventListener('click', joinChat);
}

if (closeChatBtn) {
    closeChatBtn.addEventListener('click', closeChatView);
}
