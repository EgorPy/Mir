window.addEventListener('resize', adjustChatHeader);

export function adjustChatHeader() {
    const actualChat = document.querySelector('.actual-chat');
    if (!actualChat) return;

    const chatHeaders = actualChat.querySelectorAll('.chat-header');

    if (window.innerWidth <= 768) {
        chatHeaders.forEach(chatHeader => {
            chatHeader.style.left = '';
            chatHeader.style.width = '';
        });
        return;
    }

    const rect = actualChat.getBoundingClientRect();
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);

    chatHeaders.forEach(chatHeader => {
        const style = window.getComputedStyle(chatHeader);
        const marginLeft = parseFloat(style.marginLeft) || 0;
        const marginRight = parseFloat(style.marginRight) || 0;

        chatHeader.style.left = rect.left + 'px';
        chatHeader.style.width = (rect.width - marginLeft - marginRight) + 'px';
    });
}