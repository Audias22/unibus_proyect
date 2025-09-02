import { auth } from "./firebase.js";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

export const watchAuth = (cb) => onAuthStateChanged(auth, cb);
export const login     = (email, pass) => signInWithEmailAndPassword(auth, email, pass);
export const logout    = () => signOut(auth);
export const current   = () => auth.currentUser;
