import { BACKEND_URL } from '/static/config.js';
import { openModal, closeModal } from '/static/modal.js';
import { getChatState } from '/static/chat_state.js'

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
            <h2>Информация о чате</h2>
        </div>
        <div class="modal-body">
                <div class="chat-info-header">
                    <img src="${chat.avatar || defaultAvatar}"
                         alt="avatar"
                         class="chat-info-avatar">
                    <div class="title">${chat.title || 'Без названия'}</div>
                </div>

                <div class="chat-info-buttons">
                    <button class="modal-btn delete-chat-btn" id="deleteChatBtn">Удалить</button>
                </div>

                <div class="chat-info-details">
                    <div class="info-row">
                        <span class="info-label">Тип:</span>
                        <span class="info-value">${chatTypeText}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Тип:</span>
                        <span class="info-value">${chatTypeText}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Тип:</span>
                        <span class="info-value">${chatTypeText}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Тип:</span>
                        <span class="info-value">${chatTypeText}</span>
                    </div>

                    ${chat.description ? `
                    <div class="info-row description">
                        <span class="info-label">Описание:</span>
                        <p class="info-value">${chat.description}</p>
                    </div>
                    ` : ''}

                    ${chat.members ? `
                    <div class="info-row">
                        <span class="info-label">Участники:</span>
                        <span class="info-value">${chat.members}</span>
                    </div>
                    ` : ''}
                </div>

                ${chat.members_list ? `
                <div class="chat-info-members">
                    <h4>Участники (${chat.members_list.length})</h4>
                    <div class="members-list">
                        ${chat.members_list.map(member => `
                            <div class="member-item">
                                <img src="${member.avatar || defaultAvatar}"
                                     alt="avatar"
                                     class="member-avatar">
                                <span class="member-name">${member.name}</span>
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