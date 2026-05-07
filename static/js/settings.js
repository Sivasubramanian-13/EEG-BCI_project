import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const themeToggleBtn = document.getElementById("theme-toggle-btn");
const densitySelect = document.getElementById("density-select");
const exportDataBtn = document.getElementById("export-data-btn");

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
    }
});

// Load preferences from localStorage
document.addEventListener("DOMContentLoaded", () => {
    // Theme
    if (localStorage.getItem("voxaura_theme") === "light") {
        document.documentElement.style.setProperty('--bg-dark', '#f8fafc');
        document.documentElement.style.setProperty('--text-primary', '#0f172a');
        document.documentElement.style.setProperty('--text-muted', '#64748b');
        document.documentElement.style.setProperty('--bg-glass', 'rgba(255, 255, 255, 0.8)');
    }
    
    // Density
    const savedDensity = localStorage.getItem("voxaura_density");
    if (savedDensity) {
        densitySelect.value = savedDensity;
        applyDensity(savedDensity);
    }
});

themeToggleBtn?.addEventListener("click", () => {
    const isLight = localStorage.getItem("voxaura_theme") === "light";
    if (isLight) {
        // Switch to Dark
        localStorage.setItem("voxaura_theme", "dark");
        window.location.reload(); // Simple reload to apply CSS default
    } else {
        // Switch to Light
        localStorage.setItem("voxaura_theme", "light");
        document.documentElement.style.setProperty('--bg-dark', '#f8fafc');
        document.documentElement.style.setProperty('--text-primary', '#0f172a');
        document.documentElement.style.setProperty('--text-muted', '#64748b');
        document.documentElement.style.setProperty('--bg-glass', 'rgba(255, 255, 255, 0.8)');
    }
});

function applyDensity(density) {
    if (density === "compact") {
        document.documentElement.style.setProperty('--sidebar-width', '220px');
        document.querySelectorAll('h1, h2, h3, h4').forEach(h => h.style.margin = '0 0 5px 0');
    } else {
        document.documentElement.style.setProperty('--sidebar-width', '260px');
        document.querySelectorAll('h1, h2, h3, h4').forEach(h => h.style.margin = ''); // reset
    }
}

densitySelect?.addEventListener("change", (e) => {
    const density = e.target.value;
    localStorage.setItem("voxaura_density", density);
    applyDensity(density);
});

// Export Data Logic
exportDataBtn?.addEventListener("click", async () => {
    if (!currentUser) {
        alert("Please log in to export data.");
        return;
    }
    
    const originalText = exportDataBtn.innerText;
    exportDataBtn.innerText = "Exporting...";
    exportDataBtn.disabled = true;
    
    try {
        let exportObj = {
            metadata: {
                exportedAt: new Date().toISOString(),
                uid: currentUser.uid,
                email: currentUser.email
            },
            profile: {},
            alerts: [],
            journeyLogs: []
        };
        
        // 1. Profile
        const patientDoc = await getDoc(doc(db, "patients", currentUser.uid));
        if (patientDoc.exists()) {
            exportObj.profile = patientDoc.data();
        }
        
        // 2. Alerts
        const alertsSnap = await getDocs(collection(db, "patients", currentUser.uid, "alerts"));
        alertsSnap.forEach(d => {
            let data = d.data();
            // Convert timestamps
            if (data.createdAt) data.createdAt = data.createdAt.toDate().toISOString();
            exportObj.alerts.push(data);
        });
        
        // 3. Journey Logs
        const logsSnap = await getDocs(collection(db, "patients", currentUser.uid, "journeyLogs"));
        logsSnap.forEach(d => {
            let data = d.data();
            if (data.createdAt) data.createdAt = data.createdAt.toDate().toISOString();
            exportObj.journeyLogs.push(data);
        });
        
        // Trigger Download
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", `VoxAura_DataExport_${currentUser.uid}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
    } catch (err) {
        console.error("Export Error:", err);
        alert("An error occurred during export.");
    } finally {
        exportDataBtn.innerText = originalText;
        exportDataBtn.disabled = false;
    }
});
