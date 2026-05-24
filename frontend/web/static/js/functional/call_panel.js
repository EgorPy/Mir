/**
 * call_panel.js
 *
 * Управляет UI панели звонка (#callSection) и интегрирует WebSocket-логику
 * групповых аудиозвонков.
 *
 * Публичное API:
 *   initCallPanel()   — вызвать один раз после загрузки DOM
 *   startCall(chat)   — открыть/развернуть панель и подключиться к звонку
 *   endCall()         — завершить звонок и скрыть панель
 */

import { getUserStates } from '../state/user_state.js';

// ─── Константы ────────────────────────────────────────────────────────────────

const WS_BASE  = `ws://${window.location.hostname}:8001/ws`;
const CHUNK_MS = 100;
const PING_MS  = 15_000;

const RECORD_MIME = (() => {
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
    ];
    return candidates.find(m => MediaRecorder.isTypeSupported(m)) ?? '';
})();

// ─── Состояние ────────────────────────────────────────────────────────────────

let ws            = null;
let myPeerId      = '';
let myFirstName   = '';
let currentChatId = null;
let isMuted       = false;
let isExpanded    = false;
let inCall        = false;

let mediaRecorder = null;
let localStream   = null;
let audioCtx      = null;
let pingInterval  = null;
let timerInterval = null;
let callSeconds   = 0;

/** @type {Map<string, {queue: ArrayBuffer[], sourceBuffer: SourceBuffer|null, mediaSource: MediaSource|null, playing: boolean, audio: HTMLAudioElement|null}>} */
const peers = new Map();

// ─── DOM-ссылки ───────────────────────────────────────────────────────────────

let callSection    = null;
let collapsedBar   = null;
let timerSmallEl   = null;
let chatNameEl     = null;
let timerEl        = null;
let peersContainer = null;
let btnMute        = null;
let btnHangup      = null;

// ─── Инициализация ────────────────────────────────────────────────────────────

export function initCallPanel() {
    callSection = document.getElementById('callSection');
    if (!callSection) return;

    _buildDOM();
    _bindEvents();
}

function _buildDOM() {
    callSection.innerHTML = `
        <div class="call-collapsed-bar" id="callCollapsedBar">
            <span class="call-label">Звонок</span>
            <span style="flex:1"></span>
            <span class="call-timer-small" id="callTimerSmall">00:00</span>
            <span class="call-chevron">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            </span>
        </div>

        <div class="call-expanded-body" id="callExpandedBody">
            <div class="call-title-row">
                <span class="call-chat-name" id="callChatName">Звонок</span>
                <span class="call-timer" id="callTimer">00:00</span>
            </div>

            <div class="call-divider"></div>

            <div class="call-peers" id="callPeers"></div>

            <div class="call-controls">
                <button class="call-btn call-btn-mute" id="callBtnMute" title="Выключить микрофон" aria-label="Выключить микрофон">
                    ${_iconMicOn()}
                </button>
                <button class="call-btn call-btn-hangup" id="callBtnHangup" title="Завершить звонок" aria-label="Завершить звонок">
                    ${_iconHangup()}
                </button>
            </div>
        </div>
    `;

    collapsedBar   = document.getElementById('callCollapsedBar');
    timerSmallEl   = document.getElementById('callTimerSmall');
    chatNameEl     = document.getElementById('callChatName');
    timerEl        = document.getElementById('callTimer');
    peersContainer = document.getElementById('callPeers');
    btnMute        = document.getElementById('callBtnMute');
    btnHangup      = document.getElementById('callBtnHangup');
}

function _bindEvents() {
    collapsedBar.addEventListener('click', toggleExpand);
    btnMute.addEventListener('click',   (e) => { e.stopPropagation(); toggleMute(); });
    btnHangup.addEventListener('click', (e) => { e.stopPropagation(); endCall(); });
}

// ─── Публичное API ────────────────────────────────────────────────────────────

export async function startCall(chat) {
    if (inCall) {
        _show();
        _expand();
        return;
    }

    currentChatId = chat.id;

    const user = getUserStates();
    if (!user.user_id) {
        console.error('startCall: user.user_id not defined');
        return;
    }
    myPeerId    = String(user.user_id);
    _fetchUser(myPeerId).then(u => _addPeerCard(myPeerId, true, u));

    chatNameEl.textContent = chat.title || 'Звонок';

    _show();
    _expand();

    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: false,
        });
    } catch (err) {
        console.error('Нет доступа к микрофону:', err);
        _hide();
        return;
    }

    audioCtx = new AudioContext();
    inCall   = true;

    _addPeerCard(myPeerId, true);

    callSeconds   = 0;
    _updateTimerEl();
    timerInterval = setInterval(() => { callSeconds++; _updateTimerEl(); }, 1000);

    const callId = String(chat.id);
    ws = new WebSocket(`${WS_BASE}/${callId}/${myPeerId}`);
    ws.binaryType = 'arraybuffer';

    ws.onopen    = () => { _startRecording(); _startPing(); };
    ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') _handleSignaling(JSON.parse(ev.data));
        else                             _handleIncomingAudio(ev.data);
    };
    ws.onclose = () => { if (inCall) endCall(); };
    ws.onerror = (e) => console.error('WS error', e);
}

export function endCall() {
    inCall = false;

    clearInterval(timerInterval);
    clearInterval(pingInterval);
    timerInterval = null;
    pingInterval  = null;

    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    mediaRecorder = null;

    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }

    if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioCtx = null;
    }

    for (const pid of [...peers.keys()]) _destroyPeerAudio(pid);
    peers.clear();

    if (ws) {
        ws.onclose = null;
        ws.close(1000, 'user left');
        ws = null;
    }

    if (peersContainer) peersContainer.innerHTML = '';

    isMuted = false;
    _syncMuteBtn();

    _collapse();
    setTimeout(() => { if (!inCall) _hide(); }, 400);
}

// ─── Show / Hide / Expand / Collapse ─────────────────────────────────────────

function _show() {
    callSection.classList.add('visible');
}

function _hide() {
    callSection.classList.remove('visible');
    callSection.classList.remove('expanded');
    isExpanded = false;
}

export function toggleExpand() {
    if (isExpanded) _collapse();
    else            _expand();
}

function _expand() {
    isExpanded = true;
    callSection.classList.add('expanded');
}

function _collapse() {
    isExpanded = false;
    callSection.classList.remove('expanded');
}

// ─── Mute ─────────────────────────────────────────────────────────────────────

function toggleMute() {
    if (!localStream) return;
    isMuted = !isMuted;
    _syncMuteBtn();

    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'mute', muted: isMuted }));
    }
}

function _syncMuteBtn() {
    if (!btnMute) return;

    if (isMuted) {
        btnMute.innerHTML = _iconMicOff();
        btnMute.classList.add('muted');
        btnMute.title = 'Включить микрофон';
        btnMute.setAttribute('aria-label', 'Включить микрофон');
    } else {
        btnMute.innerHTML = _iconMicOn();
        btnMute.classList.remove('muted');
        btnMute.title = 'Выключить микрофон';
        btnMute.setAttribute('aria-label', 'Выключить микрофон');
    }

    const myCard = peersContainer?.querySelector(`[data-peer-id="${myPeerId}"]`);
    if (myCard) myCard.classList.toggle('muted', isMuted);
}

// ─── Участники ────────────────────────────────────────────────────────────────

async function _fetchUser(userId) {
    try {
        const res  = await fetch(`${window.BACKEND_URL}/chats/users/${userId}`);
        const data = await res.json();
        return data.ok ? data.user : null;
    } catch {
        return null;
    }
}

function _addPeerCard(peerId, isMe = false, user = null) {
    if (peersContainer?.querySelector(`[data-peer-id="${peerId}"]`)) return;

    const firstName   = user?.first_name || '';
    const initial     = (firstName || String(peerId)).charAt(0).toUpperCase();
    const displayName = isMe ? 'Вы' : (firstName || String(peerId));

    const card = document.createElement('div');
    card.className = 'call-peer-card' + (isMe ? ' me' : '');
    card.dataset.peerId = peerId;

    card.innerHTML = `
        <div class="call-peer-avatar">
            <span>${initial}</span>
            <div class="call-peer-muted-badge">${_iconMicOffSmall()}</div>
        </div>
        <span class="call-peer-name">${displayName}</span>
    `;

    peersContainer.appendChild(card);
}

function _removePeerCard(peerId) {
    peersContainer?.querySelector(`[data-peer-id="${peerId}"]`)?.remove();
}

function _setPeerMuted(peerId, muted) {
    const card = peersContainer?.querySelector(`[data-peer-id="${peerId}"]`);
    if (card) card.classList.toggle('muted', muted);
}

// ─── Сигналинг ────────────────────────────────────────────────────────────────

function _handleSignaling(msg) {
    switch (msg.type) {
        case 'joined':
            msg.peers
                .filter(pid => pid !== myPeerId)
                .forEach(pid => {
                _initPeerAudio(pid);
                _fetchUser(pid).then(user => _addPeerCard(pid, false, user));
            });
            break;
        case 'peer_joined':
            _initPeerAudio(msg.peer_id);
            _fetchUser(msg.peer_id).then(user => _addPeerCard(msg.peer_id, false, user));
            break;
        case 'peer_left':
            _destroyPeerAudio(msg.peer_id);
            _removePeerCard(msg.peer_id);
            break;
        case 'peer_muted':
            _setPeerMuted(msg.peer_id, msg.muted);
            break;
    }
}

// ─── Запись ───────────────────────────────────────────────────────────────────

function _startRecording() {
    mediaRecorder = new MediaRecorder(
        localStream,
        RECORD_MIME ? { mimeType: RECORD_MIME } : {}
    );

    mediaRecorder.ondataavailable = async (e) => {
        if (!e.data.size) return;
        if (ws?.readyState !== WebSocket.OPEN) return;
        if (isMuted) return;
        ws.send(await e.data.arrayBuffer());
    };

    mediaRecorder.start(CHUNK_MS);
}

// ─── Воспроизведение ─────────────────────────────────────────────────────────

function _parseFrame(ab) {
    const view  = new DataView(ab);
    const idLen = view.getUint8(0);
    return {
        peerId: new TextDecoder().decode(ab.slice(1, 1 + idLen)),
        audio:  ab.slice(1 + idLen),
    };
}

function _handleIncomingAudio(ab) {
    const { peerId, audio } = _parseFrame(ab);
    const p = peers.get(peerId);
    if (!p?.playing) return;
    p.queue.push(audio);
    _flushQueue(peerId);
}

function _initPeerAudio(peerId) {
    let p = peers.get(peerId);
    if (!p) { p = {}; peers.set(peerId, p); }

    p.queue        = [];
    p.sourceBuffer = null;
    p.mediaSource  = null;
    p.playing      = true;

    const audio = document.createElement('audio');
    audio.autoplay    = true;
    audio.playsInline = true;
    document.body.appendChild(audio);
    p.audio = audio;

    const ms = new MediaSource();
    p.mediaSource = ms;
    audio.src = URL.createObjectURL(ms);

    ms.addEventListener('sourceopen', () => {
        if (p.mediaSource !== ms) return;
        try {
            const sb = ms.addSourceBuffer(RECORD_MIME || 'audio/webm;codecs=opus');
            sb.mode = 'sequence';
            p.sourceBuffer = sb;
            sb.addEventListener('updateend', () => _flushQueue(peerId));
            _flushQueue(peerId);
        } catch (e) {
            console.warn('addSourceBuffer failed:', e);
        }
    });
}

function _flushQueue(peerId) {
    const p = peers.get(peerId);
    if (!p?.sourceBuffer || !p?.mediaSource) return;
    if (p.mediaSource.readyState !== 'open') return;
    if (p.sourceBuffer.updating) return;
    if (!p.queue?.length) return;
    try {
        p.sourceBuffer.appendBuffer(p.queue.shift());
    } catch (e) {
        console.warn('appendBuffer failed:', e);
        p.queue = [];
    }
}

function _destroyPeerAudio(peerId) {
    const p = peers.get(peerId);
    if (!p) return;

    p.playing = false;
    p.queue   = [];

    if (p.audio) {
        p.audio.pause();
        p.audio.src = '';
        p.audio.remove();
        p.audio = null;
    }

    if (p.mediaSource) {
        try { if (p.mediaSource.readyState === 'open') p.mediaSource.endOfStream(); } catch {}
        p.mediaSource = null;
    }

    p.sourceBuffer = null;
    peers.delete(peerId);
}

// ─── Ping ─────────────────────────────────────────────────────────────────────

function _startPing() {
    pingInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
        }
    }, PING_MS);
}

// ─── Таймер ───────────────────────────────────────────────────────────────────

function _updateTimerEl() {
    const pad = (n) => String(n).padStart(2, '0');
    const s   = callSeconds % 60;
    const m   = Math.floor(callSeconds / 60) % 60;
    const h   = Math.floor(callSeconds / 3600);
    const str = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

    if (timerEl)      timerEl.textContent      = str;
    if (timerSmallEl) timerSmallEl.textContent = str;
}

// ─── Иконки ──────────────────────────────────────────────────────────────────

function _iconMicOn() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>`;
}

function _iconMicOff() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>`;
}

function _iconMicOffSmall() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" width="10" height="10">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
    </svg>`;
}

function _iconHangup() {
    return `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
    </svg>`;
}
