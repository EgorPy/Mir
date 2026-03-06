import { openModal, closeModal } from '/static/modal.js';
import { fetchChatData, loadChats } from '/static/load_chats.js';
import { apiFetchJson, getCurrentUserId } from '/static/api_client.js';
import { closeChatView, getSelectedChatId, refreshOpenedChat } from '/static/open_chat.js';

const DEFAULT_AVATAR = '../static/favicon.ico';

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatDate(value) {
    if (!value) {
        return 'Unknown';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Unknown';
    }

    return date.toLocaleString('en-US');
}

function typeLabel(type) {
    if (type === 'channel') {
        return 'Channel';
    }

    if (type === 'private') {
        return 'Direct chat';
    }

    if (type === 'favorites') {
        return 'Favorites';
    }

    return 'Group';
}

function canManageRoles(viewerRole) {
    return viewerRole === 'owner';
}

function normalizeModalTitle(chat) {
    const rawTitle = String(chat?.title || '').trim();
    const chatType = String(chat?.type || '').toLowerCase();

    if (chatType === 'private') {
        const noPrefix = rawTitle.replace(/^DM:\s*/i, '').trim();
        return noPrefix || 'Direct chat';
    }

    return rawTitle || 'Untitled chat';
}

function roleControl(member, viewerRole, meId) {
    const role = member.role || 'member';
    if (role === 'owner') {
        return '<span class="member-role-label">owner</span>';
    }

    if (!canManageRoles(viewerRole)) {
        return `<span class="member-role-label">${role}</span>`;
    }

    if (String(member.id) === String(meId) && viewerRole === 'admin') {
        return `<span class="member-role-label">${role}</span>`;
    }

    return `
        <select class="member-role-select" data-user-id="${member.id}" data-current-role="${role}">
            <option value="member" ${role === 'member' ? 'selected' : ''}>member</option>
            <option value="admin" ${role === 'admin' ? 'selected' : ''}>admin</option>
        </select>
    `;
}

function createChatInfoHtml(chat, viewerRole, meId) {
    const members = Array.isArray(chat.members) ? chat.members : [];
    const deleteButton = canManageRoles(viewerRole)
        ? '<button class="modal-btn danger-btn" id="deleteChatBtnInModal">Delete chat</button>'
        : '';

    const leaveButton = viewerRole !== 'owner'
        ? '<button class="modal-btn" id="leaveChatBtn">Leave chat</button>'
        : '';

    const avatarEditor = canManageRoles(viewerRole)
        ? `
            <div class="form-group">
                <label for="chatAvatarInput">Chat avatar URL</label>
                <input id="chatAvatarInput" type="text" value="${escapeHtml(chat.avatar || '')}" placeholder="https://..." />
                <button class="modal-btn" id="saveChatAvatarBtn">Save avatar</button>
            </div>
        `
        : '';

    const membersHtml = members.map((member) => {
        const fullNameRaw = `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || `User ${member.id}`;
        const fullName = escapeHtml(fullNameRaw);
        const email = escapeHtml(member.email || '');

        return `
            <div class="member-item">
                <img src="${escapeHtml(member.avatar_url || DEFAULT_AVATAR)}" alt="avatar" class="member-avatar" />
                <div class="member-main">
                    <div class="member-name">${fullName}</div>
                    <div class="member-email">${email}</div>
                </div>
                ${roleControl(member, viewerRole, meId)}
            </div>
        `;
    }).join('');

    const title = escapeHtml(normalizeModalTitle(chat));
    const description = chat.description ? escapeHtml(chat.description) : '';

    return `
        <div class="modal-header">Chat info</div>
        <div class="modal-body chat-info-body">
            <div class="chat-info-header">
                <img src="${escapeHtml(chat.avatar || DEFAULT_AVATAR)}" alt="avatar" class="chat-info-avatar" />
                <div class="title">${title}</div>
            </div>

            <div class="chat-info-details">
                <div class="info-row"><span class="info-label">Type:</span><span class="info-value">${typeLabel(chat.type)}</span></div>
                <div class="info-row"><span class="info-label">Your role:</span><span class="info-value">${viewerRole || 'member'}</span></div>
                <div class="info-row"><span class="info-label">Created:</span><span class="info-value">${formatDate(chat.created_at)}</span></div>
                <div class="info-row"><span class="info-label">Members:</span><span class="info-value">${members.length}</span></div>
                ${description ? `<div class="info-row info-description"><span class="info-label">Description:</span><span class="info-value">${description}</span></div>` : ''}
            </div>

            ${avatarEditor}

            <div class="chat-info-members">
                <div class="members-title">Members</div>
                <div class="members-list">
                    ${membersHtml}
                </div>
            </div>
        </div>
        <div class="modal-footer">
            ${leaveButton}
            ${deleteButton}
            <button class="modal-btn" id="closeInfoBtn">Close</button>
        </div>
    `;
}

async function reloadModal(chatId) {
    await showChatInfo(chatId);
}

async function handleRoleChange(chatId, selectNode) {
    const userId = selectNode.dataset.userId;
    const role = selectNode.value;

    try {
        await apiFetchJson(`/chats/${chatId}/members/role`, {
            method: 'POST',
            body: JSON.stringify({
                user_id: String(userId),
                role
            })
        });

        await refreshOpenedChat();
        await reloadModal(chatId);
    } catch (error) {
        console.error('Cannot update role:', error);
        selectNode.value = selectNode.dataset.currentRole || 'member';
        window.alert(`Cannot update role: ${error.message}`);
    }
}

async function handleLeaveChat(chatId) {
    try {
        await apiFetchJson(`/chats/${chatId}/leave`, { method: 'GET' });
        closeModal();
        closeChatView();
        await loadChats({ forceRefresh: true });
    } catch (error) {
        console.error('Cannot leave chat:', error);
        window.alert(`Cannot leave chat: ${error.message}`);
    }
}

async function handleDeleteChat(chatId) {
    const confirmed = window.confirm('Delete this chat permanently?');
    if (!confirmed) {
        return;
    }

    try {
        await apiFetchJson('/chats/delete', {
            method: 'POST',
            body: JSON.stringify({ chat_id: String(chatId) })
        });

        closeModal();
        closeChatView();
        await loadChats({ forceRefresh: true });
    } catch (error) {
        console.error('Cannot delete chat:', error);
        window.alert(`Cannot delete chat: ${error.message}`);
    }
}

async function handleSaveAvatar(chatId) {
    const input = document.getElementById('chatAvatarInput');
    if (!input) {
        return;
    }

    const avatarUrl = input.value.trim();
    if (!avatarUrl) {
        return;
    }

    try {
        await apiFetchJson(`/chats/${chatId}/avatar`, {
            method: 'PATCH',
            body: JSON.stringify({ avatar_url: avatarUrl })
        });

        await refreshOpenedChat();
        await loadChats({ forceRefresh: true });
        await reloadModal(chatId);
    } catch (error) {
        console.error('Cannot update chat avatar:', error);
        window.alert(`Cannot update chat avatar: ${error.message}`);
    }
}

function attachModalListeners(chatId) {
    const closeBtn = document.getElementById('closeInfoBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    const leaveBtn = document.getElementById('leaveChatBtn');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', async () => {
            await handleLeaveChat(chatId);
        });
    }

    const deleteBtn = document.getElementById('deleteChatBtnInModal');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            await handleDeleteChat(chatId);
        });
    }

    const saveAvatarBtn = document.getElementById('saveChatAvatarBtn');
    if (saveAvatarBtn) {
        saveAvatarBtn.addEventListener('click', async () => {
            await handleSaveAvatar(chatId);
        });
    }

    document.querySelectorAll('.member-role-select').forEach((node) => {
        node.addEventListener('change', async (event) => {
            const selectNode = event.target;
            await handleRoleChange(chatId, selectNode);
        });
    });
}

async function showChatInfo(chatId) {
    try {
        const [chat, memberInfo, meId] = await Promise.all([
            fetchChatData(chatId, { forceRefresh: true }),
            apiFetchJson(`/chats/${chatId}/member`, {
                method: 'GET',
                cacheTtlMs: 3000,
                forceRefresh: true
            }),
            getCurrentUserId()
        ]);

        const html = createChatInfoHtml(chat, memberInfo.role || 'member', meId);
        openModal(html);
        attachModalListeners(chatId);
    } catch (error) {
        console.error('Cannot open chat info:', error);
    }
}

document.addEventListener('click', async (event) => {
    if (!event.target.closest('.chat-avatar') && !event.target.closest('.chat-title')) {
        return;
    }

    const chatId = getSelectedChatId();
    if (!chatId) {
        return;
    }

    await showChatInfo(chatId);
});
