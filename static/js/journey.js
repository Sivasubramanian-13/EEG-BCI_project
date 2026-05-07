import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, orderBy, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const toggleLogBtn = document.getElementById("toggle-log-btn");
const journeyForm = document.getElementById("journey-form");
const dynamicTimeline = document.getElementById("dynamic-timeline");

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loadLogs();
    }
});

toggleLogBtn?.addEventListener("click", () => {
    if (journeyForm.style.display === "none") {
        journeyForm.style.display = "block";
        toggleLogBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
    } else {
        journeyForm.style.display = "none";
        toggleLogBtn.innerHTML = '<i class="fas fa-plus"></i> Add Log';
    }
});

journeyForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const saveBtn = document.getElementById("save-log-btn");
    saveBtn.innerText = "Saving...";
    saveBtn.disabled = true;

    const dateStr = document.getElementById("log-date").value;
    const status = document.getElementById("log-status").value;
    const notes = document.getElementById("log-notes").value;

    try {
        await addDoc(collection(db, "patients", currentUser.uid, "journeyLogs"), {
            date: dateStr,
            status: status,
            notes: notes,
            createdAt: serverTimestamp()
        });
        
        journeyForm.reset();
        journeyForm.style.display = "none";
        toggleLogBtn.innerHTML = '<i class="fas fa-plus"></i> Add Log';
        
        // Reload logs
        loadLogs();
    } catch (err) {
        console.error("Error saving log:", err);
        alert("Failed to save log.");
    } finally {
        saveBtn.innerText = "Save Log";
        saveBtn.disabled = false;
    }
});

async function loadLogs() {
    if (!currentUser || !dynamicTimeline) return;
    
    dynamicTimeline.innerHTML = '<p style="color: var(--text-muted);">Loading logs...</p>';
    
    try {
        const q = query(collection(db, "patients", currentUser.uid, "journeyLogs"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            dynamicTimeline.innerHTML = '<p style="color: var(--text-muted);">No journey logs found. Add one above.</p>';
            return;
        }
        
        dynamicTimeline.innerHTML = "";
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Map status to color
            let color = "var(--accent)";
            if (data.status === "Critical") color = "var(--status-red)";
            else if (data.status === "Improving") color = "var(--status-yellow)";
            else if (data.status === "Stable") color = "var(--status-green)";
            
            const div = document.createElement("div");
            div.style.position = "relative";
            div.style.marginBottom = "30px";
            
            div.innerHTML = `
                <div style="position: absolute; left: -37px; top: 0; width: 12px; height: 12px; background: ${color}; border-radius: 50%; box-shadow: 0 0 10px ${color};"></div>
                <h4 style="color: var(--text-primary); margin-bottom: 5px;">${data.date} - ${data.status}</h4>
                <p style="color: var(--text-muted); font-size: 14px;">${data.notes}</p>
            `;
            
            dynamicTimeline.appendChild(div);
        });
        
    } catch (err) {
        console.error("Error loading logs:", err);
        dynamicTimeline.innerHTML = '<p style="color: var(--status-red);">Error loading logs.</p>';
    }
}
