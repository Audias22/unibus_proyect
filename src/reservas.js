import { db } from "./firebase.js";
import {
  collection, addDoc, onSnapshot, query, where, orderBy,
  updateDoc, deleteDoc, doc, serverTimestamp, getDocs, limit
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const col = collection(db, "reservas");

// === Listado por jornada (igual que ya tenías) ===
export const listenByJornada = (jornadaId, cb, err) =>
  onSnapshot(
    query(col, where("jornadaId","==", jornadaId), orderBy("creadoEn","asc")),
    cb, err
  );

// === CRUD base (mantengo lo tuyo) ===
export const create = (payload) =>
  addDoc(col, { ...payload, creadoEn: serverTimestamp(), pagado: !!payload.pagado });

// Para compatibilidad con lo que ya usas:
export const setPagado = (id, val) => updateDoc(doc(col, id), { pagado: !!val });
export const update   = (id, patch) => updateDoc(doc(col, id), patch);
export const remove   = (id) => deleteDoc(doc(col, id));

// === Marcar abordajes (ida / regreso) ===
// Guarda timestamp + email del admin (auditoría)
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

// === Helpers ===
// Busca una reserva existente por studentId + jornadaId (devuelve null si no existe)
export async function findReservaByStudentAndJornada(studentId, jornadaId){
  if(!studentId || !jornadaId) return null;
  try{
    const q = query(col, where('studentId','==', studentId), where('jornadaId','==', jornadaId), limit(1));
    const snap = await getDocs(q);
    if(!snap || !snap.docs || snap.docs.length===0) return null;
    const d = snap.docs[0];
    return { id: d.id, data: d.data() };
  }catch(e){
    console.error('findReservaByStudentAndJornada error', e);
    return null;
  }
}
