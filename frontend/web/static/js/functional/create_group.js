import { openModal, closeModal } from '../visual/modal.js';

document.addEventListener('DOMContentLoaded', function() {
    const createGroupBtn = document.getElementById('createGroupBtn');
    const modal = document.getElementById('modal');
    const overlay = document.getElementById('overlay');

    if (!createGroupBtn || !modal || !overlay) {
        console.error('Unable to find needed elements');
        return;
    }

    function getModalElements() {
        const form = document.getElementById('createGroupForm');
        const groupTitleInput = document.getElementById('groupTitle');
        const submitBtn = document.getElementById('submitGroupBtn');
        const cancelBtn = document.getElementById('cancelModalBtn');
        return { form, groupTitleInput, submitBtn, cancelBtn };
    }

    function closeModal() {
        modal.classList.remove('active');

        const sidebar = document.getElementById('sidebar');
        if (!sidebar || !sidebar.classList.contains('active')) {
            overlay.classList.remove('active');
        }

        const { form } = getModalElements();
        if (form) {
            form.reset();
        }

        const messages = document.querySelectorAll('.error-message, .success-message');
        messages.forEach(msg => msg.remove());

        const { submitBtn } = getModalElements();
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Создать';
            submitBtn.classList.remove('loading');
        }
    }

    async function handleCreateGroup() {
        const { groupTitleInput, submitBtn } = getModalElements();

        if (!groupTitleInput || !submitBtn) {
            console.error('Modal elements not found');
            return;
        }

        const title = groupTitleInput.value.trim();

        if (!title) {
            groupTitleInput.focus();
            return;
        }

        if (title.length < 3) {
            groupTitleInput.focus();
            return;
        }

        if (title.length > 50) {
            groupTitleInput.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Создание...';
        submitBtn.classList.add('loading');

        try {
            const result = await createChat(title);

            if (result && result.ok) {
                setTimeout(() => {
                    closeModal();
                    if (typeof loadChats === 'function') {
                        loadChats();
                    }
                }, 200);
            } else {
                const errorMsg = result?.error || 'Unable to create group';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Создать';
                submitBtn.classList.remove('loading');
            }
        } catch (error) {
            console.error('Create group error:', error);
            const { submitBtn } = getModalElements();
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Создать';
                submitBtn.classList.remove('loading');
            }
        }
    }

    function setupDynamicEventListeners() {
        const { groupTitleInput, submitBtn, cancelBtn } = getModalElements();

        if (groupTitleInput) {
            groupTitleInput.removeEventListener('keypress', handleKeyPress);
            groupTitleInput.removeEventListener('input', handleInput);

            groupTitleInput.addEventListener('keypress', handleKeyPress);
            groupTitleInput.addEventListener('input', handleInput);
        }

        if (submitBtn) {
            submitBtn.removeEventListener('click', handleCreateGroup);
            submitBtn.addEventListener('click', handleCreateGroup);
        }

        if (cancelBtn) {
            cancelBtn.removeEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
        }
    }

    function handleKeyPress(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCreateGroup();
        }
    }

    function handleInput() {
        const errorMsg = document.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    }

    createGroupBtn.addEventListener('click', () => {
        openModal(`
            <div class="modal-header">
                Создать группу
            </div>
            <div class="modal-body">
                <form id="createGroupForm">
                    <div class="form-group">
                        <input
                            type="text"
                            id="groupTitle"
                            name="title"
                            placeholder="Введите название группы"
                            required
                            autocomplete="off"
                        >
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="modal-btn cancel-btn" id="cancelModalBtn">Отмена</button>
                <button class="modal-btn create-btn" id="submitGroupBtn">Создать</button>
            </div>
        `);

        setTimeout(setupDynamicEventListeners, 0);
    });

    overlay.addEventListener('click', function(e) {
        if (modal.classList.contains('active')) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modal.classList.contains('active')) {
                closeModal();
            }
        }
    });

    modal.addEventListener('click', (e) => {
        e.stopPropagation();
    });
});

async function createChat(title) {
    try {
        const response = await fetch(`${window.BACKEND_URL || ''}/chats/create`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: title, public_id: "asd" })
        });

        const result = await response.json();
        location.reload();
        if (result.ok && typeof loadChats === 'function') {
            await loadChats();
        }
        return result;
    } catch (error) {
        console.error('Error creating chat:', error);
        throw error;
    }
}