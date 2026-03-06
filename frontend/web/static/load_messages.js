
import messageTemplateHtml from '/pages/widgets/message.js';
import { apiFetchJson, backendUrl, getCurrentUserId } from '/static/api_client.js';

const tempDiv = document.createElement('div');
tempDiv.innerHTML = messageTemplateHtml;
const messageTemplate = tempDiv.firstElementChild;

const noMessagesYet = document.querySelector('.no-messages-yet');
const messagesContainer = document.querySelector('.messages-container');
const actionsPanel = document.querySelector('.message-actions');
const selectedCount = document.querySelector('.message-actions-count');
const clearSelectedBtn = document.querySelector('.message-action-clear');
const deleteSelectedBtn = document.querySelector('.message-action-delete');
const forwardSelectedBtn = document.querySelector('.message-action-forward');
const favoriteSelectedBtn = document.querySelector('.message-action-favorite');

const messageInput = document.querySelector('.message-input');
const sendButton = document.querySelector('.send-message-btn');
const messageTypeSelect = document.querySelector('.message-type-select');
const messageMediaInput = document.querySelector('.message-media-input');

const selectedMessageIds = new Set();
const rightDragVisitedIds = new Set();

let inputInitialized = false;
let pointerSelectionListenersBound = false;
let currentChatId = null;
let wsConnection = null;
let wsChatId = null;
let wsReconnectTimer = null;
let wsPingTimer = null;
let wsManualClose = false;
let me = null;
let forwardSelectionHandler = null;
let contextMenu = null;
let isRightDragSelecting = false;
let rightDragSelectionMoved = false;
let suppressNextContextMenu = false;
let messagesLoadToken = 0;

const WS_RECONNECT_DELAY_MS = 1500;
const WS_PING_INTERVAL_MS = 25000;

function detectMediaTypeFromUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) {
        return null;
    }

    let parsedUrl = null;
    try {
        parsedUrl = new URL(raw);
    } catch {
        return null;
    }

    const path = (parsedUrl.pathname || '').toLowerCase();

    if (/\.(png|jpe?g|webp|bmp|svg)$/i.test(path)) {
        return 'photo';
    }

    if (/\.gif$/i.test(path)) {
        return 'gif';
    }

    if (/\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(path)) {
        return 'video';
    }

    if (/\.(mp3|wav|ogg|m4a|aac|flac|opus|weba|oga)$/i.test(path)) {
        return 'music';
    }

    return null;
}

function wsUrlForChat(chatId) {
    const base = backendUrl();
    const wsBase = base.startsWith('https://')
        ? base.replace('https://', 'wss://')
        : base.replace('http://', 'ws://');

    return `${wsBase}/chats/${chatId}/ws`;
}

function clearWsTimers() {
    if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
    }

    if (wsPingTimer) {
        clearInterval(wsPingTimer);
        wsPingTimer = null;
    }
}

function closeSocketInternal(manual = true) {
    wsManualClose = manual;
    clearWsTimers();

    if (!wsConnection) {
        wsChatId = null;
        return;
    }

    const socket = wsConnection;
    wsConnection = null;
    wsChatId = null;

    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
    }
}

function updateSelectionUi() {
    if (!actionsPanel || !selectedCount) {
        return;
    }

    const count = selectedMessageIds.size;
    selectedCount.textContent = `${count} selected`;
    actionsPanel.style.display = count > 0 ? 'flex' : 'none';

    const selectionMode = count > 0;
    if (messageInput) {
        messageInput.disabled = selectionMode;
    }

    if (messageMediaInput) {
        messageMediaInput.disabled = selectionMode;
    }

    if (messageTypeSelect) {
        messageTypeSelect.disabled = selectionMode;
    }

    if (sendButton) {
        sendButton.disabled = selectionMode;
    }
}

function clearSelection() {
    selectedMessageIds.clear();

    if (messagesContainer) {
        messagesContainer.querySelectorAll('.message.selected').forEach((node) => {
            node.classList.remove('selected');
        });
    }

    updateSelectionUi();
}

function toggleSelection(messageId, selected = null) {
    if (!messagesContainer) {
        return;
    }

    const id = String(messageId);
    const node = messagesContainer.querySelector(`.message[data-message-id="${id}"]`);
    if (!node) {
        return;
    }

    const targetState = selected === null ? !selectedMessageIds.has(id) : selected;

    if (targetState) {
        selectedMessageIds.add(id);
        node.classList.add('selected');
    } else {
        selectedMessageIds.delete(id);
        node.classList.remove('selected');
    }

    updateSelectionUi();
}

function hideContextMenu() {
    if (!contextMenu) {
        return;
    }

    contextMenu.style.display = 'none';
    contextMenu.dataset.messageId = '';
}

function ensureContextMenu() {
    if (contextMenu) {
        return;
    }

    const root = document.createElement('div');
    root.className = 'message-context-menu';
    root.style.display = 'none';
    root.innerHTML = '<button type="button" class="message-context-menu-item"></button>';

    const item = root.querySelector('.message-context-menu-item');
    item.addEventListener('click', () => {
        const messageId = root.dataset.messageId;
        if (!messageId) {
            hideContextMenu();
            return;
        }

        toggleSelection(messageId);
        hideContextMenu();
    });

    document.body.appendChild(root);
    contextMenu = root;

    document.addEventListener('click', (event) => {
        if (!contextMenu || !contextMenu.contains(event.target)) {
            hideContextMenu();
        }
    });

    document.addEventListener('scroll', hideContextMenu, true);
}

function showContextMenu(messageId, x, y) {
    ensureContextMenu();

    if (!contextMenu) {
        return;
    }

    const item = contextMenu.querySelector('.message-context-menu-item');
    item.textContent = selectedMessageIds.has(String(messageId)) ? 'Unselect message' : 'Select message';

    contextMenu.dataset.messageId = String(messageId);
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.style.display = 'block';
}
function messageIdAtPoint(clientX, clientY) {
    const node = document.elementFromPoint(clientX, clientY);
    const messageNode = node?.closest('.message[data-message-id]');

    if (!messageNode) {
        return null;
    }

    return String(messageNode.dataset.messageId || '');
}

function beginRightDragSelection(initialMessageId = null) {
    isRightDragSelecting = true;
    rightDragSelectionMoved = false;
    rightDragVisitedIds.clear();
    hideContextMenu();

    if (initialMessageId) {
        rightDragVisitedIds.add(String(initialMessageId));
        toggleSelection(String(initialMessageId), true);
    }
}

function updateRightDragSelection(clientX, clientY) {
    if (!isRightDragSelecting) {
        return;
    }

    const messageId = messageIdAtPoint(clientX, clientY);
    if (!messageId) {
        return;
    }

    if (rightDragVisitedIds.has(messageId)) {
        return;
    }

    rightDragVisitedIds.add(messageId);
    rightDragSelectionMoved = true;
    toggleSelection(messageId, true);
}

function finishRightDragSelection() {
    if (!isRightDragSelecting) {
        return;
    }

    suppressNextContextMenu = rightDragSelectionMoved;
    isRightDragSelecting = false;
    rightDragSelectionMoved = false;
    rightDragVisitedIds.clear();
}

function bindPointerSelectionListeners() {
    if (pointerSelectionListenersBound) {
        return;
    }

    pointerSelectionListenersBound = true;

    document.addEventListener('pointermove', (event) => {
        if (!isRightDragSelecting) {
            return;
        }

        if ((event.buttons & 2) === 0) {
            finishRightDragSelection();
            return;
        }

        updateRightDragSelection(event.clientX, event.clientY);
        event.preventDefault();
    });

    document.addEventListener('pointerup', (event) => {
        if (event.button === 2) {
            finishRightDragSelection();
        }
    });

    document.addEventListener('contextmenu', (event) => {
        if (isRightDragSelecting) {
            event.preventDefault();
        }
    });

    if (messagesContainer) {
        messagesContainer.addEventListener('pointerdown', (event) => {
            if (event.button !== 2) {
                return;
            }

            if (event.target.closest('.message')) {
                return;
            }

            event.preventDefault();
            beginRightDragSelection(null);
            updateRightDragSelection(event.clientX, event.clientY);
        });
    }
}

function mapMessageTypeLabel(kind) {
    const map = {
        text: '',
        photo: 'Photo',
        video: 'Video',
        gif: 'GIF',
        voice: 'Voice',
        music: 'Music',
        file: 'File'
    };

    return map[kind] ?? kind;
}

function renderMedia(message, container) {
    let type = message.message_type || 'text';
    let url = (message.media_url || '').trim();
    const rawText = String(message.text || '');
    const text = rawText.trim();

    if (!url && text) {
        const detected = detectMediaTypeFromUrl(text);
        if (detected) {
            url = text;
            if (type === 'text') {
                type = detected;
            }
        }
    }

    container.innerHTML = '';

    const shouldRenderText = rawText && !(url && text && text === url);
    if (shouldRenderText) {
        const textNode = document.createElement('div');
        textNode.className = 'message-text-content';
        textNode.textContent = rawText;
        container.appendChild(textNode);
    }

    if (!url || type === 'text' || message.is_deleted) {
        return;
    }

    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'message-media-wrap';

    if (type === 'photo' || type === 'gif') {
        const image = document.createElement('img');
        image.className = 'message-media message-media-image';
        image.src = url;
        image.alt = type;
        image.loading = 'lazy';
        mediaWrap.appendChild(image);
    } else if (type === 'video') {
        const video = document.createElement('video');
        video.className = 'message-media message-media-video';
        video.src = url;
        video.controls = true;
        video.preload = 'metadata';
        mediaWrap.appendChild(video);
    } else if (type === 'voice' || type === 'music') {
        const audio = document.createElement('audio');
        audio.className = 'message-media message-media-audio';
        audio.src = url;
        audio.controls = true;
        audio.preload = 'metadata';
        mediaWrap.appendChild(audio);
    } else {
        const file = document.createElement('a');
        file.className = 'message-media-file-link';
        file.href = url;
        file.target = '_blank';
        file.rel = 'noopener noreferrer';
        file.textContent = 'Open attachment';
        mediaWrap.appendChild(file);
    }

    if (type !== 'file') {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open original';
        link.className = 'message-media-link';
        mediaWrap.appendChild(link);
    }

    container.appendChild(mediaWrap);
}

function attachMessageHandlers(messageNode, message) {
    const id = String(message.id);

    messageNode.addEventListener('click', (event) => {
        hideContextMenu();

        if (selectedMessageIds.size > 0) {
            event.preventDefault();
            toggleSelection(id);
        }
    });

    messageNode.addEventListener('contextmenu', (event) => {
        if (suppressNextContextMenu) {
            suppressNextContextMenu = false;
            event.preventDefault();
            return;
        }

        event.preventDefault();
        showContextMenu(id, event.clientX, event.clientY);
    });

    messageNode.addEventListener('pointerdown', (event) => {
        if (event.button !== 2) {
            return;
        }

        event.preventDefault();
        beginRightDragSelection(id);
        updateRightDragSelection(event.clientX, event.clientY);
    });
}
function scheduleReconnect(chatId) {
    clearWsTimers();

    wsReconnectTimer = setTimeout(async () => {
        if (!currentChatId || String(currentChatId) !== String(chatId)) {
            return;
        }

        await connectSocket(chatId);
    }, WS_RECONNECT_DELAY_MS);
}

async function connectSocket(chatId) {
    const targetChatId = String(chatId);

    if (
        wsConnection
        && wsChatId === targetChatId
        && (wsConnection.readyState === WebSocket.OPEN || wsConnection.readyState === WebSocket.CONNECTING)
    ) {
        return;
    }

    if (wsConnection && wsChatId !== targetChatId) {
        closeSocketInternal(true);
    }

    let url = wsUrlForChat(targetChatId);

    try {
        const ticketResponse = await apiFetchJson(`/chats/${targetChatId}/ws-ticket`, {
            method: 'POST'
        });

        if (ticketResponse?.ticket) {
            const ticket = encodeURIComponent(String(ticketResponse.ticket));
            url = `${url}?ticket=${ticket}`;
        }
    } catch (error) {
        const errorText = String(error?.message || '').toLowerCase();
        if (
            errorText === '401'
            || errorText === '403'
            || errorText.includes('invalid or expired session')
            || errorText.includes('no session')
            || errorText.includes('not a chat member')
        ) {
            return;
        }

        console.warn('WS ticket request failed, falling back to cookie auth:', error);
    }

    let socket = null;
    try {
        socket = new WebSocket(url);
    } catch (error) {
        console.error('WS init error:', error);
        return;
    }

    wsManualClose = false;
    wsConnection = socket;
    wsChatId = targetChatId;

    socket.onopen = () => {
        clearWsTimers();
        wsPingTimer = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'ping' }));
            }
        }, WS_PING_INTERVAL_MS);
    };

    socket.onmessage = async (event) => {
        try {
            const payload = JSON.parse(event.data);
            const triggerEvents = new Set([
                'message_created',
                'message_deleted',
                'message_forwarded',
                'chat_updated',
                'member_joined',
                'messages_read'
            ]);

            if (triggerEvents.has(payload.event) && String(payload.chat_id) === String(currentChatId)) {
                await loadMessages(currentChatId);
            }
        } catch (error) {
            console.error('WS parse error:', error);
        }
    };

    socket.onerror = (event) => {
        if (socket !== wsConnection) {
            return;
        }

        console.error('WS transport error:', event);
    };

    socket.onclose = (event) => {
        clearWsTimers();

        if (wsConnection === socket) {
            wsConnection = null;
            wsChatId = null;
        }

        if (wsManualClose) {
            wsManualClose = false;
            return;
        }

        if (event && (event.code === 4401 || event.code === 4403 || event.code === 1008)) {
            return;
        }

        scheduleReconnect(targetChatId);
    };
}

function dedupeMessages(messages) {
    const output = [];
    const seenIds = new Set();

    for (const message of messages || []) {
        const id = String(message?.id || '');
        if (!id || seenIds.has(id)) {
            continue;
        }

        seenIds.add(id);
        output.push(message);
    }

    return output;
}

function renderMessage(message) {
    const node = messageTemplate.cloneNode(true);
    node.dataset.messageId = String(message.id);
    node.dataset.chatId = String(message.chat_id || '');
    node.dataset.isFavorite = String(Boolean(message.is_favorite));

    const authorEl = node.querySelector('.message-author');
    const typeEl = node.querySelector('.message-type');
    const forwardedEl = node.querySelector('.message-forwarded');
    const favoriteEl = node.querySelector('.message-favorite-indicator');
    const textEl = node.querySelector('.message-text');
    const dateEl = node.querySelector('.message-date');
    const readEl = node.querySelector('.message-read');

    const own = String(message.author_id || '') === String(me || '');

    if (own) {
        node.classList.add('message-own');
    }

    if (authorEl) {
        authorEl.textContent = message.author || 'Unknown';
    }

    if (typeEl) {
        const label = mapMessageTypeLabel(message.message_type || 'text');
        typeEl.textContent = label;
        typeEl.style.display = label ? 'inline-block' : 'none';
    }

    if (forwardedEl) {
        forwardedEl.style.display = message.forwarded_from_message_id ? 'inline-block' : 'none';
    }

    if (favoriteEl) {
        favoriteEl.style.visibility = message.is_favorite ? 'visible' : 'hidden';
    }

    if (textEl) {
        renderMedia(message, textEl);
    }

    if (dateEl) {
        dateEl.textContent = formatTime(message.created_at);
    }

    if (readEl) {
        readEl.textContent = own ? (message.read_state === 'read' ? '\u2713\u2713' : '\u2713') : '';
    }

    if (message.is_deleted) {
        node.classList.add('message-deleted');
    }

    if (message.is_favorite) {
        node.classList.add('message-favorite');
    }

    attachMessageHandlers(node, message);
    return node;
}

export async function loadMessages(chatId) {
    const targetChatId = String(chatId);
    currentChatId = targetChatId;

    if (!messagesContainer) {
        return;
    }

    const localToken = ++messagesLoadToken;

    try {
        me = await getCurrentUserId();
        const rawMessages = await apiFetchJson(`/chats/${targetChatId}/messages`, {
            method: 'GET',
            forceRefresh: true,
            cacheTtlMs: 0
        });

        if (localToken !== messagesLoadToken || targetChatId !== String(currentChatId)) {
            return;
        }

        const messages = dedupeMessages(Array.isArray(rawMessages) ? rawMessages : []);

        clearSelection();
        messagesContainer.innerHTML = '';

        if (messages.length === 0) {
            if (noMessagesYet) {
                noMessagesYet.style.display = 'flex';
            }

            messagesContainer.style.display = 'none';
            await connectSocket(targetChatId);
            return;
        }

        if (noMessagesYet) {
            noMessagesYet.style.display = 'none';
        }

        messagesContainer.style.display = 'flex';

        const fragment = document.createDocumentFragment();
        messages.forEach((message) => {
            fragment.appendChild(renderMessage(message));
        });

        messagesContainer.appendChild(fragment);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        await connectSocket(targetChatId);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}
export async function sendMessage(text, options = {}) {
    if (!currentChatId) {
        return;
    }

    const payload = {
        text,
        message_type: options.message_type || 'text',
        media_url: options.media_url || null,
        media_mime: options.media_mime || null
    };

    if (!payload.media_url && payload.message_type !== 'text') {
        const fallbackUrl = String(text || '').trim();
        if (fallbackUrl) {
            payload.media_url = fallbackUrl;
            if (payload.text === fallbackUrl) {
                payload.text = '';
            }
        }
    }

    if (payload.message_type === 'text' && !payload.media_url) {
        const fallbackUrl = String(text || '').trim();
        const detectedType = detectMediaTypeFromUrl(fallbackUrl);
        if (detectedType) {
            payload.message_type = detectedType;
            payload.media_url = fallbackUrl;
            if (payload.text === fallbackUrl) {
                payload.text = '';
            }
        }
    }

    const result = await apiFetchJson(`/chats/${currentChatId}/messages/send`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!result?.ok) {
        return;
    }

    if (!wsConnection || wsChatId !== String(currentChatId) || wsConnection.readyState !== WebSocket.OPEN) {
        await loadMessages(currentChatId);
    }
}

async function deleteSelected() {
    if (!currentChatId || selectedMessageIds.size === 0) {
        return;
    }

    const ids = Array.from(selectedMessageIds);

    for (const messageId of ids) {
        await apiFetchJson(`/chats/${currentChatId}/messages/delete`, {
            method: 'POST',
            body: JSON.stringify({ message_id: messageId })
        });
    }

    clearSelection();
}

async function forwardSelected() {
    if (!currentChatId || selectedMessageIds.size === 0) {
        return;
    }

    const ids = Array.from(selectedMessageIds);

    if (typeof forwardSelectionHandler === 'function') {
        const forwarded = await forwardSelectionHandler({
            sourceChatId: String(currentChatId),
            messageIds: ids
        });

        if (forwarded) {
            clearSelection();
        }

        return;
    }

    const target = window.prompt('Target chat id:');
    if (!target) {
        return;
    }

    for (const messageId of ids) {
        await apiFetchJson(`/chats/${currentChatId}/messages/forward`, {
            method: 'POST',
            body: JSON.stringify({
                message_id: messageId,
                target_chat_id: String(target)
            })
        });
    }

    clearSelection();
}

async function favoriteSelected() {
    if (!currentChatId || selectedMessageIds.size === 0 || !messagesContainer) {
        return;
    }

    for (const messageId of selectedMessageIds) {
        const node = messagesContainer.querySelector(`.message[data-message-id="${messageId}"]`);
        const isFavorite = node?.dataset?.isFavorite === 'true';
        const endpoint = isFavorite ? 'unfavorite' : 'favorite';

        await apiFetchJson(`/chats/${currentChatId}/messages/${endpoint}`, {
            method: 'POST',
            body: JSON.stringify({ message_id: messageId })
        });
    }

    await loadMessages(currentChatId);
}

function updateMediaInputVisibility() {
    if (!messageTypeSelect || !messageMediaInput) {
        return;
    }

    const type = messageTypeSelect.value;

    if (type === 'text') {
        messageMediaInput.style.display = 'none';
        messageMediaInput.value = '';
    } else {
        messageMediaInput.style.display = 'block';
        messageMediaInput.placeholder = `Media URL for ${type}`;
    }
}

function formatTime(isoString) {
    if (!isoString) {
        return '';
    }

    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);
}

export function setupMessageInput() {
    if (inputInitialized) {
        return;
    }

    inputInitialized = true;
    bindPointerSelectionListeners();

    if (messageTypeSelect) {
        messageTypeSelect.addEventListener('change', updateMediaInputVisibility);
        updateMediaInputVisibility();
    }

    if (sendButton && messageInput) {
        sendButton.addEventListener('click', async () => {
            const text = (messageInput.value || '').trim();
            const type = messageTypeSelect?.value || 'text';
            const mediaUrl = (messageMediaInput?.value || '').trim();

            if (type === 'text' && !text) {
                return;
            }

            if (type !== 'text' && !mediaUrl) {
                return;
            }

            await sendMessage(text, {
                message_type: type,
                media_url: mediaUrl || null
            });

            messageInput.value = '';

            if (messageMediaInput) {
                messageMediaInput.value = '';
            }
        });

        messageInput.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendButton.click();
            }
        });
    }

    if (clearSelectedBtn) {
        clearSelectedBtn.addEventListener('click', clearSelection);
    }

    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', deleteSelected);
    }

    if (forwardSelectedBtn) {
        forwardSelectedBtn.addEventListener('click', forwardSelected);
    }

    if (favoriteSelectedBtn) {
        favoriteSelectedBtn.addEventListener('click', favoriteSelected);
    }

    updateSelectionUi();
}

export function setForwardSelectionHandler(handler) {
    forwardSelectionHandler = handler;
}

export function closeMessageSocket() {
    hideContextMenu();
    finishRightDragSelection();
    closeSocketInternal(true);
    clearSelection();
    messagesLoadToken += 1;
}
