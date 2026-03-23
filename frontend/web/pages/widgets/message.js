export default `
<div class="message" data-message-id="" data-chat-id="" data-is-favorite="false">
    <div class="message-main">
        <div class="message-top">
            <span class="message-author"></span>
            <span class="message-type"></span>
            <span class="message-forwarded" title="Forwarded">Переслано</span>
            <span class="message-favorite-indicator" title="Favorite">&#9733;</span>
        </div>
        <div class="message-text"></div>
        <div class="message-reactions">
        </div>
        <div class="message-bottom">
            <span class="message-date"></span>
            <span class="message-read">
                <div class="read">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
                      <polyline points="2 8 8 14 18 2"/>
                      <polyline points="6 8 12 14 22 2"/>
                    </svg>
                </div>
                <div class="unread">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
                      <polyline points="2 8 8 14 18 2"/>
                    </svg>
                </div>
            </span>
        </div>
    </div>
</div>`