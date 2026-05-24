import { openModal, closeModal } from '../visual/modal.js'
import { getChatState } from '../state/chat_state.js'
import { getUserStates } from '../state/user_state.js'
import { leaveChat } from '../fetch/leave_chat.js'
import { i18n } from './i18n.js'
import { adjustChatHeader } from '../visual/chat_title.js'

const t = i18n.t

const chatHeaderButtons = [
    {
        id: 'titleBtn',
        class: 'chat-title header-button',
        label: (chat) => chat.title,
        show: () => true,
        onClick: (chat) => showChatInfo(chat.id)
    },
    {
        id: 'callBtn',
        class: 'chat-call header-button',
        label: () => t('chat_header.call'),
        show: (chat) => ['private', 'group'].includes(chat.type),
        onClick: (chat) => console.log('call', chat.id)
    },
];

export function renderChatHeader(chat) {
    console.log(chat.type)
    const chatHeader = document.querySelector('#chatHeader');
    if (!chatHeader) return;

    chatHeader.dataset.chatId = chat.id;

    const avatarElement = chatHeader.querySelector('.chat-avatar');
    if (avatarElement) {
        avatarElement.src = chat.avatar || defaultAvatar();
        avatarElement.onerror = null;
    }

    const buttonsGroup = chatHeader.querySelector('.chat-buttons-group');
    if (!buttonsGroup) return;
    buttonsGroup.innerHTML = '';

    chatHeaderButtons
        .filter(btn => btn.show(chat))
        .forEach(btn => {
        const el = document.createElement('div');
        el.id = btn.id;
        el.className = btn.class;
        el.textContent = btn.label(chat);
        el.addEventListener('click', () => btn.onClick(chat));
        buttonsGroup.appendChild(el);
    });

    adjustChatHeader();
}

document.addEventListener('click', async (e) => {
    if (e.target.closest('.chat-avatar') || e.target.closest('.chat-title')) {
        const chatHeader = document.querySelector('#chatHeader');
        const chatId = chatHeader?.dataset.chatId;

        if (!chatId) {
            console.error('chat_id not found');
            return;
        }

        await showChatInfo(chatId);
    }
});

async function showChatInfo(chatId) {
    const chat = getChatState(chatId);
    const user = getUserStates();
    const modalContent = createChatInfoHTML(chat, user);
    openModal(modalContent);
    setTimeout(setupModalEventListeners, 0);

    const modal = document.querySelector('#modal');
    const leaveChatBtn = modal.querySelector('#leaveChatBtn');
    if (!leaveChatBtn) return;
    leaveChatBtn.addEventListener('click', () => leaveChat(chatId));
}

function setupModalEventListeners() {
    const cancelBtn = document.getElementById('cancelModalBtn');
    if (cancelBtn) {
        cancelBtn.removeEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
    }
}

function createChatInfoHTML(chat, user) {
    const role = user.chats_role.find(user_chat => user_chat.chat_id == chat.id)?.role;

    return `
        <div class="modal-header">
            ${t('chat_info.title')}
        </div>
        <div class="modal-body">
            <div class="chat-info-header">
                <img src="${chat.avatar || defaultAvatar()}"
                     alt="avatar"
                     class="chat-info-avatar">
                <div class="title">${chat.title || t('chat_info.no_title')}</div>
            </div>

            <div class="chat-info-buttons">
                ${role && role !== 'owner' ? `<button class="modal-btn" id="leaveChatBtn">${t('chat_info.leave')}</button>` : ''}
                ${role === 'owner' ? `<button class="modal-btn" id="settingsChatBtn">${t('chat_info.settings')}</button>` : ''}
            </div>

            <div class="chat-info-details">
                ${chat.description ? `
                <div class="info-row description">
                    <span class="info-label">${t('chat_info.description')}:</span>
                    <p class="info-value">${chat.description}</p>
                </div>
                ` : ''}

                ${chat.members ? `
                <div class="info-row">
                    <span class="info-label">${t('chat_info.members')}:</span>
                    <span class="info-value">${chat.members.length}</span>
                </div>
                ` : ''}
            </div>

            ${chat.members ? `
            <div class="chat-info-members">
                <div class="members-list">
                    ${chat.members.map(member => `
                        <div class="member-item">
                            <div class="user">
                                <img src="${member.avatar || defaultAvatar()}"
                                     alt="avatar"
                                     class="member-avatar">
                                <div class="member-name">${member.first_name} ${member.last_name}</div>
                            </div>
                            ${member.role && member.role !== 'member' ? `<span class="member-role">${t(`roles.${member.role}`)}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
        <div class="modal-footer">
            <button class="modal-btn cancel-btn" id="cancelModalBtn">${t('chat_info.ok')}</button>
        </div>
    `;
}

function defaultAvatar() {
    return '/static/favicon.ico';
}
