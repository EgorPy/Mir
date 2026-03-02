const lens = document.querySelector("#lens")
const appName = document.querySelector(".app-name")
const searchInput = document.querySelector("#searchChatPublicId")
const overlay = document.getElementById('overlay');
const burgerBtn = document.getElementById('burgerBtn');
const appHeader = document.querySelector(".app-header")
const menuName = appHeader.querySelector(".menu-name")

export function openSearch() {
    appHeader.style.justifyContent = "center"
    menuName.style.width = "100%"
    burgerBtn.style.display = "none"
    searchInput.style.display = "block"
    lens.style.display = "none"
    appName.style.display = "none"
    overlay.classList.add('active')
}

export function closeSearch () {
    appHeader.style.justifyContent = "space-between"
    menuName.style.width = "auto"
    burgerBtn.style.display = "block"
    if (window.innerWidth <= 768) {
        lens.style.display = "flex"
        searchInput.style.display = "none"
    }
    appName.style.display = "block"
    overlay.classList.remove('active')
}

lens.addEventListener("click", openSearch)
overlay.addEventListener("click", closeSearch)
