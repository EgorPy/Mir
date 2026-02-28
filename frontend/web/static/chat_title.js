window.addEventListener('resize', adjustChatHeader);

export function adjustChatHeader() {
    const actualChat = document.querySelector('.actual-chat');
    if (!actualChat) return;

    const chatHeader = actualChat.querySelector('.chat-header');
    if (!chatHeader) return;

    if (window.innerWidth <= 768) {
        chatHeader.style.left = '';
        chatHeader.style.width = '';
        return;
    }

    const rect = actualChat.getBoundingClientRect();
    chatHeader.style.left = rect.left + 'px';
    chatHeader.style.width = rect.width + 'px';
}