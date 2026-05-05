import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// UI Elements
const loadingOverlay = document.getElementById("loading-overlay");
const intakeContent = document.getElementById("intake-content");
const form = document.getElementById("intake-form");
const nextBtn = document.getElementById("next-btn");
const prevBtn = document.getElementById("prev-btn");
const submitBtn = document.getElementById("submit-btn");
const progressFill = document.getElementById("progress-fill");
const themeToggle = document.getElementById("theme-toggle");

let currentStep = 1;
const totalSteps = 3;
let currentUser = null;

// Handle Auth State
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        // Auto-fill name
        document.getElementById("fullname").value = user.displayName || "";
        
        // Fetch user from firestore to get name if displayname is empty
        if (!user.displayName) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().name) {
                document.getElementById("fullname").value = userDoc.data().name;
            }
        }

        // Check if patient already completed intake
        try {
            const patientDoc = await getDoc(doc(db, "patients", user.uid));
            if (patientDoc.exists()) {
                // Skip intake, redirect to dashboard
                window.location.href = "/dashboard";
            } else {
                // Show form
                loadingOverlay.style.display = "none";
                intakeContent.style.display = "block";
                updateProgress();
            }
        } catch (error) {
            console.error("Error checking patient doc:", error);
            alert("Error connecting to database.");
        }
    } else {
        // Not logged in
        window.location.href = "/login";
    }
});

// Step Navigation
function updateProgress() {
    const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressFill.style.width = `${progress}%`;

    // Show/Hide steps
    document.querySelectorAll(".form-section").forEach((sec, idx) => {
        if (idx + 1 === currentStep) {
            sec.classList.add("active");
        } else {
            sec.classList.remove("active");
        }
    });

    // Buttons visibility
    if (currentStep === 1) {
        prevBtn.style.visibility = "hidden";
    } else {
        prevBtn.style.visibility = "visible";
    }

    if (currentStep === totalSteps) {
        nextBtn.style.display = "none";
        submitBtn.style.display = "flex";
    } else {
        nextBtn.style.display = "flex";
        submitBtn.style.display = "none";
    }
}

function validateStep() {
    const currentSection = document.getElementById(`step-${currentStep}`);
    const inputs = currentSection.querySelectorAll("input[required], select[required]");
    let valid = true;
    inputs.forEach(input => {
        if (!input.checkValidity()) {
            input.reportValidity();
            valid = false;
        }
    });
    return valid;
}

nextBtn.addEventListener("click", () => {
    if (validateStep() && currentStep < totalSteps) {
        currentStep++;
        updateProgress();
    }
});

prevBtn.addEventListener("click", () => {
    if (currentStep > 1) {
        currentStep--;
        updateProgress();
    }
});

// Form Submission
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    // Set loading
    const spinner = submitBtn.querySelector(".spinner");
    const span = submitBtn.querySelector("span");
    submitBtn.disabled = true;
    spinner.style.display = "block";
    span.style.display = "none";

    // Gather data
    const patientData = {
        personalInfo: {
            fullName: document.getElementById("fullname").value,
            dob: document.getElementById("dob").value,
            gender: document.getElementById("gender").value,
            contact: document.getElementById("contact").value,
            emergencyContact: document.getElementById("emergency-contact").value
        },
        medicalInfo: {
            condition: document.getElementById("condition-type").value,
            duration: document.getElementById("duration").value,
            cause: document.getElementById("cause").value,
            history: document.getElementById("medical-history").value
        },
        consents: {
            dataConsent: document.getElementById("consent-data").checked,
            termsConsent: document.getElementById("consent-terms").checked
        },
        createdAt: serverTimestamp()
    };

    try {
        await setDoc(doc(db, "patients", currentUser.uid), patientData);
        alert("Profile saved successfully! Redirecting to dashboard...");
        window.location.href = "/dashboard"; // Redirect to dashboard
    } catch (error) {
        console.error("Error saving patient data:", error);
        alert("Error saving data. Please try again.");
        submitBtn.disabled = false;
        spinner.style.display = "none";
        span.style.display = "block";
    }
});

// Dark Mode Toggle
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const icon = themeToggle.querySelector("i");
    if (document.body.classList.contains("dark-mode")) {
        icon.classList.replace("fa-moon", "fa-sun");
    } else {
        icon.classList.replace("fa-sun", "fa-moon");
    }
});
