export const $ = (s, r=document) => r.querySelector(s);
export const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const toastEl = $('#toast');
export function toast(msg){ toastEl.textContent=msg; toastEl.style.display='block'; setTimeout(()=>toastEl.style.display='none',2200); }
export const CAPACIDAD = 45;

export const TIPO_LABEL = {
  ida_vuelta_1600:'Ida y vuelta 4:00 pm',
  ida_vuelta_1730:'Ida y vuelta 5:30 pm',
  solo_ida:'Solo ida',
  solo_vuelta:'Solo vuelta'
};
export const PRECIO = { ida_vuelta_1600:40, ida_vuelta_1730:40, solo_ida:20, solo_vuelta:20 };

export const RUTAS = {
  A: {
    nombre:'Bus A — San Vicente → Cabañas → Zacapa',
    paradas:[
      'San Vicente (Parque)',
      'Cabañas (Parque)',
      'El Cruce',
      'Gasolinera Texaco',
      'Entrada La Cruz',
      'Zacapa (Centro)'
    ]
  },
  B: {
    nombre:'Bus B — San Vicente → Huite → Zacapa',
    paradas:[
      'San Vicente (Parque)',
      'Huite (Parque)',
      'Entrada El Molino',
      'Entrada La Colonia',
      'El Cruce',
      'Gasolinera Texaco',
      'Zacapa (Centro)'
    ]
  }
};

export const esc = s => (s??'').toString().replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

export function toISODate(d){ return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); }
export function parseISO(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
export function sabadoVigente(){
  const now=new Date(); const delta=(6-now.getDay()+7)%7;
  const t=new Date(now); t.setHours(0,0,0,0); t.setDate(t.getDate()+delta);
  return toISODate(t);
}
export function tipoTexto(r){ return r.tipo==='solo_vuelta' ? `Solo vuelta ${r.horaVuelta==='1600'?'4:00 pm':'5:30 pm'}` : (TIPO_LABEL[r.tipo]||r.tipo); }
export function claveCap(x){
  return x.tipo==='solo_vuelta' ? `${x.fecha}|REGRESO|${x.tipo}|${x.horaVuelta||''}` : `${x.fecha}|${x.ruta}|${x.tipo}`;
}

export function csvVal(v){ const s=(v??'').toString(); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }
