const CHUNK_MS = 100;
const PING_MS = 15000;

let ws = null;
let myPeerId = "";
let isMuted = false;
let mediaRecorder = null;
let localStream = null;
let audioCtx = null;
let meterActive = false;

const RECORD_MIME = (() => {
    const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
    ];
    return candidates.find(m => MediaRecorder.isTypeSupported(m)) ?? "";
})();

const peers = new Map();

const peersGrid = document.getElementById("peers-grid");
const btnJoin = document.getElementById("joinBtn");
const btnMute = document.getElementById("micBtn");
const btnLeave = document.getElementById("hangupBtn");

const micIcon = document.getElementById("mic-icon");
const micLabel = document.getElementById("mic-label");

btnMute.style.display = "none";
btnLeave.style.display = "none";

fillRandomInputs();

function fillRandomInputs() {
    document.getElementById("room-input").value = "room-" + Math.random().toString(36).slice(2, 6);
    document.getElementById("peer-input").value = "user-" + Math.random().toString(36).slice(2, 6);
}

function log(type, msg) {
    const box = document.getElementById("log-box");
    const ts = new Date().toLocaleTimeString("ru", {
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    const el = document.createElement("span");
    el.className = `log-entry ${type}`;
    el.innerHTML = `<span class="ts">${ts}</span><span class="msg">${msg}</span>`;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
}

function updateCount() {
    const count = peers.size;
    document.getElementById("hdr-count").textContent = count + " участников";
}

function addPeerTile(peerId, isMe = false) {
    let p = peers.get(peerId);

    if (!p) {
        p = { el: null, queue: [] };
        peers.set(peerId, p);
    }

    if (p.el) return;

    const tile = document.createElement("div");
    tile.className = `peer-tile${isMe ? " me" : ""}`;
    tile.id = `tile-${peerId}`;
    tile.innerHTML = `
        <div class="peer-avatar">${peerId[0].toUpperCase()}</div>
        <div class="peer-name">${peerId}</div>
        <span class="peer-muted-icon">🔇</span>`;

    peersGrid.appendChild(tile);
    p.el = tile;
    updateCount();
}

function addPeerCard(peerId, isSelf = false) {
    const empty = peersGrid.querySelector(".empty-state");
    if (empty) empty.remove();

    const card = document.createElement("div");
    card.className = "peer-card" + (isSelf ? " self" : "");
    card.dataset.id = peerId;

    const initials = peerId.slice(0, 2).toUpperCase();

    card.innerHTML = `
    ${isSelf ? '<span class="you-badge">Вы</span>' : ""}
    <div class="peer-avatar">${initials}</div>
    <div class="peer-name">${escapeHtml(peerId)}</div>
    <div class="peer-status" id="ps-${peerId}">в эфире</div>
    <div class="peer-meter"><div class="peer-meter-bar" id="pm-${peerId}"></div></div>
  `;

    peersGrid.appendChild(card);
    updateCount();
    return card;
}

function removePeerTile(peerId) {
    const p = peers.get(peerId);
    if (!p) return;

    if (p.el) p.el.remove();
    if (p.audio) {
        p.audio.src = "";
        p.audio.remove();
    }

    peers.delete(peerId);

    updateCount();
}
function setPeerSpeaking(peerId, level) {
    const bar = document.getElementById("pm-" + peerId);
    const card = peersGrid.querySelector(`[data-id="${peerId}"]`);
    if (!bar || !card) return;

    bar.style.width = level + "%";

    if (level > 5) {
        card.classList.add("speaking");
        setTimeout(() => card.classList.remove("speaking"), 300);
    }
}

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

async function joinCall() {
    const serverUrl = "ws://localhost:8000/ws";
    const callId = document.getElementById("room-input").value.trim();
    myPeerId = document.getElementById("peer-input").value.trim();

    if (!callId || !myPeerId) return;

    peersGrid.innerHTML = "";

    try {
        const deviceId = document.getElementById("mic-select").value;
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                echoCancellation: true,
                noiseSuppression: true,
            },
            video: false,
        });
    } catch (e) {
        alert(e.message);
        return;
    }

    audioCtx = new AudioContext();

    document.getElementById("join-screen").style.display = "none";
    document.getElementById("call-screen").style.display = "block";
    document.getElementById("hdr-room").textContent = callId;

    ws = new WebSocket(`${serverUrl}/${callId}/${myPeerId}`);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => startRecording();
    ws.onmessage = ev => {
        if (typeof ev.data === "string") handleSignaling(JSON.parse(ev.data));
        else handleIncomingAudio(ev.data);
    };
    ws.onclose = handleDisconnect;

    btnJoin.disabled = true;
    btnMute.style.display = "block";
    btnLeave.style.display = "block";
}

function startRecording() {
    mediaRecorder = new MediaRecorder(localStream, RECORD_MIME ? { mimeType: RECORD_MIME } : {});

    mediaRecorder.ondataavailable = async e => {
        if (e.data.size && ws?.readyState === 1 && !isMuted) {
            ws.send(await e.data.arrayBuffer());
        }
    };

    mediaRecorder.start(CHUNK_MS);

    startLocalMeter();
}

function startLocalMeter() {
    if (!audioCtx) return;

    meterActive = false; // останавливаем предыдущий tick если был
    const myActive = {}; // уникальный токен для этого запуска
    meterActive = myActive;

    const source = audioCtx.createMediaStreamSource(localStream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const fill = document.getElementById("vol-fill");

    function tick() {
        if (meterActive !== myActive) return; // нас заменили — выходим
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const level = isMuted ? 0 : Math.min(100, (sum / data.length) * 2);
        fill.style.width = level + "%";
        requestAnimationFrame(tick);
    }

    tick();
}

function parseFrame(ab) {
    const view = new DataView(ab);
    const idLen = view.getUint8(0);
    const idBuf = ab.slice(1, 1 + idLen);
    const audio = ab.slice(1 + idLen);
    return { peerId: new TextDecoder().decode(idBuf), audio };
}

function handleIncomingAudio(ab) {
    const { peerId, audio } = parseFrame(ab);

    const p = peers.get(peerId);
    if (!p || !p.playing) return;

    p.queue.push(audio);
    flushQueue(peerId);

    setPeerSpeaking(peerId, Math.min(100, audio.byteLength / 5));
}

function initPeerAudio(peerId) {
    let p = peers.get(peerId);
    if (!p) {
        p = { el: null };
        peers.set(peerId, p);
    }

    p.queue = [];
    p.sourceBuffer = null;
    p.mediaSource = null;
    p.playing = true;

    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.playsInline = true;
    document.body.appendChild(audio);
    p.audio = audio;

    const ms = new MediaSource();
    p.mediaSource = ms;
    audio.src = URL.createObjectURL(ms);

    ms.addEventListener("sourceopen", () => {
        if (p.mediaSource !== ms) return; // уже заменили
        try {
            const sb = ms.addSourceBuffer(RECORD_MIME || "audio/webm;codecs=opus");
            sb.mode = "sequence";
            p.sourceBuffer = sb;
            sb.addEventListener("updateend", () => flushQueue(peerId));
            flushQueue(peerId);
        } catch (e) {
            console.warn("addSourceBuffer failed:", e);
        }
    });
}

function flushQueue(peerId) {
    const p = peers.get(peerId);
    if (!p?.sourceBuffer || !p?.mediaSource) return;
    if (p.mediaSource.readyState !== "open") return;
    if (p.sourceBuffer.updating) return;
    if (!p.queue?.length) return;

    try {
        p.sourceBuffer.appendBuffer(p.queue.shift());
    } catch (e) {
        console.warn("appendBuffer failed:", e);
        p.queue = [];
    }
}

function destroyPeerAudio(peerId) {
    const p = peers.get(peerId);
    if (!p) return;

    p.playing = false;
    p.queue = [];

    if (p.audio) {
        p.audio.pause();
        p.audio.src = "";
        p.audio.remove();
        p.audio = null;
    }

    if (p.mediaSource) {
        try {
            if (p.mediaSource.readyState === "open") p.mediaSource.endOfStream();
        } catch {}
        p.mediaSource = null;
    }

    p.sourceBuffer = null;

    if (p.el) p.el.remove();
    peers.delete(peerId);
}

function handleSignaling(msg) {
    switch (msg.type) {

        case "joined":
            msg.peers.forEach(pid => {
                if (pid !== myPeerId) {
                    initPeerAudio(pid);
                    addPeerTile(pid);
                }
            });

            addPeerTile(myPeerId, true);
            updateCount();
            break;

        case "peer_joined":
            initPeerAudio(msg.peer_id);
            addPeerTile(msg.peer_id);
            updateCount();
            break;

        case "peer_left":
            removePeerTile(msg.peer_id);
            updateCount();
            break;
    }
}

function toggleMute() {
    if (!localStream) return;

    isMuted = !isMuted;

    micIcon.textContent = isMuted ? "🔇" : "🎙";
    micLabel.textContent = isMuted ? "выключен" : "микрофон";

    // Ничего не трогаем у пиров — MediaSource остаётся живым
    // Просто перестаём/начинаем слать свои чанки (это уже делает ondataavailable)

    ws?.send(JSON.stringify({ type: "mute", muted: isMuted }));
}

function leaveCall() {
    if (mediaRecorder) {
        if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
        mediaRecorder = null;
    }

    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }

    if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
    }

    for (const pid of [...peers.keys()]) {
        destroyPeerAudio(pid);
    }

    peers.clear();

    if (ws) {
        ws.close(1000, "user left");
        ws = null;
    }

    btnJoin.disabled = false;
    btnMute.style.display = "none";
    btnLeave.style.display = "none";

    document.getElementById("call-screen").style.display = "none";
    document.getElementById("join-screen").style.display = "block";

    peersGrid.innerHTML = '<div class="empty-state">Вы не в комнате</div>';
    document.getElementById("hdr-count").textContent = "0 участников";

    fillRandomInputs();
}

function handleDisconnect() {
    document.getElementById("call-screen").style.display = "none";
    document.getElementById("join-screen").style.display = "block";

    btnJoin.disabled = false;
    btnMute.style.display = "none";
    btnLeave.style.display = "none";

    peersGrid.innerHTML = '<div class="empty-state">Вы не в комнате</div>';
    document.getElementById("hdr-count").textContent = "0 участников";

    fillRandomInputs();
}

async function populateMicList() {
    // Сначала запрашиваем разрешение — без него браузер скрывает labels
    try {
        const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
        tmp.getTracks().forEach(t => t.stop());
    } catch {}

    const devices = await navigator.mediaDevices.enumerateDevices();
    const select = document.getElementById("mic-select");

    select.innerHTML = "";
    devices
        .filter(d => d.kind === "audioinput")
        .forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.deviceId;
        opt.textContent = d.label || `Микрофон ${d.deviceId.slice(0, 6)}`;
        select.appendChild(opt);
    });
}


setInterval(() => {
    if (ws?.readyState === 1) {
        ws.send(JSON.stringify({ type: "ping" }));
    }
}, PING_MS);

populateMicList();

document.getElementById("mic-select").addEventListener("change", async () => {
    if (!localStream) return; // не в звонке — ничего не делаем

    const deviceId = document.getElementById("mic-select").value;

    try {
        const newStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                echoCancellation: true,
                noiseSuppression: true,
            },
            video: false,
        });

        // Останавливаем старые треки
        localStream.getTracks().forEach(t => t.stop());
        localStream = newStream;

        // Перезапускаем запись с новым стримом
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
        startRecording();

    } catch (e) {
        alert("Не удалось переключить микрофон: " + e.message);
    }
});

navigator.mediaDevices.addEventListener("devicechange", populateMicList);
btnJoin.addEventListener("click", joinCall);
btnMute.addEventListener("click", toggleMute);
btnLeave.addEventListener("click", leaveCall);
