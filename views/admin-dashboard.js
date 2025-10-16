import { $, toast } from '../src/ui.js';
import { listenStudents, updateStudent } from '../src/students.js';

export function AdminDashboardView(){
  $('#app').innerHTML = `
  <section class="card">
    <h2>Dashboard — Lista de estudiantes</h2>
    <div class="row" style="gap:8px;align-items:center">
      <input id="f_qstud" placeholder="Buscar nombre/univ..." style="flex:1;max-width:360px">
      <button class="btn btn-primary" id="btnRefresh">Refrescar</button>
    </div>
    <div id="studList" style="margin-top:12px">Cargando…</div>
    <div id="studError" style="margin-top:12px"></div>
  </section>`;

  let cached = [];

  function render(){
    const q = $('#f_qstud').value.toLowerCase().trim();
    const list = cached.filter(s=> !q || (String(s.nombre||'')+String(s.universidad||'')).toLowerCase().includes(q));
    if(!list.length){ $('#studList').innerHTML = `<div class="empty">No hay estudiantes.</div>`; return; }

    let html = `<table class="rwd"><thead><tr><th>#</th><th>Nombre</th><th>Universidad</th><th>Horario</th><th>Teléfono</th><th>Bus</th><th>Acciones</th></tr></thead><tbody>`;
    list.forEach((s,i)=>{
      html += `<tr>
        <td data-label="#">${i+1}</td>
        <td data-label="Nombre"><input value="${s.nombre||''}" data-id="${s.id}" data-field="nombre" class="inline-edit"></td>
        <td data-label="Universidad"><input value="${s.universidad||''}" data-id="${s.id}" data-field="universidad" class="inline-edit"></td>
        <td data-label="Horario"><select data-id="${s.id}" data-field="horario" class="inline-edit-select"><option value="16:00" ${s.horario==='16:00'?'selected':''}>4:00 pm</option><option value="18:00" ${s.horario==='18:00'?'selected':''}>6:00 pm</option></select></td>
        <td data-label="Teléfono"><input value="${s.telefono||''}" data-id="${s.id}" data-field="telefono" class="inline-edit"></td>
        <td data-label="Bus"><select data-id="${s.id}" data-field="preferredBus" class="inline-edit-select"><option value="">—</option><option value="A" ${s.preferredBus==='A'?'selected':''}>A</option><option value="B" ${s.preferredBus==='B'?'selected':''}>B</option></select></td>
        <td data-label="Acciones"><button class="btn btn-primary btn-sm" data-act="save" data-id="${s.id}">Guardar</button></td>
      </tr>`;
    });
    html += `</tbody></table>`;
    $('#studList').innerHTML = html;

    // attach handlers
    document.querySelectorAll('button[data-act=save]').forEach(b=> b.onclick = async ()=>{
      const id = b.dataset.id; const row = document.querySelectorAll(`[data-id="${id}"]`);
      const patch = {};
      row.forEach(el=>{ const f=el.dataset.field; if(f) patch[f]=el.value; });
      try{ await updateStudent(id, patch); toast('Actualizado'); }catch(e){ console.error(e); toast('Error al guardar'); }
    });
  }

  const stop = listenStudents(snap=>{
    try{ console.debug('AdminDashboardView: students snapshot', snap.size); }catch(e){}
    cached = (snap.docs||[]).map(d=> ({ id:d.id, ...d.data() }));
    render();
  }, err=>{
    console.error('listenStudents error:', err);
    toast('Error lectura estudiantes (suscripción)');
    // Fallback: intentar lectura puntual con getDocs para dar más información
    (async ()=>{
      try{
        const { getDocs, query, orderBy, collection } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
        const { db } = await import('../src/firebase.js');
        const q = query(collection(db, 'students'), orderBy('nombre','asc'));
        const snap2 = await getDocs(q);
        console.debug('AdminDashboardView: fallback getDocs size', snap2.size);
        cached = (snap2.docs||[]).map(d=> ({ id:d.id, ...d.data() }));
        render();
        toast('Lectura puntual de estudiantes (fallback) completa');
      }catch(e2){
        console.error('fallback getDocs error', e2);
        toast('Error leyendo estudiantes (fallback)');
        const errEl = document.getElementById('studError');
        if(errEl){
          // detectar permiso denegado
          const isPerm = (e2 && (e2.code==='permission-denied' || /permission/i.test(String(e2.message||''))));
          if(isPerm){
            errEl.innerHTML = `<div class="card"><div style="color:#900">Permisos insuficientes para leer la colección <b>students</b>. Revisa las reglas de Firestore o la cuenta con la que estás autenticado.</div>
              <ul style="margin-top:8px"><li>En la consola de Firebase → Firestore → Rules revisa que las lecturas estén permitidas para tu usuario.</li>
              <li>Para desarrollo puedes usar reglas abiertas (temporales): <code>allow read, write: if true;</code></li></ul>
              <div style="margin-top:8px"><button id="btnLoadExample" class="btn btn-secondary">Cargar ejemplo local</button></div></div>`;
            document.getElementById('btnLoadExample').onclick = ()=>{
              // Datos de ejemplo (no escriben en Firestore)
              cached = [
                { id:'ex-1', nombre:'Alumno Ejemplo 1', universidad:'UMG Zacapa', horario:'16:00', telefono:'+502 5000 0001', preferredBus:'A' },
                { id:'ex-2', nombre:'Alumno Ejemplo 2', universidad:'USAC Zacapa', horario:'18:00', telefono:'+502 5000 0002', preferredBus:'B' }
              ];
              render();
              errEl.innerHTML = '';
              toast('Datos de ejemplo cargados (local)');
            };
          } else {
            errEl.innerHTML = `<div class="card"><div style="color:#900">Error leyendo estudiantes (fallback). Revisa la consola.</div><div style="margin-top:8px"><button id="btnRetryStudents" class="btn btn-secondary">Reintentar lectura</button> <button id="btnLoadExample2" class="btn btn-secondary">Cargar ejemplo local</button></div></div>`;
            document.getElementById('btnRetryStudents').onclick = async ()=>{
              errEl.innerHTML = 'Leyendo...';
              try{
                const { getDocs, query, orderBy, collection } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
                const { db } = await import('../src/firebase.js');
                const q = query(collection(db, 'students'), orderBy('nombre','asc'));
                const s2 = await getDocs(q);
                cached = (s2.docs||[]).map(d=>({ id:d.id, ...d.data() }));
                render();
                errEl.innerHTML = '';
                toast('Lectura completada');
              }catch(e3){ console.error('retry error', e3); errEl.innerHTML = '<div style="color:#900">Reintentar falló. Ver consola.</div>'; }
            };
            document.getElementById('btnLoadExample2').onclick = ()=>{ cached = [ { id:'ex-1', nombre:'Alumno Ejemplo 1', universidad:'UMG Zacapa', horario:'16:00', telefono:'+502 5000 0001', preferredBus:'A' } ]; render(); errEl.innerHTML=''; toast('Ejemplo local cargado'); };
          }
        }
      }
    })();
  });

  $('#f_qstud').oninput = render;
  $('#btnRefresh').onclick = ()=>{ render(); toast('Refrescado'); };

}

export default AdminDashboardView;
