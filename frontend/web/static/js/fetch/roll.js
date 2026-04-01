/**
 * roll.js
 * Модуль страницы роллов.
 */

/* ─── helpers ─────────────────────────────────────────────── */

function $(id) { return document.getElementById(id); }

function openModal(el)  { el.classList.add('open'); }
function closeModal(el) { el.classList.remove('open'); }

function guessMime(base64) {
    const raw = atob(base64.slice(0, 12));
    const b = (i) => raw.charCodeAt(i);
    if (b(0) === 0xFF && b(1) === 0xD8) return 'image/jpeg';
    if (b(0) === 0x89 && raw.slice(1,4) === 'PNG') return 'image/png';
    if (raw.slice(0,4) === 'GIF8') return 'image/gif';
    if (b(0) === 0x00 && b(1) === 0x00 && b(2) === 0x00 && b(4) === 'f'.charCodeAt(0)) return 'video/mp4';
    if (raw.slice(0,4) === 'ftyp') return 'video/mp4';
    if (raw.slice(4,8) === 'ftyp')  return 'video/mp4';
    if (b(0) === 0x1A && b(1) === 0x45 && b(2) === 0xDF && b(3) === 0xA3) return 'video/webm';
    return null;
}

function base64ToBlob(base64, mime) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

function isVideo(mime) {
    return mime && mime.startsWith('video/');
}

/* ─── DOM refs ─────────────────────────────────────────────── */

const rollImage      = $('rollImage');
const rollVideo      = $('rollVideo');
const rollLoader     = $('rollLoader');
const rollEmpty      = $('rollEmpty');
const rollInfo       = $('rollInfo');
const rollAuthor     = $('rollAuthor');
const rollViewsCount = $('rollViewsCount');
const rollNextBtn    = $('rollNextBtn');

const createRollModal  = $('createRollModal');
const myRollsModal     = $('myRollsModal');
const createRollBtn    = $('createRollBtn');
const myRollStatsBtn   = $('myRollStatsBtn');
const closeCreateModal = $('closeCreateModal');
const cancelCreateBtn  = $('cancelCreateBtn');
const closeStatsModal  = $('closeStatsModal');

const fileInput     = $('fileInput');
const uploadZone    = $('uploadZone');
const uploadLabel   = $('uploadLabel');
const uploadPreview = $('uploadPreview');
const previewImg    = $('previewImg');
const previewVid    = $('previewVid');
const removeFileBtn = $('removeFile');
const submitRollBtn = $('submitRollBtn');
const createError   = $('createError');
const myRollsList   = $('myRollsList');
const rollMuteBtn   = $('rollMuteBtn');
const iconSound     = $('iconSound');
const iconMuted     = $('iconMuted');

/* ─── STATE ────────────────────────────────────────────────── */

let currentFile    = null;
let currentBlobUrl = null;
let isMuted        = true;

/* ─── TAP-TO-UNMUTE HINT ────────────────────────────────────── */
// На мобильном Chrome unmute должен происходить синхронно в обработчике
// жеста прямо на конкретном элементе. Document-level listeners часто
// не засчитываются браузером как валидный user gesture для аудио.

const tapHint = document.createElement('div');
tapHint.innerHTML = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
  </svg>
  Нажмите для звука`;
tapHint.style.cssText = `
  position:fixed; bottom:88px; left:50%; transform:translateX(-50%);
  background:rgba(0,0,0,.6); backdrop-filter:blur(8px);
  color:#fff; font-size:13px; font-family:inherit; font-weight:500;
  padding:9px 18px; border-radius:999px;
  display:none; align-items:center; gap:8px;
  cursor:pointer; z-index:999;
  border:1px solid rgba(255,255,255,.18);
  user-select:none; -webkit-user-select:none;`;
document.body.appendChild(tapHint);

function showTapHint() { tapHint.style.display = 'flex'; }
function hideTapHint() { tapHint.style.display = 'none'; }

function doUnmute() {
    isMuted = false;
    rollVideo.muted = false;
    if (rollVideo.src && rollVideo.paused) rollVideo.play().catch(() => {});
    updateMuteIcon();
    hideTapHint();
}

tapHint.addEventListener('click',    doUnmute);
tapHint.addEventListener('touchend', (e) => { e.preventDefault(); doUnmute(); });

/* ─── LOAD ROLL ─────────────────────────────────────────────── */

async function loadRoll() {
    rollInfo.classList.remove('visible');
    rollLoader.style.display = 'flex';
    rollImage.style.display  = 'none';
    rollVideo.style.display  = 'none';
    rollEmpty.style.display  = 'none';

    if (rollVideo.src && rollVideo.src.startsWith('blob:')) {
        URL.revokeObjectURL(rollVideo.src);
        rollVideo.src = '';
    }

    let data;
    try {
        const res = await fetch(`${window.BACKEND_URL}/roll/random`, { credentials: 'include' });
        if (res.status === 401) { window.location.href = '/login'; return; }
        if (!res.ok) throw new Error('Ошибка сервера');
        data = await res.json();
        if (!data || data.ok === false) { showEmpty(); return; }
    } catch (e) {
        showEmpty();
        return;
    }

    if (!data || !data.content) { showEmpty(); return; }

    rollLoader.style.display = 'none';

    const base64 = data.content;
    const mime   = guessMime(base64) || 'image/jpeg';
    const blob   = base64ToBlob(base64, mime);
    const url    = URL.createObjectURL(blob);

    if (isVideo(mime)) {
        rollVideo.src   = url;
        rollVideo.muted = isMuted;
        rollVideo.style.display = 'block';
        rollVideo.load();
        rollVideo.play().catch(() => {});
        rollMuteBtn.style.display = 'flex';
        // Показываем подсказку только если ещё muted
        if (isMuted) showTapHint();
    } else {
        rollImage.src = url;
        rollImage.style.display = 'block';
        rollMuteBtn.style.display = 'none';
        hideTapHint();
    }

    updateMuteIcon();

    if (data.author) {
        rollAuthor.textContent = `Вас зароллил ${data.author.first_name} ${data.author.last_name}!`;
    } else {
        rollAuthor.textContent = `Пользователь #${data.user_id}`;
    }

    let rolled = [];
    try {
        rolled = typeof data.rolled === 'string' ? JSON.parse(data.rolled) : (data.rolled || []);
    } catch (_) {}
    rollViewsCount.textContent = rolled.length;

    rollInfo.classList.add('visible');
}

function showEmpty() {
    rollLoader.style.display = 'none';
    rollEmpty.style.display  = 'flex';
}

/* ─── NEXT ROLL ─────────────────────────────────────────────── */

rollNextBtn.addEventListener('click', loadRoll);

function updateMuteIcon() {
    iconSound.style.display = isMuted ? 'none'  : 'block';
    iconMuted.style.display = isMuted ? 'block' : 'none';
}

rollMuteBtn.addEventListener('click', () => {
    if (isMuted) {
        doUnmute();
    } else {
        isMuted = true;
        rollVideo.muted = true;
        updateMuteIcon();
    }
});

/* Свайп на мобильном (вверх = следующий ролл) */
let touchStartY = 0;
document.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
document.addEventListener('touchend', (e) => {
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (dy > 60) loadRoll();
}, { passive: true });

/* ─── CREATE ROLL MODAL ─────────────────────────────────────── */

function openCreateModal() { resetCreateForm(); openModal(createRollModal); }
function closeCreateModalFn() { closeModal(createRollModal); resetCreateForm(); }

createRollBtn.addEventListener('click', openCreateModal);
closeCreateModal.addEventListener('click', closeCreateModalFn);
cancelCreateBtn.addEventListener('click', closeCreateModalFn);
createRollModal.addEventListener('click', (e) => { if (e.target === createRollModal) closeCreateModalFn(); });

uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file);
});

fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFileSelected(fileInput.files[0]); });

function handleFileSelected(file) {
    const MAX = 50 * 1024 * 1024;
    if (file.size > MAX) { showCreateError('Файл слишком большой (максимум 50 МБ)'); return; }
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime'];
    if (!allowed.includes(file.type)) { showCreateError('Неподдерживаемый тип файла'); return; }

    currentFile = file;
    if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = URL.createObjectURL(file);

    hideCreateError();
    uploadZone.style.display    = 'none';
    uploadPreview.style.display = 'flex';

    if (file.type.startsWith('video/')) {
        previewImg.style.display = 'none';
        previewVid.src = currentBlobUrl;
        previewVid.style.display = 'block';
    } else {
        previewVid.style.display = 'none';
        previewImg.src = currentBlobUrl;
        previewImg.style.display = 'block';
    }
    submitRollBtn.disabled = false;
}

removeFileBtn.addEventListener('click', resetCreateForm);

function resetCreateForm() {
    currentFile = null;
    if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
    fileInput.value = '';
    previewImg.src = previewVid.src = '';
    previewImg.style.display    = 'none';
    previewVid.style.display    = 'none';
    uploadPreview.style.display = 'none';
    uploadZone.style.display    = '';
    submitRollBtn.disabled = true;
    hideCreateError();
}

function showCreateError(msg) { createError.textContent = msg; createError.style.display = 'block'; }
function hideCreateError()    { createError.style.display = 'none'; }

submitRollBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    submitRollBtn.disabled = true;
    submitRollBtn.textContent = 'Загрузка...';
    hideCreateError();
    try {
        const formData = new FormData();
        formData.append('file', currentFile);
        const res  = await fetch(`${window.BACKEND_URL}/roll/new_roll`, { method: 'POST', credentials: 'include', body: formData });
        const json = await res.json();
        if (!json.ok) throw new Error('Ошибка при создании ролла');
        closeCreateModalFn();
        loadRoll();
    } catch (e) {
        showCreateError(e.message || 'Что-то пошло не так');
        submitRollBtn.disabled = false;
        submitRollBtn.textContent = 'Опубликовать';
    }
});

/* ─── MY ROLLS STATS MODAL ──────────────────────────────────── */

myRollStatsBtn.addEventListener('click', async () => { openModal(myRollsModal); await loadMyRollsStats(); });
closeStatsModal.addEventListener('click', () => closeModal(myRollsModal));
myRollsModal.addEventListener('click', (e) => { if (e.target === myRollsModal) closeModal(myRollsModal); });

async function loadMyRollsStats() {
    myRollsList.innerHTML = '<div class="r-stats-loading">Загрузка...</div>';
    let rolls;
    try {
        const res = await fetch(`${window.BACKEND_URL}/roll/my_rolls`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        rolls = await res.json();
    } catch {
        myRollsList.innerHTML = '<div class="r-stats-empty">Не удалось загрузить данные</div>';
        return;
    }
    if (!rolls || rolls.length === 0) {
        myRollsList.innerHTML = '<div class="r-stats-empty">У вас пока нет роллов</div>';
        return;
    }
    myRollsList.innerHTML = '';
    for (const roll of rolls) {
        let rolled = [];
        try { rolled = typeof roll.rolled === 'string' ? JSON.parse(roll.rolled) : (roll.rolled || []); } catch (_) {}

        const item = document.createElement('div');
        item.className = 'r-stats-item';

        // Контент больше не приходит — показываем нейтральный placeholder
        const thumbHTML = `
        <div class="r-stats-item__thumb r-stats-item__thumb--placeholder">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
            </svg>
        </div>`;

        item.innerHTML = `${thumbHTML}
        <div class="r-stats-item__info">
            <div class="r-stats-item__id">Ролл #${roll.id}</div>
            <div class="r-stats-item__count">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                ${rolled.length} ${pluralViews(rolled.length)}
            </div>
        </div>`;

        myRollsList.appendChild(item);
    }
}

function pluralViews(n) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'просмотр';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'просмотра';
    return 'просмотров';
}

/* ─── INIT ──────────────────────────────────────────────────── */

loadRoll();
