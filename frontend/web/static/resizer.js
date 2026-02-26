import { adjustChatHeader } from './chat_title.js'

(function() {
    const resizer = document.querySelector('.resizer');
    const chats = document.querySelector('.chats');
    const actualChat = document.querySelector('.actual-chat');
    let startX, startWidth;

    resizer.addEventListener('mousedown', initDrag);

    function initDrag(e) {
        startX = e.clientX;
        startWidth = chats.offsetWidth;
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    }

    function doDrag(e) {
        const width = startWidth + (e.clientX - startX);
        chats.style.width = width + 'px';
        chats.style.flex = 'none';
        actualChat.style.flex = '1';
        adjustChatHeader();
    }

    function stopDrag() {
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('mouseup', stopDrag);
    }
})();
