import { auth, db } from "./firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// GLOBALS & STATE
// ==========================================
let streaming = false;
let alertsCount = 0;
let lastPainValue = "No Pain";
let lastEmotionValue = "Calm";

// ==========================================
// DOM ELEMENTS
// ==========================================
const logoutBtn = document.getElementById("logout-btn");
const streamToggle = document.getElementById("stream-toggle");
const uploadTrigger = document.getElementById("upload-trigger");
const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const dragOverlay = document.getElementById("drag-overlay");
const chatInput = document.getElementById("chat-input");
const processingSpinner = document.getElementById("processing-spinner");

// AI Outputs
const valIntent = document.getElementById("val-intent");
const confIntent = document.getElementById("conf-intent");
const indIntent = document.querySelector("#card-intent .indicator");

const valEmotion = document.getElementById("val-emotion");
const confEmotion = document.getElementById("conf-emotion");
const indEmotion = document.querySelector("#card-emotion .indicator");

const valPain = document.getElementById("val-pain");
const confPain = document.getElementById("conf-pain");
const indPain = document.querySelector("#card-pain .indicator");

const alertsGrid = document.getElementById("alerts-grid");

// Snapshots
const snapPain = document.getElementById("snap-pain");
const snapEmotion = document.getElementById("snap-emotion");
const snapAlerts = document.getElementById("snap-alerts");

// ==========================================
// FIREBASE AUTH
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Not logged in, redirect
        window.location.href = "/login"; 
    } else {
        // Authentication confirmed, show the dashboard
        const dashboardLayout = document.querySelector('.dashboard-layout');
        if (dashboardLayout) {
            dashboardLayout.style.display = 'grid';
            
            // Initialize 3D animations now that the container has a physical width/height!
            if (typeof window.initVantaAnimations === 'function') {
                window.initVantaAnimations();
            }
        }
        
        // Fetch patient details dynamically from Firestore
        async function fetchPatientData() {
            try {
                // Using the users collection for the user's name
                const userDoc = await getDoc(doc(db, "users", user.uid));
                // Using the patients collection for the intake form data
                const patientDoc = await getDoc(doc(db, "patients", user.uid));
                
                if (userDoc.exists()) {
                    document.getElementById('patient-name').innerText = userDoc.data().name || user.email.split('@')[0];
                } else {
                    document.getElementById('patient-name').innerText = user.email ? user.email.split('@')[0] : "Guest Patient";
                }
                document.getElementById('patient-id').innerText = user.uid.substring(0, 8).toUpperCase();
                
                if (patientDoc.exists()) {
                    const pd = patientDoc.data();
                    document.getElementById('patient-age').innerText = pd.personalInfo?.dob ? calculateAge(pd.personalInfo.dob) : "--";
                    document.getElementById('patient-gender').innerText = pd.personalInfo?.gender || "--";
                    document.getElementById('patient-condition').innerText = pd.medicalInfo?.condition || "No Primary Condition";
                } else {
                    document.getElementById('patient-condition').innerText = "No Intake Data";
                }
            } catch(e) {
                console.error("Error fetching patient data: ", e);
                document.getElementById('patient-name').innerText = user.email ? user.email.split('@')[0] : "Guest Patient";
                document.getElementById('patient-condition').innerText = "Database Error";
            }
        }
        
        function calculateAge(dobStr) {
            if (!dobStr) return "--";
            const dob = new Date(dobStr);
            const diff = Date.now() - dob.getTime();
            return new Date(diff).getUTCFullYear() - 1970;
        }
        
        fetchPatientData();
    }
});

logoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.href = "/login";
    } catch (error) {
        console.error("Logout Error:", error);
    }
});

// ==========================================
// NEURAL VISUALIZATION (Moved to CSS / Chart.js)
// ==========================================
// 3D particles removed to allow clean wave grid.


// ==========================================
// CHART.JS SETUP
// ==========================================
// Realtime EEG Wave
let eegChart = null;
const eegCanvas = document.getElementById("eegWaveChart");
if (eegCanvas) {
    const eegCtx = eegCanvas.getContext("2d");
    eegChart = new Chart(eegCtx, {
        type: 'line',
        data: {
            labels: Array.from({length: 50}, (_, i) => i),
            datasets: [
                {
                    label: 'CH1',
                    data: Array(50).fill(0),
                    borderColor: 'rgba(56, 189, 248, 1)',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    borderWidth: 2,
                    tension: 0.5,
                    pointRadius: 0,
                    fill: true
                },
                {
                    label: 'CH2',
                    data: Array(50).fill(0),
                    borderColor: 'rgba(148, 163, 184, 0.5)',
                    borderWidth: 1.5,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'CH3',
                    data: Array(50).fill(0),
                    borderColor: 'rgba(56, 189, 248, 0.3)',
                    borderWidth: 1.5,
                    tension: 0.6,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { 
                    display: true, 
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                },
                y: { 
                    display: true, 
                    min: -5, 
                    max: 5,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                }
            },
            animation: false
        }
    });
}

// Trend Chart
let trendChart = null;
const trendCanvas = document.getElementById("trendChart");
if (trendCanvas) {
    const trendCtx = trendCanvas.getContext("2d");
    trendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Pain Level',
                data: [],
                borderColor: '#ef4444',
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { display: false, min: 0, max: 3 }
            }
        }
    });
}


// ==========================================
// DATA FLOW & LOGIC
// ==========================================

// Dynamic signal generator fetching from real waves endpoint
async function updateWaveform() {
    if(!streaming || !eegChart) return;
    
    try {
        const res = await fetch("/stream_waves");
        const wavesData = await res.json();
        
        // Take the first 3 channels (if available) to plot realistically
        for(let i=0; i<3; i++) {
            if(wavesData.data[i]) {
                eegChart.data.datasets[i].data = wavesData.data[i];
            }
        }
        eegChart.update();
        
    } catch(e) {
        console.error("Error fetching waves:", e);
    }
    
    setTimeout(updateWaveform, 200);
}

// Map color/state based on prediction
function getColorForState(type, value) {
    if (type === 'pain') {
        if(value.includes("High")) return "var(--status-red)";
        if(value.includes("Low")) return "var(--status-yellow)";
        return "var(--status-green)";
    }
    if (type === 'emotion') {
        if(value.includes("Anxious") || value.includes("Distressed")) return "var(--status-yellow)";
        return "var(--status-green)";
    }
    return "var(--accent)";
}

// Add Alert Function
function addAlert(type, message, isCritical) {
    if (!alertsGrid) return;
    alertsCount++;
    if (snapAlerts) snapAlerts.innerText = alertsCount;

    const alertEl = document.createElement("div");
    alertEl.className = `alert-card ${isCritical ? 'warning' : 'normal'}`;
    const timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    
    alertEl.innerHTML = `
        <div class="alert-header">
            <span>${type.toUpperCase()}</span>
            <span>${timeStr}</span>
        </div>
        <div class="alert-msg">${message}</div>
    `;
    
    alertsGrid.prepend(alertEl);
    
    // Keep max 20 alerts
    if(alertsGrid.children.length > 20) {
        alertsGrid.removeChild(alertsGrid.lastChild);
    }
}

// Update Trend Chart
function updateTrends(painLabel) {
    if (!trendChart) return;
    let val = 0;
    if(painLabel.includes("High")) val = 3;
    else if(painLabel.includes("Low")) val = 1;
    
    const d = new Date().toLocaleTimeString();
    trendChart.data.labels.push(d);
    trendChart.data.datasets[0].data.push(val);
    
    if(trendChart.data.labels.length > 15) {
        trendChart.data.labels.shift();
        trendChart.data.datasets[0].data.shift();
    }
    trendChart.update();
}

// Ambient UI Feedback
function updateAmbientUI(painLabel) {
    if(painLabel.includes("High")) {
        document.body.style.boxShadow = "inset 0 0 150px rgba(239, 68, 68, 0.1)";
    } else if(painLabel.includes("Low")) {
        document.body.style.boxShadow = "inset 0 0 100px rgba(245, 158, 11, 0.1)";
    } else {
        document.body.style.boxShadow = "none";
    }
}

// Main UI Updater
function updateUI(data) {
    // Intent
    if (data.intent.label && valIntent) {
        valIntent.innerText = data.intent.label;
        confIntent.innerText = `Confidence: ${data.intent.conf}`;
        indIntent.style.background = getColorForState('intent', data.intent.label);
    }

    // Emotion
    if (data.emotion.label && valEmotion) {
        valEmotion.innerText = data.emotion.label;
        confEmotion.innerText = `Confidence: ${data.emotion.conf}`;
        indEmotion.style.background = getColorForState('emotion', data.emotion.label);
        if (snapEmotion) snapEmotion.innerText = data.emotion.label;
        
        if(data.emotion.label !== lastEmotionValue && (data.emotion.label === "Anxious" || data.emotion.label === "Distressed")) {
            addAlert('Emotion', `${data.emotion.label} detected`, true);
        }
        lastEmotionValue = data.emotion.label;
    }

    // Pain
    if (data.pain.value && valPain) {
        valPain.innerText = data.pain.value;
        confPain.innerText = `Confidence: ${data.pain.conf}`;
        indPain.style.background = getColorForState('pain', data.pain.value);
        if (snapPain) snapPain.innerText = data.pain.value.split(" ")[0];
        
        if(data.pain.value !== lastPainValue && data.pain.value === "High Pain") {
            addAlert('Pain', 'High pain spike detected', true);
        }
        lastPainValue = data.pain.value;
        
        updateTrends(data.pain.value);
        updateAmbientUI(data.pain.value);
    }
}

// ==========================================
// STREAM & UPLOAD (Backend Integration)
// ==========================================

async function streamLoop() {
    while (streaming) {
        try {
            const res = await fetch("/stream");
            const data = await res.json();
            updateUI(data);
        } catch (e) {
            console.log("Stream error:", e);
        }
        await new Promise(r => setTimeout(r, 6000)); // Analyzing slowly (every 6 seconds)
    }
}

streamToggle?.addEventListener("click", () => {
    streaming = !streaming;
    if (streaming) {
        streamToggle.innerHTML = '<i class="fas fa-stop"></i> Stop Stream';
        streamToggle.style.background = 'var(--status-red)';
        updateWaveform();
        streamLoop();
        if (chatInput) chatInput.value = "Streaming live data...";
    } else {
        streamToggle.innerHTML = '<i class="fas fa-play"></i> Start Stream';
        streamToggle.style.background = 'var(--accent)';
        if (chatInput) chatInput.value = "";
    }
});

// File Upload Handling
async function handleFileUpload(file) {
    if (!file) return;

    if (chatInput) chatInput.value = `Processing ${file.name}...`;
    if (processingSpinner) processingSpinner.style.display = "block";

    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch("/upload", { method: "POST", body: formData });
        const data = await res.json();
        
        if(data.status === "ok") {
            if (chatInput) chatInput.value = `Data from ${file.name} loaded and analyzed.`;
            addAlert("System", `Analyzed file: ${file.name}`, false);
            
            // Immediately analyze and display the result once, without continuously streaming
            try {
                const streamRes = await fetch("/stream");
                const streamData = await streamRes.json();
                updateUI(streamData);
            } catch (err) {
                console.error("Analysis error:", err);
            }
            
        } else {
            if (chatInput) chatInput.value = `Error: ${data.error}`;
        }
    } catch (e) {
        console.error(e);
        if (chatInput) chatInput.value = "Upload failed.";
    } finally {
        if (processingSpinner) processingSpinner.style.display = "none";
    }
}

uploadTrigger?.addEventListener('click', () => fileInput?.click());
fileInput?.addEventListener('change', function() { handleFileUpload(this.files[0]); });

// Drag & Drop
if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragOverlay?.classList.add('active');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragOverlay?.classList.remove('active');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dragOverlay?.classList.remove('active');
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            handleFileUpload(file);
        }
    });
}

// ==========================================
// DYNAMIC NAVIGATION TABS
// ==========================================
// Handled directly via HTML hrefs now.
