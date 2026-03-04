import { BACKEND_URL } from '/static/config.js';
import { openModal, closeModal } from '/static/modal.js';
import { getChatState } from '/static/chat_state.js'
import { leaveChat } from '/static/leave_chat.js'

document.addEventListener('click', async (e) => {
    if (e.target.closest('.chat-avatar') || e.target.closest('.chat-title')) {
        const chatHeader = document.querySelector('.chat-header');
        const chatId = chatHeader?.dataset.chatId;

        if (!chatId) {
            console.error('chat_id not found');
            return;
        }

        await showChatInfo(chatId);
    }
});

async function showChatInfo(chatId) {
    const chat = getChatState(chatId)
    const modalContent = createChatInfoHTML(chat);
    openModal(modalContent);
    setTimeout(setupModalEventListeners, 0);
    const modalContentElement = modal.querySelector('.modal-content');
    const leaveChatBtn = modalContentElement.querySelector("#leaveChatBtn")
    leaveChatBtn.addEventListener("click", () => {
        leaveChat(chatId)
    })
}

function setupModalEventListeners() {
    const closeInfoBtn = document.getElementById('closeInfoBtn');
    if (closeInfoBtn) {
        closeInfoBtn.removeEventListener('click', closeModal);
        closeInfoBtn.addEventListener('click', closeModal);
    }

    const cancelBtn = document.getElementById('cancelModalBtn');
    if (cancelBtn) {
        cancelBtn.removeEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
    }
}

function createChatInfoHTML(chat) {
    const createdAt = chat.created_at ? new Date(chat.created_at).toLocaleString() : 'Неизвестно';

    let chatTypeText = 'Чат';
    if (chat.type === 'group') {
        chatTypeText = 'Группа';
    } else if (chat.type === 'channel') {
        chatTypeText = 'Канал';
    } else if (chat.type === 'private') {
        chatTypeText = 'Личный чат';
    }

    const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'20\' fill=\'%23E0E0E0\'/%3E%3Ctext x=\'20\' y=\'25\' font-size=\'16\' text-anchor=\'middle\' fill=\'%23999\' font-family=\'Arial\'%3E%3F%3C/text%3E%3C/svg%3E';

    return `
        <div class="modal-header">
            Информация о чате
        </div>
        <div class="modal-body">
                <div class="chat-info-header">
                    <img src="${chat.avatar || defaultAvatar}"
                         alt="avatar"
                         class="chat-info-avatar">
                    <div class="title">${chat.title || 'Без названия'}</div>
                </div>

                <div class="chat-info-buttons">
                    <button class="modal-btn leave-chat-btn" id="leaveChatBtn">Покинуть</button>
                </div>

                <div class="chat-info-details">
                    ${chat.description ? `
                    <div class="info-row description">
                        <span class="info-label">Описание:</span>
                        <p class="info-value">${chat.description}</p>
                    </div>
                    ` : ''}

                    ${chat.members ? `
                    <div class="info-row">
                        <span class="info-label">Участники:</span>
                        <span class="info-value">${chat.members.length}</span>
                    </div>
                    ` : ''}
                </div>

                ${chat.members ? `
                <div class="chat-info-members">
                    <div class="members-list">
                        ${chat.members.map(member => `
                            <div class="member-item">
                                <img src="${member.avatar || defaultAvatar}"
                                     alt="avatar"
                                     class="member-avatar">
                                <div class="member-name">${member.first_name} ${member.last_name}</div>
                                ${member.role ? `<span class="member-role">${member.role}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
        </div>
        <div class="modal-footer">
            <button class="modal-btn cancel-btn" id="cancelModalBtn">Ок</button>
        </div>
    `;
}

export function setChatHeaderInfo(chatId, title, avatar) {
    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader) {
        chatHeader.dataset.chatId = chatId;

        const titleElement = chatHeader.querySelector('.chat-title');
        if (titleElement) {
            titleElement.textContent = title || 'Чат';
        }

        const avatarElement = chatHeader.querySelector('.chat-avatar');
        if (avatarElement) {
            const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'20\' fill=\'%23E0E0E0\'/%3E%3Ctext x=\'20\' y=\'25\' font-size=\'16\' text-anchor=\'middle\' fill=\'%23999\' font-family=\'Arial\'%3E%3F%3C/text%3E%3C/svg%3E';
            avatarElement.src = avatar || defaultAvatar;
            avatarElement.onerror = null;
        }
    }
}