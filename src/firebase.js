// Firebase modular SDK por CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDokAFIRVJRSkuusmS1qYZR_bZK0QMJXoQ",
  authDomain: "unibus-zacapa-prod.firebaseapp.com",
  projectId: "unibus-zacapa-prod",
  storageBucket: "unibus-zacapa-prod.firebasestorage.app",
  messagingSenderId: "406353089667",
  appId: "1:406353089667:web:1f9cf1b2e4867f25f2f7b6"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
