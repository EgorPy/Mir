export function openModal(contentHtml) {
    const modal = document.getElementById('createGroupModal');
    modal.querySelector('.modal-body').innerHTML = contentHtml;
    modal.style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
}

export function closeModal() {
    const modal = document.getElementById('createGroupModal');
    modal.style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}