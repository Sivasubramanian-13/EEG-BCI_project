let streaming = false;

const uploadZone = document.querySelector('.upload-zone');
const fileInput = document.getElementById('file-input');
const startBtn = document.getElementById('start-btn');

// UI refs
const intentEl = document.getElementById("intent-display");
const intentConf = document.getElementById("intent-conf");
const emotionEl = document.getElementById("emotion-display");
const painEl = document.getElementById("pain-display");

// memory (for smooth UI)
let lastData = {
    intent: "---",
    intentConf: "--%",
    emotion: "Calm",
    emotionConf: "--%",
    pain: "No Pain",
    painConf: "--%"
};


// =========================
// 🔹 UPLOAD
// =========================
uploadZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async function () {

    const file = this.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    uploadZone.innerHTML = "Uploading...";

    try {
        await fetch("/upload", {
            method: "POST",
            body: formData
        });

        uploadZone.innerHTML = "File Loaded ✅";

    } catch (e) {
        uploadZone.innerHTML = "Upload Failed ❌";
        console.error(e);
    }
});


// =========================
// 🔹 START / STOP
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


// =========================
// 🔹 STREAM LOOP
// =========================
async function streamLoop() {

    while (streaming) {

        try {
            const res = await fetch("/stream");
            const data = await res.json();

            updateUI(data);

        } catch (e) {
            console.log("Stream error:", e);
        }

        await new Promise(r => setTimeout(r, 800)); // smooth refresh
    }
}


// =========================
// 🔹 UPDATE UI (FINAL FIX)
// =========================
function updateUI(data) {

    // -----------------
    // INTENT
    // -----------------
    if (data.intent.label !== "---") {
        lastData.intent = data.intent.label;
        lastData.intentConf = data.intent.conf;
    }

    intentEl.innerText = lastData.intent;
    intentConf.innerText = lastData.intentConf;


    // -----------------
    // EMOTION
    // -----------------
    if (data.emotion.conf !== "--%") {
        lastData.emotion = data.emotion.label;
        lastData.emotionConf = data.emotion.conf;
    }

    emotionEl.innerText =
        `${lastData.emotion} (${lastData.emotionConf})`;


    // -----------------
    // PAIN
    // -----------------
    if (data.pain.conf !== "--%") {
        lastData.pain = data.pain.value;
        lastData.painConf = data.pain.conf;
    }

    painEl.innerText =
        `${lastData.pain} (${lastData.painConf})`;
}