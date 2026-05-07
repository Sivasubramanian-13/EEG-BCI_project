import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const generateBtn = document.getElementById("generate-pdf-btn");
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
    }
});

function calculateAge(dobStr) {
    if (!dobStr) return "--";
    const dob = new Date(dobStr);
    const diff = Date.now() - dob.getTime();
    return new Date(diff).getUTCFullYear() - 1970;
}

generateBtn?.addEventListener("click", async () => {
    if (!currentUser) {
        alert("Please log in first.");
        return;
    }

    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    generateBtn.disabled = true;

    try {
        // 1. Fetch Patient Info
        const patientDoc = await getDoc(doc(db, "patients", currentUser.uid));
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        
        let pd = patientDoc.exists() ? patientDoc.data() : {};
        let ud = userDoc.exists() ? userDoc.data() : {};

        document.getElementById("pdf-date").innerText = new Date().toLocaleDateString();
        document.getElementById("pdf-patient-name").innerText = pd.personalInfo?.fullName || ud.name || currentUser.email;
        
        let age = pd.personalInfo?.dob ? calculateAge(pd.personalInfo.dob) : "--";
        let gender = pd.personalInfo?.gender || "--";
        document.getElementById("pdf-patient-demographics").innerText = `${age} yrs, ${gender}`;
        
        document.getElementById("pdf-patient-condition").innerText = pd.medicalInfo?.condition || "Not Specified";
        document.getElementById("pdf-patient-id").innerText = currentUser.uid.substring(0, 8).toUpperCase();

        // 2. Fetch Alerts
        const alertsQ = query(collection(db, "patients", currentUser.uid, "alerts"));
        const alertsSnap = await getDocs(alertsQ);
        let totalAlerts = 0;
        let criticalAlerts = 0;
        alertsSnap.forEach(doc => {
            totalAlerts++;
            if (doc.data().isCritical) criticalAlerts++;
        });
        document.getElementById("pdf-total-alerts").innerText = totalAlerts;
        document.getElementById("pdf-critical-alerts").innerText = criticalAlerts;

        // 3. Fetch Journey Logs
        const logsQ = query(collection(db, "patients", currentUser.uid, "journeyLogs"), orderBy("date", "desc"));
        const logsSnap = await getDocs(logsQ);
        const tbody = document.getElementById("pdf-journey-logs");
        tbody.innerHTML = "";
        
        if (logsSnap.empty) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No journey logs available.</td></tr>';
        } else {
            logsSnap.forEach(doc => {
                const data = doc.data();
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${data.date}</td>
                    <td><strong style="color: ${data.status === 'Critical' ? '#ef4444' : (data.status === 'Improving' ? '#eab308' : '#22c55e')}">${data.status}</strong></td>
                    <td>${data.notes}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        // 4. Generate PDF
        const element = document.getElementById("pdf-template");
        element.style.display = "block"; // Temporarily show it
        
        const opt = {
            margin:       1,
            filename:     `VoxAura_Report_${currentUser.uid.substring(0,6)}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(element).save();
        
        element.style.display = "none"; // Hide again
        
    } catch (err) {
        console.error("Error generating PDF:", err);
        alert("An error occurred while generating the report. " + err.message);
    } finally {
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    }
});
