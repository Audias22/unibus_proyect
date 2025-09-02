import { db } from "./firebase.js";
import {
  collection, addDoc, onSnapshot, query, where, orderBy,
  updateDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const col = collection(db, "reservas");

export const listenByJornada = (jornadaId, cb, err) =>
  onSnapshot(query(col, where("jornadaId","==", jornadaId), orderBy("creadoEn","asc")), cb, err);

export const create = (payload) => addDoc(col, { ...payload, creadoEn: serverTimestamp(), pagado:false });
export const setPagado = (id, val) => updateDoc(doc(col, id), { pagado: !!val });
export const update   = (id, patch) => updateDoc(doc(col, id), patch);
export const remove   = (id) => deleteDoc(doc(col, id));
