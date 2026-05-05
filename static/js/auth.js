import { auth, db } from "./firebase-config.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// UI Elements
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-message");
const toastIcon = document.getElementById("toast-icon");
const togglePwdBtns = document.querySelectorAll(".toggle-password");
const errorMsg = document.getElementById("error-msg");

// Forms
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");

// Toast Utility
function showToast(message, type = "success") {
    toastMsg.innerText = message;
    toast.className = `toast show ${type}`;
    toastIcon.className = type === "success" ? "fas fa-check-circle" : "fas fa-exclamation-triangle";
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// Show Error
function showError(message) {
    if (errorMsg) {
        errorMsg.innerText = message;
        errorMsg.style.display = "block";
    }
}

function clearError() {
    if (errorMsg) errorMsg.style.display = "none";
}

// Set Button Loading State
function setButtonLoading(btnId, isLoading, originalText) {
    const btn = document.getElementById(btnId);
    const textSpan = btn.querySelector("span");
    const spinner = btn.querySelector(".spinner");

    if (isLoading) {
        btn.disabled = true;
        textSpan.style.display = "none";
        spinner.style.display = "block";
    } else {
        btn.disabled = false;
        textSpan.style.display = "block";
        spinner.style.display = "none";
        textSpan.innerText = originalText;
    }
}

// Toggle Password Visibility
togglePwdBtns.forEach(btn => {
    btn.addEventListener("click", function() {
        const input = this.previousElementSibling;
        if (input.type === "password") {
            input.type = "text";
            this.classList.replace("fa-eye", "fa-eye-slash");
        } else {
            input.type = "password";
            this.classList.replace("fa-eye-slash", "fa-eye");
        }
    });
});

// Login Logic
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearError();
        
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const rememberMe = document.getElementById("remember-me").checked;
        
        // Prevent Firebase call if API key is not configured
        if (auth.app.options.apiKey === "YOUR_API_KEY") {
            showError("Firebase is not configured! Please open static/js/firebase-config.js and paste your actual Web API Key.");
            return;
        }

        setButtonLoading("login-btn", true, "Sign In");

        try {
            // Set persistence based on remember me
            const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistenceType);
            
            await signInWithEmailAndPassword(auth, email, password);
            showToast("Login successful!", "success");
            
            // Redirect to intake form checking (intake.html will handle redirecting to dashboard if already completed)
            setTimeout(() => {
                window.location.href = "/intake";
            }, 1000);
            
        } catch (error) {
            console.error("Login Error:", error);
            showError(error.message.replace("Firebase: ", ""));
            setButtonLoading("login-btn", false, "Sign In");
        }
    });

    // Forgot Password Link
    document.getElementById("forgot-password").addEventListener("click", async (e) => {
        e.preventDefault();
        
        if (auth.app.options.apiKey === "YOUR_API_KEY") {
            showError("Firebase is not configured! Please open static/js/firebase-config.js and paste your actual Web API Key.");
            return;
        }

        const email = document.getElementById("email").value;
        if (!email) {
            showError("Please enter your email address first to reset password.");
            return;
        }
        
        try {
            await sendPasswordResetEmail(auth, email);
            showToast("Password reset email sent!", "success");
            clearError();
        } catch (error) {
            showError(error.message.replace("Firebase: ", ""));
        }
    });
}

// Signup Logic
if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearError();

        const fullname = document.getElementById("fullname").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirm-password").value;

        if (password !== confirmPassword) {
            showError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            showError("Password must be at least 6 characters long.");
            return;
        }

        if (auth.app.options.apiKey === "YOUR_API_KEY") {
            showError("Firebase is not configured! Please open static/js/firebase-config.js and paste your actual Web API Key.");
            return;
        }

        setButtonLoading("signup-btn", true, "Create Account");

        try {
            // Create user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Save additional details in Firestore users collection
            const saveDocPromise = setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: fullname,
                email: email,
                createdAt: serverTimestamp()
            });

            // Add a timeout in case Firestore Database isn't enabled in the console
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Firestore database connection timed out. Please ensure Cloud Firestore is enabled in your Firebase Console.")), 5000)
            );

            await Promise.race([saveDocPromise, timeoutPromise]);

            showToast("Account created successfully!", "success");
            
            // Redirect to intake form
            setTimeout(() => {
                window.location.href = "/intake";
            }, 1000);

        } catch (error) {
            console.error("Signup Error:", error);
            showError(error.message.replace("Firebase: ", ""));
            setButtonLoading("signup-btn", false, "Create Account");
        }
    });
}
