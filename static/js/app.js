let streaming = false;

const uploadZone = document.querySelector('.upload-zone');
const fileInput = document.getElementById('file-input');
const startBtn = document.getElementById('start-btn');

const intentEl = document.getElementById("intent-display");
const intentConf = document.getElementById("intent-conf");
const emotionEl = document.getElementById("emotion-display");
const painEl = document.getElementById("pain-display");

let lastFile = "";

let lastData = {
    intent: "---",
    intentConf: "--%",
    emotion: "Calm",
    emotionConf: "--%",
    pain: "No Pain",
    painConf: "--%"
};

// =========================
// UPLOAD
// =========================
uploadZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async function () {

    const file = this.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    uploadZone.innerHTML = "Uploading...";

    await fetch("/upload", {
        method: "POST",
        body: formData
    });

    uploadZone.innerHTML = "File Loaded ✅";
});

// =========================
// STREAM
// =========================
startBtn.addEventListener("click", () => {
    streaming = !streaming;

    if (streaming) {
        startBtn.innerHTML = "Stop Session";
        streamLoop();
    } else {
        startBtn.innerHTML = "Start Session";
    }
});

async function streamLoop() {
    while (streaming) {
        const res = await fetch("/stream");
        const data = await res.json();

        updateUI(data);

        await new Promise(r => setTimeout(r, 600));
    }
}

// =========================
// UI UPDATE
// =========================
function updateUI(data) {

    // INTENT
    if (data.intent.label !== "---") {
        lastData.intent = data.intent.label;
        lastData.intentConf = data.intent.conf;
    }

    intentEl.innerText = lastData.intent;
    intentConf.innerText = lastData.intentConf;

    // EMOTION
    if (data.emotion.conf !== "--%") {
        lastData.emotion = data.emotion.label;
        lastData.emotionConf = data.emotion.conf;
    }

    emotionEl.innerText = `${lastData.emotion} (${lastData.emotionConf})`;

    // PAIN
    if (data.pain.conf !== "--%") {
        lastData.pain = data.pain.value;
        lastData.painConf = data.pain.conf;
    }

    painEl.innerText = `${lastData.pain} (${lastData.painConf})`;

    // FILE NAME
    if (data.filename && data.filename !== lastFile) {
        lastFile = data.filename;

        const logEl = document.getElementById("file-log");
        if (logEl) logEl.innerText = lastFile;
    }
}