window.addEventListener('resize', adjustChatHeader);

export function adjustChatHeader() {
    const actualChat = document.querySelector('.actual-chat');
    if (!actualChat) return;

    const chatHeaders = actualChat.querySelectorAll('.chat-header');

    if (window.innerWidth <= 768) {
        chatHeaders.forEach(chatHeader => {
            chatHeader.style.left = '';
            chatHeader.style.width = '';
        })
        return;
    }

    const rect = actualChat.getBoundingClientRect();
    chatHeaders.forEach(chatHeader => {
        chatHeader.style.left = rect.left + 'px';
        chatHeader.style.width = rect.width + 'px';
    })
}