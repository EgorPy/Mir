import { loadFirstName } from '../fetch/load_first_name.js'

const burgerBtn = document.getElementById('burgerBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const profileName = document.getElementById("profileName")

function toggleSidebar() {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');

    if (sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

function closeSidebar() {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

burgerBtn.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('active')) {
        closeSidebar();
    }
});

const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
sidebarLinks.forEach(link => {
    link.addEventListener('click', closeSidebar);
});

document.addEventListener("DOMContentLoaded", loadFirstName)
