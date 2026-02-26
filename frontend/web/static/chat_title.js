window.addEventListener('resize', adjustChatHeader);

export function adjustChatHeader() {
    const actualChat = document.querySelector('.actual-chat');
    if (!actualChat) return;
    const chatHeader = actualChat.querySelector('.chat-header');
    if (!chatHeader) return;

    const rect = actualChat.getBoundingClientRect();
    chatHeader.style.left = rect.left + 'px';
    chatHeader.style.width = rect.width + 'px';
}
