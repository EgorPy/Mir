import { BACKEND_URL } from '../config.js';
import { getChatState, setChatState, getChatStates } from '../state/chat_state.js';
import { closeSearch } from '../visual/search_lens.js'
import { renderChats, fetchChats } from './load_chats.js'
import chatTemplateHtml from '/pages/widgets/chat.js';

async function searchChat() {
    const public_id = searchInput.value

    if (public_id === "" || public_id == null) {
        const chats = await fetchChats();
        renderChats(chats, {
            container: document.querySelector('#chats'),
            emptyElement: document.querySelector('.no-chats-yet'),
            loadingElement: document.querySelector('.chats-loading')
        });
        closeSearch()
        return
    }
    overlay.classList.remove("active")

    const response = await fetch(`${BACKEND_URL}/chats/search/${public_id}`, {
        method: "GET",
        credentials: "include",
        headers: {
            'Content-Type': 'application/json'
        }
    })

    const jsonObj = await response.json()
    const chats = jsonObj.chats
    renderChats(chats, {
        container: document.querySelector('#chats'),
        emptyElement: document.querySelector('#searchChatsNotFound'),
        loadingElement: document.querySelector('#searchChatsSearching')
    });
}

function handleKeyPress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        searchChat();
    }
}

async function fetchChatData(chatId) {
    const response = await fetch(`${BACKEND_URL}/chats/${chatId}/info`, {
        method: 'GET',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'}
    })
    return response.json()
}

const chatsList = document.querySelector('.chats');
const searchInput = document.querySelector("#searchChatPublicId")
const lens = document.querySelector("#lens")
const appName = document.querySelector(".app-name")
const overlay = document.getElementById('overlay');
const searchList = document.querySelector("#searchChatsList")
const searchChatsNotFound = document.querySelector("#searchChatsNotFound")
const searchChatsSearching = document.querySelector("#searchChatsSearching")
searchInput.addEventListener("submit", searchChat)
searchInput.addEventListener("keypress", handleKeyPress)

const tempDiv = document.createElement('div')
tempDiv.innerHTML = chatTemplateHtml
const chatTemplate = tempDiv.firstElementChild
