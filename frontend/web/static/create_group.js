document.addEventListener('DOMContentLoaded', function() {
    const createGroupBtn = document.getElementById('createGroupBtn');
    const modal = document.getElementById('createGroupModal');
    const overlay = document.getElementById('overlay');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const submitBtn = document.getElementById('submitGroupBtn');
    const form = document.getElementById('createGroupForm');
    const groupTitleInput = document.getElementById('groupTitle');

    if (!createGroupBtn || !modal || !overlay || !cancelModalBtn || !submitBtn || !form || !groupTitleInput) {
        console.error('Unable to find needed elements');
        return;
    }

    function openModal() {
        modal.classList.add('active');
        overlay.classList.add('active');
        groupTitleInput.focus();

        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    }

    function closeModal() {
        modal.classList.remove('active');

        const sidebar = document.getElementById('sidebar');
        if (!sidebar || !sidebar.classList.contains('active')) {
            overlay.classList.remove('active');
        }

        form.reset();

        const messages = document.querySelectorAll('.error-message, .success-message');
        messages.forEach(msg => msg.remove());

        submitBtn.disabled = false;
        submitBtn.textContent = 'Создать';
        submitBtn.classList.remove('loading');
    }

    async function handleCreateGroup() {
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
            submitBtn.disabled = false;
            submitBtn.textContent = 'Создать';
            submitBtn.classList.remove('loading');
        }
    }

    createGroupBtn.addEventListener('click', openModal);
    cancelModalBtn.addEventListener('click', closeModal);

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

    groupTitleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCreateGroup();
        }
    });

    submitBtn.addEventListener('click', handleCreateGroup);

    modal.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    groupTitleInput.addEventListener('input', () => {
        const errorMsg = document.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
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
            body: JSON.stringify({ title })
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