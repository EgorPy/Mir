export function openModal(contentHtml) {
    const modal = document.getElementById('createGroupModal');
    const overlay = document.getElementById('overlay');

    // Находим modal-content и заменяем его полностью
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.innerHTML = contentHtml;
    }

    modal.classList.add('active');
    overlay.classList.add('active');

    const inputInContent = modal.querySelector('input:not([type="hidden"])');
    if (inputInContent) {
        inputInContent.focus();
    }

    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    }
}

export function closeModal() {
    const modal = document.getElementById('createGroupModal');
    const overlay = document.getElementById('overlay');
    const form = document.getElementById('createGroupForm');

    modal.classList.remove('active');

    const sidebar = document.getElementById('sidebar');
    if (!sidebar || !sidebar.classList.contains('active')) {
        overlay.classList.remove('active');
    }

    if (form) {
        form.reset();
    }

    const messages = document.querySelectorAll('.error-message, .success-message');
    messages.forEach(msg => msg.remove());

    const submitBtn = modal.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Создать';
        submitBtn.classList.remove('loading');
    }
}