import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwxYpb7F4NCyFEI0nfKedJ3q8pSklPuzA",
  authDomain: "iv-year-project.firebaseapp.com",
  databaseURL: "https://iv-year-project-default-rtdb.firebaseio.com",
  projectId: "iv-year-project",
  storageBucket: "iv-year-project.firebasestorage.app",
  messagingSenderId: "430239093009",
  appId: "1:430239093009:web:600cf942624cf3f515bcb0",
  measurementId: "G-EV5N7Z1Z1K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
