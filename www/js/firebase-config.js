import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { initializeFirestore, collection, getDocs, setDoc, doc, addDoc, updateDoc, deleteDoc, getDoc, query, where, orderBy, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// ==========================================
// PASTE YOUR FIREBASE CONFIGURATION HERE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyD_bxTVPpSES36UHiaKoqBGBeI54ccwr2c",
    authDomain: "antiko-cb40b.firebaseapp.com",
    projectId: "antiko-cb40b",
    storageBucket: "antiko-cb40b.firebasestorage.app",
    messagingSenderId: "548565193060",
    appId: "1:548565193060:web:8089850e62f323c052ea71"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Enable Long Polling for resilience against SSL/Proxy issues
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false
});

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
    app, db, auth, googleProvider, GoogleAuthProvider,
    collection, getDocs, setDoc, doc, addDoc, updateDoc, deleteDoc, getDoc, query, where, orderBy, onSnapshot, writeBatch,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential
};
