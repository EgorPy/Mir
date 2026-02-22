document.addEventListener('DOMContentLoaded', function() {
    // Получаем элементы
    const createGroupBtn = document.getElementById('createGroupBtn');
    const modal = document.getElementById('createGroupModal');
    const overlay = document.getElementById('overlay');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const submitBtn = document.getElementById('submitGroupBtn');
    const form = document.getElementById('createGroupForm');
    const groupTitleInput = document.getElementById('groupTitle');

    // Проверяем, что все элементы найдены
    if (!createGroupBtn || !modal || !overlay || !cancelModalBtn || !submitBtn || !form || !groupTitleInput) {
        console.error('Не удалось найти все необходимые элементы');
        return;
    }

    // Функция открытия модального окна
    function openModal() {
        modal.classList.add('active');
        overlay.classList.add('active');
        groupTitleInput.focus();

        // Закрываем sidebar если открыт
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    }

    // Функция закрытия модального окна
    function closeModal() {
        modal.classList.remove('active');

        // Проверяем, не открыт ли sidebar
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
                const errorMsg = result?.error || 'Не удалось создать группу';
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

    // Обработчики событий
    createGroupBtn.addEventListener('click', openModal);
    cancelModalBtn.addEventListener('click', closeModal);

    // Закрытие по клику на overlay
    overlay.addEventListener('click', function(e) {
        if (modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modal.classList.contains('active')) {
                closeModal();
            }
        }
    });

    // Отправка формы по Enter
    groupTitleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCreateGroup();
        }
    });

    submitBtn.addEventListener('click', handleCreateGroup);

    // Предотвращаем закрытие при клике внутри модального окна
    modal.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Очищаем ошибки при вводе
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