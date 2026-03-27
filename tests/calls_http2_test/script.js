"use strict";

// ============================================================================
// CONFIG
// ============================================================================
const CONFIG = {
    serverUrl:          "http://localhost:8000",
    sendIntervalMs:     60,
    sendTimeoutMs:      3000,
    audioBitsPerSecond: 32000,
    // Drop audio if scheduled playback cursor drifts this many seconds ahead
    // of the real-time clock.  Lower = less latency, higher = fewer glitches.
    maxLatencySeconds:  1.2,
};

// Pick the best MIME type supported by this browser's MediaRecorder.
// decodeAudioData is used for playback, so no MediaSource check is needed.
const RECORD_MIME = (() => {
    const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
    ];
    return candidates.find(m => MediaRecorder.isTypeSupported(m)) ?? "";
})();

// ============================================================================
// STATE  (all mutable variables in one place)
// ============================================================================
let callId   = "";
let myPeerId = "";
let isMuted  = false;

let mediaStream    = null;
let mediaRecorder  = null;
let sendInterval   = null;
let eventSource    = null;
let recvController = null;
let volAnimId      = null;

// Created inside joinCall() — after the user gesture — to satisfy browsers
// that block AudioContext construction before interaction.
/** @type {AudioContext|null} */
let audioCtx = null;

/** @type {AnalyserNode|null} */
let analyser = null;

// peers[peerId] = { el: HTMLElement }
const peers = new Map();

// players[peerId] = { nextTime: number }
// nextTime is the AudioContext timestamp at which the next chunk should start.
const players = new Map();

// ============================================================================
// UI BOOTSTRAP
// ============================================================================
document.getElementById("join-btn").addEventListener("click", joinCall);
document.getElementById("hangup-btn").addEventListener("click", hangUp);
document.getElementById("mic-btn").addEventListener("click", toggleMute);

["room-input", "peer-input"].forEach(id =>
document.getElementById(id).addEventListener("keydown", e => {
    if (e.key === "Enter") joinCall();
})
);

document.getElementById("room-input").value = "room-" + Math.random().toString(36).slice(2, 6);
document.getElementById("peer-input").value = "user-" + Math.random().toString(36).slice(2, 6);

async function joinCall() {
    callId   = document.getElementById("room-input").value.trim();
    myPeerId = document.getElementById("peer-input").value.trim();
    if (!callId || !myPeerId) { showError("Заполните оба поля"); return; }

    log("sys", "Запрашиваем доступ к микрофону…");
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
            video: false,
        });
    } catch (e) {
        showError(`Нет доступа к микрофону: ${e.message}`);
        return;
    }

    // AudioContext must be created after a user gesture or browsers will
    // warn / suspend it immediately.
    audioCtx = new AudioContext();

    log("ok", `Микрофон получен. Кодек: ${RECORD_MIME || "browser default"}`);

    document.getElementById("join-screen").style.display = "none";
    document.getElementById("call-screen").style.display = "block";
    document.getElementById("hdr-room").textContent = callId;

    addPeerTile(myPeerId, /* isMe */ true);
    setupVolumeAnalyser();
    connectSignaling();
    startSending();
}

// ============================================================================
// SIGNALING  — Server-Sent Events
// ============================================================================
function connectSignaling() {
    eventSource = new EventSource(
        `${CONFIG.serverUrl}/events/${callId}/${myPeerId}`
    );

    eventSource.addEventListener("joined", e => {
        const data = JSON.parse(e.data);
        log("ok", `В комнате: ${data.peers.length ? data.peers.join(", ") : "только вы"}`);
        data.peers.forEach(pid => { if (pid !== myPeerId) addPeerTile(pid); });
        updateCount();
        connectRecvStream();
    });

    eventSource.addEventListener("peer_joined", e => {
        const { peer_id } = JSON.parse(e.data);
        if (peer_id === myPeerId) return;
        destroyPlayer(peer_id);   // reset stale player state on re-join
        addPeerTile(peer_id);
        log("sys", `→ ${peer_id} вошёл`);
        updateCount();
    });

    eventSource.addEventListener("peer_left", e => {
        const { peer_id } = JSON.parse(e.data);
        removePeerTile(peer_id);
        log("sys", `← ${peer_id} вышел`);
        updateCount();
    });

    eventSource.addEventListener("peer_muted", e => {
        const { peer_id, muted } = JSON.parse(e.data);
        setPeerMuted(peer_id, muted);
        log("sys", `${peer_id} ${muted ? "замьютился" : "включил микрофон"}`);
    });

    eventSource.onerror = () => log("err", "SSE: переподключение…");
}

// ============================================================================
// AUDIO RECEIVE  — persistent GET stream
// ============================================================================
async function connectRecvStream() {
    recvController = new AbortController();
    try {
        const resp = await fetch(
            `${CONFIG.serverUrl}/recv/${callId}/${myPeerId}`,
            { signal: recvController.signal, headers: { Accept: "application/octet-stream" } }
        );

        if (!resp.ok) {
            log("err", `recv HTTP ${resp.status}`);
            setTimeout(connectRecvStream, 2000);
            return;
        }

        log("ok", "Аудиопоток открыт");
        const reader = resp.body.getReader();
        let buf = new Uint8Array(0);

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf = concatU8(buf, value);

            // Consume all complete length-prefixed packets from the buffer
            while (buf.length >= 4) {
                const pktLen = (buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3];
                if (pktLen === 0) { buf = buf.slice(4); continue; }  // keepalive
                if (buf.length < 4 + pktLen) break;                  // incomplete

                const packet = buf.slice(4, 4 + pktLen);
                buf = buf.slice(4 + pktLen);

                const idLen  = packet[0];
                const peerId = new TextDecoder().decode(packet.slice(1, 1 + idLen));
                const audio  = packet.slice(1 + idLen);
                pushChunk(peerId, audio);
            }
        }
    } catch (e) {
        if (e.name === "AbortError") return;
        log("err", `recv обрыв: ${e.message}`);
        setTimeout(connectRecvStream, 2000);
    }
}

// ============================================================================
// AUDIO SEND  — periodic POST
// ============================================================================
function startSending() {
    const pending = [];

    mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType:           RECORD_MIME,
        audioBitsPerSecond: CONFIG.audioBitsPerSecond,
    });

    mediaRecorder.addEventListener("dataavailable", e => {
        if (e.data.size > 0 && !isMuted) pending.push(e.data);
    });

    mediaRecorder.start(CONFIG.sendIntervalMs);

    sendInterval = setInterval(async () => {
        if (!pending.length) return;
        const chunk = pending.shift();
        const buf   = await chunk.arrayBuffer();
        fetch(`${CONFIG.serverUrl}/send/${callId}/${myPeerId}`, {
            method:  "POST",
            body:    buf,
            headers: { "Content-Type": "application/octet-stream" },
            signal:  AbortSignal.timeout(CONFIG.sendTimeoutMs),
        }).catch(() => {});
    }, CONFIG.sendIntervalMs);
}

// ============================================================================
// AUDIO ENGINE  — decodeAudioData + AudioContext scheduling
//
// Chrome's MediaRecorder with a timeslice emits self-contained WebM mini-files:
// each chunk contains its own EBML header, Tracks element, and a single Cluster.
// This means every chunk can be decoded independently via decodeAudioData.
//
// Playback is scheduled on the AudioContext timeline so chunks play back-to-back
// without gaps.  If the scheduled cursor drifts more than maxLatencySeconds ahead
// of audioCtx.currentTime we snap it back to "now + 20 ms" (live edge).
// ============================================================================

async function pushChunk(peerId, chunk) {
    if (!peers.has(peerId) || !audioCtx) return;

    if (audioCtx.state === "suspended") {
        await audioCtx.resume().catch(() => {});
    }

    let decoded;
    try {
        // slice() is mandatory: decodeAudioData detaches the underlying ArrayBuffer
        const ab = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
        decoded  = await audioCtx.decodeAudioData(ab);
    } catch {
        return; // Incomplete or undecodable chunk — skip silently
    }

    if (!players.has(peerId)) {
        players.set(peerId, { nextTime: 0 });
    }
    const player = players.get(peerId);
    const now    = audioCtx.currentTime;

    // Snap to live edge if cursor is stale (peer was silent) or too far ahead
    if (player.nextTime < now || player.nextTime - now > CONFIG.maxLatencySeconds) {
        player.nextTime = now + 0.02;
    }

    const src = audioCtx.createBufferSource();
    src.buffer = decoded;
    src.connect(audioCtx.destination);
    src.start(player.nextTime);
    player.nextTime += decoded.duration;

    highlightSpeaker(peerId);
}

function destroyPlayer(peerId) {
    // Scheduled AudioBufferSourceNodes finish on their own; we only reset the
    // cursor so the next chunk starts fresh instead of continuing an old timeline.
    players.delete(peerId);
}

// ============================================================================
// MIC CONTROLS
// ============================================================================
function toggleMute() {
    isMuted = !isMuted;
    mediaStream.getAudioTracks().forEach(t => t.enabled = !isMuted);

    document.getElementById("mic-btn").classList.toggle("active", !isMuted);
    document.getElementById("mic-icon").textContent  = isMuted ? "🔇" : "🎙";
    document.getElementById("mic-label").textContent = isMuted ? "мьют" : "микрофон";
    setPeerMuted(myPeerId, isMuted);

    fetch(`${CONFIG.serverUrl}/signal/${callId}/${myPeerId}`, {
        method:  "POST",
        body:    JSON.stringify({ type: "mute", muted: isMuted }),
        headers: { "Content-Type": "application/json" },
    }).catch(() => {});
}

function hangUp() {
    clearInterval(sendInterval);
    if (mediaRecorder?.state !== "inactive") mediaRecorder?.stop();
    mediaStream?.getTracks().forEach(t => t.stop());
    eventSource?.close();
    recvController?.abort();
    cancelAnimationFrame(volAnimId);
    audioCtx?.close();
    location.reload();
}

function setupVolumeAnalyser() {
    const source = audioCtx.createMediaStreamSource(mediaStream);
    analyser     = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const fill = document.getElementById("vol-fill");

    (function tick() {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        fill.style.width = Math.min(100, avg * 2.5) + "%";
        volAnimId = requestAnimationFrame(tick);
    })();
}

function concatU8(a, b) {
    const out = new Uint8Array(a.length + b.length);
    out.set(a);
    out.set(b, a.length);
    return out;
}

function addPeerTile(peerId, isMe = false) {
    if (peers.has(peerId)) return;
    const tile = document.createElement("div");
    tile.className = `peer-tile${isMe ? " me" : ""}`;
    tile.id = `tile-${peerId}`;
    tile.innerHTML = `
        <div class="peer-avatar">${peerId[0].toUpperCase()}</div>
        <div class="peer-name">${peerId}</div>
        <span class="peer-muted-icon">🔇</span>`;
    document.getElementById("peers-grid").appendChild(tile);
    peers.set(peerId, { el: tile });
}

function removePeerTile(peerId) {
    const p = peers.get(peerId);
    if (!p) return;
    destroyPlayer(peerId);
    p.el.remove();
    peers.delete(peerId);
}

function setPeerMuted(peerId, muted) {
    peers.get(peerId)?.el.classList.toggle("muted", muted);
}

const speakerTimers = {};
function highlightSpeaker(peerId) {
    const p = peers.get(peerId);
    if (!p) return;
    p.el.classList.add("speaking");
    clearTimeout(speakerTimers[peerId]);
    speakerTimers[peerId] = setTimeout(() => p.el.classList.remove("speaking"), 300);
}

function updateCount() {
    const n = peers.size;
    document.getElementById("hdr-count").textContent =
    `${n} участник${n === 1 ? "" : "ов"}`;
}

function log(type, msg) {
    const box = document.getElementById("log-box");
    const ts  = new Date().toLocaleTimeString("ru", {
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    const el = document.createElement("span");
    el.className = `log-entry ${type}`;
    el.innerHTML = `<span class="ts">${ts}</span><span class="msg">${msg}</span>`;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
}

function showError(msg) {
    document.getElementById("error-text").textContent = msg;
    document.getElementById("error-overlay").classList.add("show");
}
