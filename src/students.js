import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const col = collection(db, 'students');

export const createStudent = async (payload) => {
  return await addDoc(col, { ...payload, creadoEn: serverTimestamp() });
};

export const listenStudents = (cb, err) =>
  onSnapshot(query(col, orderBy('nombre','asc')), cb, err);

export const updateStudent = (id, patch) => updateDoc(doc(db,'students',id), patch);

export default { createStudent, listenStudents, updateStudent };
