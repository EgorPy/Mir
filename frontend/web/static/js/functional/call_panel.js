/**
 * call_panel.js
 *
 * UI панели звонка (#callSection) + групповые аудиозвонки через WebSocket.
 *
 * Транспорт аудио: сырой PCM16 (моно, 16 кГц), кадры по 20 мс.
 *   Захват:        микрофон -> AudioWorklet (даунсэмплинг, VAD, Int16) -> WebSocket
 *   Воспроизведение: WebSocket -> Int16 -> AudioBuffer -> планирование по времени
 *                    AudioContext (jitter-буфер на каждого участника)
 *
 * Каждый кадр самодостаточен: нет заголовков, кластеров и init-чанков,
 * поэтому подключиться к звонку можно в любой момент, а mute не ломает поток.
 *
 * Публичное API:
 *   initCallPanel()   — вызвать один раз после загрузки DOM
 *   startCall(chat)   — открыть/развернуть панель и подключиться к звонку
 *   endCall()         — завершить звонок и скрыть панель
 *   toggleExpand()    — свернуть/развернуть панель
 *
 * Требуется HTTPS (или localhost): getUserMedia и AudioWorklet работают
 * только в secure context.
 */

import { getUserStates } from '../state/user_state.js';

// ─── Константы ────────────────────────────────────────────────────────────────

const WS_BASE = `${window.CALLS_URL.replace(/^http/, 'ws')}/ws`;
const PING_MS = 15_000;

// Формат аудио на проводе
const SAMPLE_RATE   = 16_000;                 // Гц, достаточно для речи
const FRAME_SAMPLES = 320;                    // 20 мс при 16 кГц
const FRAME_SEC     = FRAME_SAMPLES / SAMPLE_RATE;

// Jitter-буфер приёма
const JITTER_S   = 0.08;   // запас, с которым начинаем проигрывание после паузы/недогруза
const MAX_LEAD_S = 0.40;   // если очередь на воспроизведение длиннее — отбрасываем кадры

// VAD (не отправляем тишину)
const VAD_ENABLED         = true;
const VAD_THRESHOLD       = 0.008;  // RMS (~ -42 dBFS)
const VAD_HANGOVER_FRAMES = 15;     // 15 * 20 мс = 300 мс «хвоста» после речи

// ─── Код AudioWorklet (грузится через Blob, отдельный файл не нужен) ─────────

const CAPTURE_WORKLET_SRC = `
class PcmCapture extends AudioWorkletProcessor {
    constructor(options) {
        super();
        const o = options.processorOptions;
        this.ratio         = sampleRate / o.targetRate;   // sampleRate — глобал контекста
        this.frameSamples  = o.frameSamples;
        this.vadEnabled    = o.vadEnabled;
        this.vadThreshold  = o.vadThreshold;
        this.hangoverFrames = o.hangoverFrames;

        this.frame = new Int16Array(this.frameSamples);
        this.pos   = 0;
        this.phase = 0;
        this.acc   = 0;
        this.accN  = 0;
        this.sumSq = 0;
        this.hang  = 0;
    }

    process(inputs) {
        const ch = inputs[0] && inputs[0][0];
        if (!ch) return true;

        for (let i = 0; i < ch.length; i++) {
            // Даунсэмплинг усреднением (box-фильтр) — для речи достаточно
            this.acc += ch[i];
            this.accN++;
            this.phase += 1;
            if (this.phase < this.ratio) continue;
            this.phase -= this.ratio;

            let v = this.acc / this.accN;
            this.acc = 0;
            this.accN = 0;

            if (v > 1) v = 1; else if (v < -1) v = -1;
            this.sumSq += v * v;
            this.frame[this.pos++] = v < 0 ? v * 32768 : v * 32767;

            if (this.pos === this.frameSamples) this._flush();
        }
        return true;
    }

    _flush() {
        const rms = Math.sqrt(this.sumSq / this.frameSamples);
        this.sumSq = 0;
        this.pos   = 0;

        if (this.vadEnabled) {
            if (rms > this.vadThreshold)  this.hang = this.hangoverFrames;
            else if (this.hang > 0)       this.hang--;
            else                          return;      // тишина — кадр не отправляем
        }

        const buf = this.frame.buffer;
        this.frame = new Int16Array(this.frameSamples);
        this.port.postMessage(buf, [buf]);             // передаём без копирования
    }
}
registerProcessor('pcm-capture', PcmCapture);
`;

// ─── Состояние ────────────────────────────────────────────────────────────────

let ws            = null;
let myPeerId      = '';
let currentChatId = null;
let isMuted       = false;
let isExpanded    = false;
let inCall        = false;

let localStream   = null;
let audioCtx      = null;
let micSource     = null;
let captureNode   = null;
let silentGain    = null;
let pingInterval  = null;
let timerInterval = null;
let callSeconds   = 0;

/** @type {Map<string, {nextTime: number, speakingTimer: number|null}>} */
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

    const user = getUserStates();
    if (!user.user_id) {
        console.error('startCall: user.user_id not defined');
        return;
    }

    inCall        = true;
    currentChatId = chat.id;
    myPeerId      = String(user.user_id);

    chatNameEl.textContent = chat.title || 'Звонок';
    _show();
    _expand();

    // Карточку себя добавляем один раз; имя подтянется, когда придёт ответ
    _addPeerCard(myPeerId, true);
    _fetchUser(myPeerId).then(u => _updatePeerCard(myPeerId, u));

    // AudioContext создаём СИНХРОННО, пока действует жест пользователя
    // (Safari/iOS иначе оставят его в suspended).
    audioCtx = new AudioContext({ latencyHint: 'interactive' });
    audioCtx.resume().catch(() => {});

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
            video: false,
        });

        if (!inCall) {                       // успели нажать «завершить» во время запроса
            stream.getTracks().forEach(t => t.stop());
            return;
        }
        localStream = stream;

        await _setupCaptureGraph();
    } catch (err) {
        console.error('Не удалось получить микрофон / запустить аудио:', err);
        endCall();
        return;
    }

    if (!inCall) return;

    callSeconds = 0;
    _updateTimerEl();
    timerInterval = setInterval(() => { callSeconds++; _updateTimerEl(); }, 1000);

    ws = new WebSocket(`${WS_BASE}/${String(chat.id)}/${myPeerId}`);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
        audioCtx?.resume().catch(() => {});
        _startPing();
    };
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

    if (captureNode) {
        captureNode.port.onmessage = null;
        try { captureNode.disconnect(); } catch {}
        captureNode = null;
    }
    if (micSource) {
        try { micSource.disconnect(); } catch {}
        micSource = null;
    }
    if (silentGain) {
        try { silentGain.disconnect(); } catch {}
        silentGain = null;
    }

    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }

    for (const pid of [...peers.keys()]) _destroyPeer(pid);
    peers.clear();

    if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioCtx = null;
    }

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

// ─── Захват микрофона ────────────────────────────────────────────────────────

async function _setupCaptureGraph() {
    const url = URL.createObjectURL(
        new Blob([CAPTURE_WORKLET_SRC], { type: 'application/javascript' })
    );
    try {
        await audioCtx.audioWorklet.addModule(url);
    } finally {
        URL.revokeObjectURL(url);
    }

    micSource = audioCtx.createMediaStreamSource(localStream);

    captureNode = new AudioWorkletNode(audioCtx, 'pcm-capture', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        channelCountMode: 'explicit',
        processorOptions: {
            targetRate:     SAMPLE_RATE,
            frameSamples:   FRAME_SAMPLES,
            vadEnabled:     VAD_ENABLED,
            vadThreshold:   VAD_THRESHOLD,
            hangoverFrames: VAD_HANGOVER_FRAMES,
        },
    });

    // Кадр PCM16 приходит из аудио-потока; mute просто не отправляет его.
    // Кадры независимы, поэтому пропуск ничего не ломает.
    captureNode.port.onmessage = (e) => {
        if (isMuted) return;
        if (ws?.readyState !== WebSocket.OPEN) return;
        ws.send(e.data);
    };

    // Некоторые браузеры не вызывают process() у узла без пути к destination,
    // поэтому подключаем через нулевой gain.
    silentGain = audioCtx.createGain();
    silentGain.gain.value = 0;

    micSource.connect(captureNode);
    captureNode.connect(silentGain);
    silentGain.connect(audioCtx.destination);
}

// ─── Mute ─────────────────────────────────────────────────────────────────────

function toggleMute() {
    if (!localStream) return;
    isMuted = !isMuted;

    // Физически отключаем трек (индикатор микрофона в браузере гаснет/зажигается)
    localStream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });

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

    const card = document.createElement('div');
    card.className = 'call-peer-card' + (isMe ? ' me' : '');
    card.dataset.peerId = peerId;
    if (isMe) card.dataset.me = '1';

    // Имя пользователя вставляем через textContent, а не innerHTML (защита от XSS)
    card.innerHTML = `
        <div class="call-peer-avatar">
            <span class="call-peer-initial"></span>
            <div class="call-peer-muted-badge">${_iconMicOffSmall()}</div>
        </div>
        <span class="call-peer-name"></span>
    `;

    peersContainer.appendChild(card);
    _updatePeerCard(peerId, user);
}

function _updatePeerCard(peerId, user) {
    const card = peersContainer?.querySelector(`[data-peer-id="${peerId}"]`);
    if (!card) return;

    const isMe        = card.dataset.me === '1';
    const firstName   = user?.first_name || '';
    const initial     = (firstName || String(peerId)).charAt(0).toUpperCase();
    const displayName = isMe ? 'Вы' : (firstName || String(peerId));

    card.querySelector('.call-peer-initial').textContent = initial;
    card.querySelector('.call-peer-name').textContent    = displayName;
}

function _removePeerCard(peerId) {
    peersContainer?.querySelector(`[data-peer-id="${peerId}"]`)?.remove();
}

function _setPeerMuted(peerId, muted) {
    const card = peersContainer?.querySelector(`[data-peer-id="${peerId}"]`);
    if (card) card.classList.toggle('muted', muted);
}

function _markSpeaking(peerId, p) {
    const card = peersContainer?.querySelector(`[data-peer-id="${peerId}"]`);
    if (!card) return;

    card.classList.add('speaking');
    clearTimeout(p.speakingTimer);
    p.speakingTimer = setTimeout(() => card.classList.remove('speaking'), 400);
}

// ─── Сигналинг ────────────────────────────────────────────────────────────────

function _handleSignaling(msg) {
    switch (msg.type) {
        case 'joined':
            msg.peers
                .filter(pid => pid !== myPeerId)
                .forEach(pid => {
                _addPeerCard(pid, false);
                _fetchUser(pid).then(user => _updatePeerCard(pid, user));
            });
            break;

        case 'peer_joined':
            _addPeerCard(msg.peer_id, false);
            _fetchUser(msg.peer_id).then(user => _updatePeerCard(msg.peer_id, user));
            break;

        case 'peer_left':
            _destroyPeer(msg.peer_id);
            _removePeerCard(msg.peer_id);
            break;

        case 'peer_muted':
            _setPeerMuted(msg.peer_id, msg.muted);
            break;

        case 'error':
            console.error('Сервер звонков вернул ошибку:', msg.message);
            break;
    }
}

// ─── Воспроизведение ─────────────────────────────────────────────────────────

/** Бинарный фрейм: [1 байт: длина peer_id][peer_id UTF-8][PCM16 LE] */
function _parseFrame(ab) {
    const view  = new DataView(ab);
    const idLen = view.getUint8(0);
    return {
        peerId: new TextDecoder().decode(new Uint8Array(ab, 1, idLen)),
        audio:  ab.slice(1 + idLen),      // новая копия -> выровнена по 2 байтам
    };
}

function _handleIncomingAudio(ab) {
    if (!audioCtx || audioCtx.state === 'closed') return;

    const { peerId, audio } = _parseFrame(ab);
    const samples = audio.byteLength >> 1;
    if (!samples) return;

    let p = peers.get(peerId);
    if (!p) {
        p = { nextTime: 0, speakingTimer: null };
        peers.set(peerId, p);
    }

    // Int16 -> Float32
    const pcm = new Int16Array(audio, 0, samples);
    const buf = audioCtx.createBuffer(1, samples, SAMPLE_RATE);
    const out = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) out[i] = pcm[i] / 32768;

    // Jitter-буфер: каждый кадр ставим «встык» за предыдущим
    const now = audioCtx.currentTime;

    if (p.nextTime < now + 0.005) {
        // Очередь опустела (пауза в речи / сеть задержала кадры) —
        // начинаем заново с небольшим запасом
        p.nextTime = now + JITTER_S;
    } else if (p.nextTime - now > MAX_LEAD_S) {
        // Накопилась задержка (пачка кадров после лага TCP) — выбрасываем,
        // чтобы не отставать от «живого» звука
        return;
    }

    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(p.nextTime);
    p.nextTime += buf.duration;

    _markSpeaking(peerId, p);
}

function _destroyPeer(peerId) {
    const p = peers.get(peerId);
    if (!p) return;
    clearTimeout(p.speakingTimer);
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
