import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const dynamicAlerts = document.getElementById("dynamic-alerts");
const totalAlertsCount = document.getElementById("total-alerts-count");
const criticalAlertsCount = document.getElementById("critical-alerts-count");

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loadAlerts();
    }
});

async function loadAlerts() {
    if (!currentUser || !dynamicAlerts) return;
    
    try {
        const q = query(collection(db, "patients", currentUser.uid, "alerts"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            dynamicAlerts.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">No alerts recorded yet.</div>';
            totalAlertsCount.innerText = "0";
            criticalAlertsCount.innerText = "0";
            return;
        }
        
        dynamicAlerts.innerHTML = "";
        let total = 0;
        let critical = 0;
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            total++;
            if (data.isCritical) critical++;
            
            let color = "var(--accent)";
            let prefix = "INFO";
            if (data.isCritical) {
                color = "var(--status-red)";
                prefix = "CRITICAL";
            } else if (data.type === "System") {
                color = "var(--accent)";
                prefix = "SYS";
            } else {
                color = "var(--status-yellow)";
                prefix = "WARN";
            }
            
            let timeStr = "--:--:--";
            if (data.createdAt) {
                timeStr = data.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
            }
            
            const div = document.createElement("div");
            div.style.borderLeft = `3px solid ${color}`;
            div.style.paddingLeft = "10px";
            div.innerHTML = `[${timeStr}] ${prefix}: ${data.message} <span style="color: var(--text-muted); font-size: 11px;">(${data.type})</span>`;
            
            dynamicAlerts.appendChild(div);
        });
        
        totalAlertsCount.innerText = total;
        criticalAlertsCount.innerText = critical;
        
    } catch (err) {
        console.error("Error loading alerts:", err);
        dynamicAlerts.innerHTML = '<div style="text-align: center; color: var(--status-red); padding: 20px;">Error loading historical alerts.</div>';
    }
}
