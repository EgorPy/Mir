(function() {
    const actualChat = document.querySelector('.actual-chat');
    const closeBtn = document.querySelector('.close-chat-btn');
    const chatsContainer = document.querySelector('#chats');

    function isMobile() {
        return window.innerWidth <= 768;
    }

    function openChatMobile() {
        if (!isMobile()) return;
        actualChat.classList.add('active');
    }

    function closeChatMobile() {
        if (!isMobile()) return;
        actualChat.classList.remove('active');
    }

    chatsContainer.addEventListener('click', function(e) {
        const chat = e.target.closest('.chat-main');
        if (!chat) return;
        openChatMobile();
    });

    closeBtn.addEventListener('click', closeChatMobile);
})();