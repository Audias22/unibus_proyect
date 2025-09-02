import { $, RUTAS, PRECIO, sabadoVigente, tipoTexto, CAPACIDAD, claveCap, toast } from "../ui.js";
import { create } from "../reservas.js";

export function StudentView(){
  const sab = sabadoVigente();
  $('#app').innerHTML = `
  <section class="card">
    <h2>Reservar asiento (público)</h2>
    <div class="grid">
      <div class="grid-2">
        <div><label>Nombre y apellido</label><input id="nombre" placeholder="Ej. Ana López" maxlength="80"></div>
        <div><label>Teléfono (opcional)</label><input id="telefono" placeholder="+502 5xx xxx xx" maxlength="20"></div>
      </div>

      <div class="grid-2">
        <div>
          <label>Universidad</label>
          <select id="universidad">
            <option value="">— Seleccionar —</option>
            <option>UMG Zacapa</option><option>USAC Zacapa</option><option>UPANA Zacapa</option>
            <option>UNIS Zacapa</option><option>UVG Zacapa</option><option value="_otra">Otra…</option>
          </select>
          <input id="universidadOtra" placeholder="Escribe el nombre" style="display:none;margin-top:8px">
        </div>
        <div>
          <label>Fecha del viaje</label>
          <input type="date" id="fecha" min="${sab}" max="${sab}" value="${sab}">
          <div class="muted">* Solo sábado vigente.</div>
        </div>
      </div>

      <div class="grid-2">
        <div>
          <label>Ruta / Bus (IDA 5:30 am)</label>
          <select id="ruta">
            <option value="">— Seleccionar —</option>
            <option value="A">Bus A — San Vicente → Cabañas → Zacapa</option>
            <option value="B">Bus B — San Vicente → Huite → Zacapa</option>
          </select>
        </div>
        <div>
          <label>Parada</label>
          <select id="parada"><option value="">— Seleccionar ruta primero —</option></select>
        </div>
      </div>

      <div class="grid-2">
        <div>
          <label>Tipo de viaje / horario</label>
          <select id="tipoViaje">
            <option value="">— Seleccionar —</option>
            <option value="ida_vuelta_1600">Ida y vuelta 4:00 pm</option>
            <option value="ida_vuelta_1730">Ida y vuelta 5:30 pm</option>
            <option value="solo_ida">Solo ida</option>
            <option value="solo_vuelta">Solo vuelta</option>
          </select>
          <select id="horaVuelta" style="display:none;margin-top:8px">
            <option value="">— Hora de vuelta —</option><option value="1600">4:00 pm</option><option value="1730">5:30 pm</option>
          </select>
          <div class="muted" style="margin-top:6px">Costo: <b id="costoLbl">—</b></div>
        </div>
        <div class="row" style="align-items:flex-end;justify-content:space-between">
          <div><div class="muted">Disponibles:</div><div><b id="disponibles">—</b> asientos</div></div>
          <button class="btn btn-primary stretch" id="btnGuardar">Reservar</button>
        </div>
      </div>

      <div><label>Comentario (opcional)</label><textarea id="comentario" placeholder="Notas: referencia, lugar específico…"></textarea></div>
      <div class="muted">Evita duplicados: no te registres dos veces para la misma fecha + ruta/tipo.</div>
    </div>
  </section>`;

  const rutaSel = $('#ruta'), paradaSel = $('#parada'), tipoSel=$('#tipoViaje'), hvSel=$('#horaVuelta'), uniSel=$('#universidad');

  uniSel.onchange = ()=> $('#universidadOtra').style.display = (uniSel.value==='_otra')?'block':'none';
  rutaSel.onchange = ()=>{
    paradaSel.innerHTML = '<option value="">— Seleccionar —</option>';
    const r = rutaSel.value; if(!r) return;
    RUTAS[r].paradas.forEach(p=> paradaSel.insertAdjacentHTML('beforeend', `<option>${p}</option>`));
  };
  tipoSel.onchange = ()=>{
    hvSel.style.display = (tipoSel.value==='solo_vuelta')?'block':'none';
    $('#costoLbl').textContent = tipoSel.value ? `Q${PRECIO[tipoSel.value].toFixed(2)}` : '—';
  };

  async function guardar(){
    const nombre=$('#nombre').value.trim();
    const telefono=$('#telefono').value.trim();
    const uni = uniSel.value==='_otra' ? $('#universidadOtra').value.trim() : uniSel.value;
    const fecha=$('#fecha').value;
    const ruta=rutaSel.value; const parada=paradaSel.value;
    const tipo=tipoSel.value; const horaVuelta=(tipo==='solo_vuelta')?hvSel.value:'';
    const comentario=$('#comentario').value.trim();

    if(!nombre||!uni||!fecha||!tipo){ toast('Completa nombre, universidad, fecha y tipo.'); return; }
    if(fecha!==sab){ toast('Debe ser el sábado vigente.'); return; }
    if(tipo==='solo_vuelta' && !horaVuelta){ toast('Selecciona la hora de vuelta.'); return; }
    if(tipo!=='solo_vuelta' && (!ruta || !parada)){ toast('Selecciona ruta y parada.'); return; }

    try{
      await create({
        nombre, telefono, universidad:uni, fecha, ruta:ruta||'', parada:parada||'',
        tipo, horaVuelta, comentario, precio: PRECIO[tipo], jornadaId: sab
      });
      $('#nombre').value=''; $('#telefono').value=''; $('#comentario').value='';
      toast('Reserva enviada ✅');
    }catch(e){ console.error(e); toast('No se pudo guardar.'); }
  }

  $('#btnGuardar').onclick = guardar;

  // (Opcional) conteo de disponibles se actualizará cuando admin esté conectado;
  // aquí lo dejamos en "—" para no dar falsos positivos.
}
