document.addEventListener("DOMContentLoaded", init)

function init() {
    const startButton = document.getElementById('startButton');
    const audioPlayback = document.getElementById('audioPlayback');
    const status = document.getElementById('status');

    let isClicked = false

    startButton.addEventListener('click', () => {
        status.textContent = 'Requesting microphone access...';
        const constraints = { audio: true, video: false };
        isClicked = !isClicked

        if (isClicked) {
            navigator.mediaDevices.getUserMedia(constraints)
                .then((stream) => {
                status.textContent = 'Access granted. Streaming audio.';
                audioPlayback.srcObject = stream;
            })
                .catch((err) => {
                console.error(`You got an error: ${err}`);
                status.textContent = `Error accessing microphone: ${err.name}`;
                alert('Need permission to use the microphone.');
            })
        }
    })
}
