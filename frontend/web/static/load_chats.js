import chatTemplateHtml from '/pages/widgets/chat.js';
import { openChat } from '/static/open_chat.js';
import { setupMessageInput } from '/static/load_messages.js';
import { getChatState, setChatState } from '/static/chat_state.js';
import { apiFetchJson } from '/static/api_client.js';

const tempDiv = document.createElement('div');
tempDiv.innerHTML = chatTemplateHtml;
const chatTemplate = tempDiv.firstElementChild;

const DEFAULT_AVATAR = '../static/favicon.ico';
let chatHandlersAttached = false;
let initialChatOpened = false;

function normalizeChatTitle(chat) {
    const rawTitle = String(chat?.title || '').trim();
    const chatType = String(chat?.type || '').toLowerCase();

    if (chatType === 'private') {
        const noPrefix = rawTitle.replace(/^DM:\s*/i, '').trim();
        return noPrefix || 'Direct chat';
    }

    return rawTitle || 'Chat';
}

function normalizeChatObject(chat) {
    return {
        ...(chat || {}),
        title: normalizeChatTitle(chat)
    };
}

function chatTypeLabel(chatType) {
    if (chatType === 'channel') {
        return 'Channel';
    }

    if (chatType === 'private') {
        return 'Direct';
    }

    if (chatType === 'favorites') {
        return 'Favorites';
    }

    return '';
}

export async function fetchChats(options = {}) {
    return await apiFetchJson('/chats/list', {
        method: 'GET',
        cacheTtlMs: 5000,
        forceRefresh: Boolean(options.forceRefresh)
    });
}

export async function fetchChatData(chatId, options = {}) {
    const chat = await apiFetchJson(`/chats/${chatId}/info`, {
        method: 'GET',
        cacheTtlMs: 5000,
        forceRefresh: Boolean(options.forceRefresh)
    });

    return normalizeChatObject(chat);
}

export async function startDirectByEmail(email) {
    const payload = await apiFetchJson('/chats/direct/start', {
        method: 'POST',
        body: JSON.stringify({ email })
    });

    return normalizeChatObject(payload.chat);
}

export function renderChats(chats, { container, emptyElement, loadingElement }) {
    if (!container || !chatTemplate) {
        return;
    }

    const items = Object.values(chats || {}).map((chat) => normalizeChatObject(chat));

    Array.from(container.children).forEach((child) => {
        if (child !== loadingElement && child !== emptyElement) {
            child.style.display = 'none';
        }
    });

    Array.from(container.querySelectorAll('.chat-main')).forEach((node) => {
        node.remove();
    });

    if (loadingElement) {
        loadingElement.style.display = 'none';
    }

    if (items.length === 0) {
        if (emptyElement) {
            emptyElement.style.display = 'block';
        }
        return;
    }

    if (emptyElement) {
        emptyElement.style.display = 'none';
    }

    const fragment = document.createDocumentFragment();

    items.forEach((chat) => {
        const card = chatTemplate.cloneNode(true);

        card.setAttribute('data-chat-id', String(chat.id));
        card.setAttribute('data-chat-type', String(chat.type || 'group'));
        card.setAttribute('data-chat-title', String(chat.title || 'Chat'));
        if (chat.public_id) {
            card.setAttribute('data-chat-public-id', String(chat.public_id));
        }

        const nameEl = card.querySelector('.chat-name');
        const subtitleEl = card.querySelector('.chat-last-message');
        const avatarEl = card.querySelector('.chat-avatar-item');
        const badgeEl = card.querySelector('.chat-type-badge');

        if (nameEl) {
            nameEl.textContent = chat.title || 'Chat';
        }

        if (subtitleEl) {
            if (chat.type === 'channel') {
                subtitleEl.textContent = 'Broadcast channel';
            } else if (chat.type === 'private') {
                subtitleEl.textContent = 'Private dialog';
            } else if (chat.type === 'favorites') {
                subtitleEl.textContent = 'Saved messages';
            } else {
                subtitleEl.textContent = '';
            }
        }

        if (avatarEl) {
            avatarEl.src = chat.avatar_url || DEFAULT_AVATAR;
            avatarEl.onerror = () => {
                avatarEl.src = DEFAULT_AVATAR;
                avatarEl.onerror = null;
            };
        }

        if (badgeEl) {
            const label = chatTypeLabel(chat.type);
            badgeEl.textContent = label;
            badgeEl.style.display = label ? 'inline-block' : 'none';
        }

        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

export function attachChatHandlers() {
    if (chatHandlersAttached) {
        return;
    }

    const chatsContainer = document.querySelector('#chats');
    if (!chatsContainer) {
        return;
    }

    chatHandlersAttached = true;

    chatsContainer.addEventListener('click', async (event) => {
        const chatElement = event.target.closest('.chat-main');
        if (!chatElement) {
            return;
        }

        let chatId = chatElement.getAttribute('data-chat-id');
        const chatType = chatElement.getAttribute('data-chat-type');

        if (!chatId) {
            return;
        }

        if (chatType === 'user') {
            const email = chatElement.getAttribute('data-chat-public-id');
            if (!email) {
                return;
            }

            const directChat = await startDirectByEmail(email);
            if (!directChat || !directChat.id) {
                return;
            }

            chatId = String(directChat.id);
            await loadChats({ forceRefresh: true });
        }

        let chatObject = getChatState(chatId);
        if (!chatObject) {
            chatObject = await fetchChatData(chatId, { forceRefresh: true });
            setChatState(chatId, {
                id: chatObject.id,
                title: chatObject.title,
                members: chatObject.members,
                type: chatObject.type,
                avatar: chatObject.avatar,
                author: chatObject.author
            });
        }

        await openChat(chatObject);

        document.querySelectorAll('.chat-main.selected').forEach((el) => {
            el.classList.remove('selected');
        });

        const selectedNode = document.querySelector(`.chat-main[data-chat-id="${chatId}"]`);
        if (selectedNode) {
            selectedNode.classList.add('selected');
        }
    });
}

async function openInitialChat() {
    if (initialChatOpened) {
        return;
    }

    const container = document.querySelector('#chats');
    if (!container) {
        return;
    }

    const target = container.querySelector('.chat-main[data-chat-type="favorites"]')
        || container.querySelector('.chat-main');

    if (!target) {
        return;
    }

    initialChatOpened = true;
    target.click();
}

export async function loadChats(options = {}) {
    const chats = await fetchChats(options);
    renderChats(chats, {
        container: document.querySelector('#chats'),
        emptyElement: document.querySelector('.no-chats-yet'),
        loadingElement: document.querySelector('.chats-loading')
    });

    return chats;
}

window.loadChats = loadChats;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        attachChatHandlers();
        setupMessageInput();
        await loadChats();
        await openInitialChat();
    } catch (error) {
        console.error('Error loading chats:', error);
        const loadingEl = document.querySelector('.chats-loading');
        if (loadingEl) {
            loadingEl.textContent = 'Failed to load chats';
        }
    }
});
