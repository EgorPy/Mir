import { openModal, closeModal } from '/static/modal.js';

async function handleDeleteGroup() {
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (!confirmBtn) return;

    const chatElement = document.querySelector('.chat-main.selected');
    if (!chatElement) {
        console.error('No chat selected');
        return;
    }

    const chatId = chatElement.getAttribute('data-chat-id');

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Удаление...';
    confirmBtn.classList.add('loading');

    try {
        const result = await deleteChat(chatId);

        if (result && result.ok) {
            setTimeout(() => {
                closeModal();
                if (typeof loadChats === 'function') {
                    loadChats();
                }
            }, 200);
        } else {
            const errorMsg = result?.error || 'Unable to delete group';
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.textContent = errorMsg;
            document.querySelector('.modal-body')?.appendChild(errorElement);

            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Удалить';
            confirmBtn.classList.remove('loading');
        }
    } catch (error) {
        console.error('Delete group error:', error);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Удалить';
        confirmBtn.classList.remove('loading');
    }
}

function setupDeleteButtonListener() {
    const deleteBtn = document.getElementById('deleteChatBtn');
    if (deleteBtn) {
        deleteBtn.removeEventListener('click', showDeleteConfirmation);
        deleteBtn.addEventListener('click', showDeleteConfirmation);
    }
}

function showDeleteConfirmation() {
    const chatElement = document.querySelector('.chat-main.selected');
    if (!chatElement) {
        console.error('No chat selected');
        return;
    }

    const chatTitle = chatElement.getAttribute('data-chat-title') || 'эту группу';

    const modal = document.getElementById('modal');
    const overlay = document.getElementById('overlay');

    if (!modal || !overlay) return;

    openModal( `
        <div class="modal-header">
            Удалить группу
        </div>
        <div class="modal-body">
            <p>Вы уверены, что хотите удалить группу "${chatTitle}"?</p>
            <p class="warning-text">Это действие нельзя отменить.</p>
        </div>
        <div class="modal-footer">
            <button class="modal-btn cancel-btn" id="cancelModalBtn">Отмена</button>
            <button class="modal-btn delete-btn" id="confirmDeleteBtn">Удалить</button>
        </div>
    `);

    modal.classList.add('active');
    overlay.classList.add('active');

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');

    if (confirmBtn) {
        confirmBtn.removeEventListener('click', handleDeleteGroup);
        confirmBtn.addEventListener('click', handleDeleteGroup);
    }

    if (cancelBtn) {
        cancelBtn.removeEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
    }
}

async function deleteChat(chatId) {
    try {
        const response = await fetch(`${window.BACKEND_URL || ''}/chats/delete`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ chat_id: chatId })
        });

        const result = await response.json();
        location.reload();
        if (result.ok && typeof loadChats === 'function') {
            await loadChats();
        }
        return result;
    } catch (error) {
        console.error('Error deleting chat:', error);
        throw error;
    }
}

const observer = new MutationObserver(() => {
    setupDeleteButtonListener();
});

document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

setTimeout(setupDeleteButtonListener, 100);