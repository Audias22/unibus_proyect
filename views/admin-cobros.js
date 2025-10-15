import { $, esc, tipoTexto, PRECIO, sabadoVigente, toast } from "../src/ui.js";
import { listenByJornada, setPagado } from "../src/reservas.js";

let stop = null, data = [];

export function AdminCobrosView(){
  const sab = sabadoVigente();
  $('#app').innerHTML = `
  <section class="card">
    <div class="row" style="gap:16px">
      <h2 style="margin:0">Cobros por jornada</h2>
      <span class="badge" id="resumen">—</span>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
        <label class="muted" style="margin:0 8px 0 0">Sábado:</label>
        <input type="date" id="f_fechaCobros" value="${sab}">
      </div>
    </div>
    <div id="lista"></div>
  </section>`;

  // iniciar listener sobre la jornada seleccionada
  const fechaInput = $('#f_fechaCobros');
  function startListener(jornada){
    if (typeof stop === 'function') stop();
    stop = listenByJornada(jornada, snap=>{
      console.debug('[listenByJornada] jornada=', jornada, 'docs=', snap.size);
      try{ console.debug(snap.docs.slice(0,5).map(d=>({ id:d.id, ...d.data() }))); }catch(e){ console.debug('No se pudo leer datos de snap:', e); }
      data = snap.docs.map(d=> ({ _id:d.id, ...d.data() }));
      render();
    }, err=>{ console.error(err); toast('Error de lectura'); });
  }

  startListener(fechaInput.value);
  fechaInput.onchange = ()=> startListener(fechaInput.value);
}

function render(){
  const lista = $('#lista');
  if(!data.length){ lista.innerHTML = `<div class="empty">Sin registros para hoy.</div>`; $('#resumen').textContent='—'; return; }

  const total = data.reduce((a,r)=>a+(r.precio||0),0);
  const pagado = data.filter(r=>r.pagado).reduce((a,r)=>a+(r.precio||0),0);
  $('#resumen').textContent = `Total Q${total.toFixed(2)} · Pagado Q${pagado.toFixed(2)} · Pend. Q${(total-pagado).toFixed(2)} · Registros ${data.length}`;

  let html = `<table class="rwd"><thead><tr>
    <th>#</th><th>Nombre</th><th>Tipo/Hora</th><th>Precio</th><th>Pagado</th></tr></thead><tbody>`;
  data.forEach((r,i)=>{
    html += `<tr>
      <td data-label="#">${i+1}</td>
      <td data-label="Nombre">${esc(r.nombre)}</td>
      <td data-label="Tipo/Hora">${esc(tipoTexto(r))}</td>
      <td data-label="Precio">Q${(r.precio||0).toFixed(2)}</td>
      <td data-label="Pagado">
        <label class="pagado-control">
          <input type="checkbox" data-id="${r._id}" ${r.pagado?'checked':''}>
          <span class="pagado-badge ${r.pagado? 'pill pill-ok pagado-yes' : 'pill pagado-no'}">${r.pagado? 'Sí' : 'No'}</span>
        </label>
      </td>
    </tr>`;
  });
  html += `</tbody></table>`;
  lista.innerHTML = html;

  lista.onchange = async (e)=>{
    const chk = e.target.closest('input[type=checkbox][data-id]'); if(!chk) return;
    const id = chk.getAttribute('data-id');
    try{ await setPagado(id, chk.checked); }catch(err){ console.error(err); toast('No se pudo actualizar'); chk.checked = !chk.checked; }
  };
}
