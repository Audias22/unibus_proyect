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
  }, err=>{ console.error(err); toast('Error lectura estudiantes'); });

  $('#f_qstud').oninput = render;
  $('#btnRefresh').onclick = ()=>{ render(); toast('Refrescado'); };

}

export default AdminDashboardView;
