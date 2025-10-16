import { $, esc, sabadoVigente, toast, tipoTexto } from '../src/ui.js';
import { listenStudents, createStudent, updateStudent } from '../src/students.js';
import { listenByJornada, create, update, findReservaByStudentAndJornada } from '../src/reservas.js';

export function AdminRosterView(){
  $('#app').innerHTML = `
  <section class="card">
    <h2>Roster — Marcar abordos y pagos</h2>
    <div class="grid-2">
      <div><label>Fecha (jornada)</label><input type="date" id="r_fecha" value="${sabadoVigente()}"></div>
      <div><label>Buscar</label><input id="r_q" placeholder="Buscar nombre/univ..."></div>
    </div>
    <div style="margin-top:12px"><button id="btnLoadRoster" class="btn btn-primary">Cargar roster</button></div>
    <div id="rosterList" style="margin-top:12px">Esperando carga...</div>
  </section>`;

  let students = [];
  let reservas = [];

  function render(){
    const q = ($('#r_q').value||'').toLowerCase().trim();
    const fecha = $('#r_fecha').value;
    const list = students.filter(s=> !q || (String(s.nombre||'')+String(s.universidad||'')).toLowerCase().includes(q));
    if(!list.length){ $('#rosterList').innerHTML = `<div class="empty">No hay estudiantes.</div>`; return; }

    const html = list.map(s=>{
      const r = reservas.find(x=> x.studentId===s.id) || {};
      const tipo = r.tipo || 'solo_ida';
      const horaV = r.horaVuelta || '';
      const pag = !!r.pagado;
      const precio = Number(r.precio||20).toFixed(2);
      return `
        <div class="card" style="margin-bottom:8px;padding:10px;display:flex;gap:8px;align-items:center">
          <div style="flex:1">
            <strong>${esc(s.nombre)}</strong><br><small class="muted">${esc(s.universidad||'')}</small>
          </div>
          <div style="width:320px;display:flex;gap:8px;align-items:center">
            <select data-student="${s.id}" data-action="tipo">
              <option value="solo_ida" ${tipo==='solo_ida'?'selected':''}>Solo ida</option>
              <option value="ida_vuelta" ${tipo==='ida_vuelta'?'selected':''}>Ida y vuelta</option>
            </select>
            <select data-student="${s.id}" data-action="hora">
              <option value="">— Hora —</option>
              <option value="16:00" ${horaV==='16:00'?'selected':''}>4:00 pm</option>
              <option value="18:00" ${horaV==='18:00'?'selected':''}>6:00 pm</option>
            </select>
            <input data-student="${s.id}" data-action="precio" class="input small" type="number" value="${precio}">
            <label class="pagado-control"><input type="checkbox" data-student="${s.id}" data-action="pagado" ${pag? 'checked':''}> <span class="pagado-badge ${pag? 'pagado-yes':'pagado-no'}">${pag? 'Pagado':'No'}</span></label>
            <button class="btn btn-secondary" data-student="${s.id}" data-action="save">Guardar</button>
          </div>
        </div>
      `;
    }).join('\n');

    $('#rosterList').innerHTML = html;

    // delegación
    $('#rosterList').onclick = async (e)=>{
      const b = e.target.closest('button'); if(!b) return;
      const sid = b.dataset.student;
      const rowSelects = document.querySelectorAll(`[data-student="${sid}"]`);
      const payload = {};
      rowSelects.forEach(el=>{
        const a = el.dataset.action;
        if(a==='tipo') payload.tipo = el.value;
        if(a==='hora') payload.horaVuelta = el.value;
        if(a==='precio') payload.precio = Number(el.value||0);
        if(a==='pagado') payload.pagado = el.checked;
      });

      try{
        // buscar en servidor (más fiable) si ya existe reserva para este estudiante + jornada
        const found = await findReservaByStudentAndJornada(sid, fecha);
        if(found && found.id){
          await update(found.id, payload);
          toast('Reserva actualizada');
        } else {
          const student = students.find(s=> s.id===sid) || {};
          const createPayload = {
            nombre: student.nombre||'', universidad: student.universidad||'', telefono: student.telefono||'', ruta:'', parada:'',
            tipo: payload.tipo||'solo_ida', fecha: fecha, jornadaId: fecha, precio: payload.precio||20, pagado: !!payload.pagado, studentId: sid
          };
          await create(createPayload);
          toast('Reserva creada');
        }
        // refrescar reservas
        loadReservas(fecha);
      }catch(e){ console.error(e); toast('Error guardando'); }
    };
  }

  // listeners
  const stopStudents = listenStudents(snap=>{
    students = (snap.docs||[]).map(d=> ({ id:d.id, ...d.data() }));
    $('#rosterList').innerHTML = '<div class="muted">Lista de estudiantes cargada.</div>';
  }, err=>{ console.error(err); $('#rosterList').innerHTML = '<div style="color:#900">Error leyendo estudiantes. Usa "Cargar ejemplo"</div>'; });

  async function loadReservas(fecha){
    // simple: usar listenByJornada una vez
    if(window._tmpReservaStop) try{ window._tmpReservaStop(); }catch{}
    window._tmpReservaStop = listenByJornada(fecha, snap=>{
      reservas = (snap.docs||[]).map(d=> ({ _id:d.id, ...d.data() }));
      render();
    }, err=>{ console.error(err); toast('Error leyendo reservas'); render(); });
  }

  $('#btnLoadRoster').onclick = ()=>{ const f = $('#r_fecha').value || sabadoVigente(); loadReservas(f); };
  $('#r_q').oninput = render;
  $('#r_fecha').onchange = ()=>{ const f = $('#r_fecha').value || sabadoVigente(); loadReservas(f); };

}

export default AdminRosterView;
