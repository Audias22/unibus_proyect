import { db } from "./firebase.js";
import {
  collection, addDoc, onSnapshot, query, where, orderBy,
  updateDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const col = collection(db, "reservas");

// Escucha por jornada (como ya tenías)
export const listenByJornada = (jornadaId, cb, err) =>
  onSnapshot(
    query(col, where("jornadaId","==", jornadaId), orderBy("creadoEn","asc")),
    cb, err
  );

// CRUD (como ya tenías)
export const create = (payload) => addDoc(col, { ...payload, creadoEn: serverTimestamp(), pagado:false });
export const setPagado = (id, val) => updateDoc(doc(col, id), { pagado: !!val });
export const update   = (id, patch) => updateDoc(doc(col, id), patch);
export const remove   = (id) => deleteDoc(doc(col, id));

// === NUEVO: marcar abordajes (ida / regreso) ===
// Guarda timestamp + email del admin para auditoría.
// Estructura resultante en cada doc:
// abordos: { idaAt, idaBy, regreso_1600At, regreso_1600By, regreso_1730At, regreso_1730By }
export const marcarAbordoIda = (id, adminEmail) =>
  updateDoc(doc(col, id), {
    'abordos.idaAt': serverTimestamp(),
    'abordos.idaBy': adminEmail || null
  });

export const marcarAbordoRegreso = (id, hora /* '1600' | '1730' */, adminEmail) =>
  updateDoc(doc(col, id), {
    [`abordos.regreso_${hora}At`]: serverTimestamp(),
    [`abordos.regreso_${hora}By`]: adminEmail || null
  });
