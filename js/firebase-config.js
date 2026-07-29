/* ==========================================================================
   PAVAN PORTFOLIO — FIREBASE CLOUD DATABASE & AUTH CONFIGURATION
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    onSnapshot, 
    doc, 
    setDoc,
    addDoc, 
    deleteDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase Web App credentials
const firebaseConfig = {
  apiKey: "AIzaSyCc653iNyuxms2oKmA1gnBElP-dAWgeVkc",
  authDomain: "portfolotio.firebaseapp.com",
  projectId: "portfolotio",
  storageBucket: "portfolotio.firebasestorage.app",
  messagingSenderId: "744837855288",
  appId: "1:744837855288:web:26cd37743a026570ec4ecd",
  measurementId: "G-P52T396T8M"
};

// Check if config has been set up with actual project credentials
const isFirebaseConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_FIREBASE_API_KEY_HERE");

let app = null;
let db = null;
let auth = null;
let analytics = null;

if (isFirebaseConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        try {
            analytics = getAnalytics(app);
        } catch (analyticsErr) {
            console.log("Firebase Analytics unavailable in current context:", analyticsErr);
        }
        console.log("Firebase Cloud Sync initialized successfully.");
    } catch (e) {
        console.warn("Firebase initialization skipped (running in offline/local mode):", e);
    }
} else {
    console.log("Running in standalone local storage mode. Connect Firebase in js/firebase-config.js for live global deployment.");
}

export { app, db, auth, analytics, isFirebaseConfigured, collection, getDocs, onSnapshot, doc, setDoc, addDoc, deleteDoc, updateDoc, signInWithEmailAndPassword, signOut, onAuthStateChanged };


