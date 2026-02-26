import { BACKEND_URL } from '/static/config.js';
import { openModal, closeModal } from '/static/modal.js';

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
    try {
        const response = await fetch(`${BACKEND_URL}/chats/${chatId}/info`, {
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`Error loading chat info: ${response.status}`);
        }

        const chatInfo = await response.json();

        const modalContent = createChatInfoHTML(chatInfo);

        openModal(modalContent);

        setTimeout(setupModalEventListeners, 0);

    } catch (error) {
        console.error('Ошибка при получении информации о чате:', error);
        openModal(`
            <div class="modal-header">
                <h2>Ошибка</h2>
            </div>
            <div class="modal-body">
                <div class="error-message">Не удалось загрузить информацию о чате</div>
            </div>
            <div class="modal-footer">
                <button class="modal-btn cancel-btn" id="cancelModalBtn">Ок</button>
            </div>
        `);

        setTimeout(setupModalEventListeners, 0);
    }
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

function createChatInfoHTML(chatInfo) {
    const createdAt = chatInfo.created_at ? new Date(chatInfo.created_at).toLocaleString() : 'Неизвестно';

    let chatTypeText = 'Чат';
    if (chatInfo.type === 'group') {
        chatTypeText = 'Группа';
    } else if (chatInfo.type === 'channel') {
        chatTypeText = 'Канал';
    } else if (chatInfo.type === 'private') {
        chatTypeText = 'Личный чат';
    }

    const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'20\' fill=\'%23E0E0E0\'/%3E%3Ctext x=\'20\' y=\'25\' font-size=\'16\' text-anchor=\'middle\' fill=\'%23999\' font-family=\'Arial\'%3E%3F%3C/text%3E%3C/svg%3E';

    return `
        <div class="modal-header">
            <h2>Информация о чате</h2>
        </div>
        <div class="modal-body">
            <div class="chat-info-modal">
                <div class="chat-info-header">
                    <img src="${chatInfo.avatar || defaultAvatar}"
                         alt="avatar"
                         class="chat-info-avatar">
                    <h3>${chatInfo.title || 'Без названия'}</h3>
                </div>

                <div class="chat-info-details">
                    <div class="info-row">
                        <span class="info-label">Тип:</span>
                        <span class="info-value">${chatTypeText}</span>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Создан:</span>
                        <span class="info-value">${createdAt}</span>
                    </div>

                    ${chatInfo.description ? `
                    <div class="info-row description">
                        <span class="info-label">Описание:</span>
                        <p class="info-value">${chatInfo.description}</p>
                    </div>
                    ` : ''}

                    ${chatInfo.members ? `
                    <div class="info-row">
                        <span class="info-label">Участники:</span>
                        <span class="info-value">${chatInfo.members}</span>
                    </div>
                    ` : ''}

                    ${chatInfo.created_by ? `
                    <div class="info-row">
                        <span class="info-label">Создатель:</span>
                        <span class="info-value">${chatInfo.author}</span>
                    </div>
                    ` : ''}
                </div>

                ${chatInfo.members_list ? `
                <div class="chat-info-members">
                    <h4>Участники (${chatInfo.members_list.length})</h4>
                    <div class="members-list">
                        ${chatInfo.members_list.map(member => `
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