// ---------------- DOM ELEMENTS ----------------
const uploadForm = document.getElementById('uploadForm');
const statusEl = document.getElementById('status');
const emotionBadge = document.getElementById('emotionBadge');
const breakdownEl = document.getElementById('emotionBreakdown');
const previewImage = document.getElementById('previewImage');
const video = document.getElementById('camera');
const snapBtn = document.getElementById('snap');
const toggleCam = document.getElementById('toggleCam');

const canvas = document.createElement('canvas');
let stream = null;

// ---------------- INITIAL SETUP ----------------
snapBtn.disabled = true;                     // Disabled until camera is active
toggleCam.textContent = "Turn Camera On";   // Initial text
toggleCam.style.display = "inline-block";   // Always visible

// ---------------- UPLOAD FUNCTION ----------------
uploadForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);

    setLoading(true, "Analyzing uploaded image...");
    fetch('/analyze', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(json => { setLoading(false); showResult(json); })
        .catch(err => { setLoading(false); statusEl.textContent = "Error: " + err; });
});

// ---------------- START CAMERA ----------------
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play();
        };

        snapBtn.disabled = false;               // Enable capture button
        toggleCam.textContent = "Turn Camera Off";
        toggleCam.style.display = "inline-block";
        statusEl.textContent = "Camera is ready ✅";
    } catch (err) {
        console.error("Camera access failed:", err);
        snapBtn.disabled = true;
        toggleCam.textContent = "Camera Blocked";
        toggleCam.style.display = "inline-block";
        statusEl.textContent = "Camera permission denied or unavailable!";
    }
}

// ---------------- STOP CAMERA ----------------
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    video.srcObject = null;
    snapBtn.disabled = true;
    toggleCam.textContent = "Turn Camera On";
    toggleCam.style.display = "inline-block";
    statusEl.textContent = "Camera off ❌";
}

// ---------------- TOGGLE CAMERA BUTTON ----------------
toggleCam.addEventListener('click', () => {
    if (!stream) {
        startCamera();
    } else {
        stopCamera();
    }
});

// ---------------- CAPTURE & ANALYZE ----------------
snapBtn.addEventListener('click', () => {
    if (!stream) {
        statusEl.textContent = "Camera is OFF — Please turn it on first!";
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob(blob => {
        const formData = new FormData();
        formData.append("image", blob, "capture.jpg");

        setLoading(true, "Analyzing camera capture…");

        fetch("/analyze", { method: "POST", body: formData })
            .then(res => res.json())
            .then(json => { setLoading(false); showResult(json); })
            .catch(err => {
                setLoading(false);
                statusEl.textContent = "Error: " + err;
            });
    }, "image/jpeg");
});

// ---------------- HELPERS ----------------
function setLoading(on, text) {
    if (on) {
        statusEl.innerHTML = `<div class="loader"></div><span class="muted">${text}</span>`;
    }
}

function showResult(json) {
    if (json.error) {
        statusEl.textContent = "Error: " + (json.message || json.error);
        emotionBadge.innerHTML = "";
        breakdownEl.innerHTML = "";
        return;
    }

    statusEl.textContent = "✅ Analysis complete";

    const emo = json.emotion || "Unknown";
    emotionBadge.innerHTML = `<h3 style="color:black;">${mapEmoji(emo)} ${emo}</h3>`;

    const emotions = json.emotions || {};
    breakdownEl.innerHTML = Object.keys(emotions).length
        ? Object.entries(emotions).map(([k, v]) =>
            `<div class="p-2 my-1 bg-light border rounded" style="color:black;">
                ${k}: <strong>${v.toFixed(2)}</strong>
            </div>`).join('')
        : '';

    if (json.file) {
        previewImage.src = `/uploads/${json.file}`;
        previewImage.style.display = "block";
    }
}

function mapEmoji(emo) {
    const e = emo.toLowerCase();
    if (e.includes('happy')) return '😄';
    if (e.includes('sad')) return '😢';
    if (e.includes('angry')) return '😡';
    if (e.includes('surprise')) return '😲';
    if (e.includes('fear')) return '😨';
    if (e.includes('disgust')) return '🤢';
    return '🙂';
}

// ---------------- AUTO REQUEST CAMERA PERMISSION ----------------
window.addEventListener('load', () => {
    // Ask for camera permission immediately
    startCamera();
});
