import { $, RUTAS, PRECIO, sabadoVigente, tipoTexto, CAPACIDAD, claveCap, toast } from "../src/ui.js";
import { create, listenByJornada } from "../src/reservas.js";

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
  </section>
  <section class="card" id="qrSection" style="display:none;margin-top:24px;text-align:center">
    <h2>Reserva realizada</h2>
    <div id="qrMsg"></div>
    <canvas id="qrCanvas" style="margin:16px auto;display:block;"></canvas>
    <div style="display:flex;gap:10px;justify-content:center">
      <button class="btn btn-secondary" id="btnDescargarQR">Descargar QR</button>
      <button class="btn btn-secondary" id="btnDescargarPDF">Descargar PDF</button>
    </div>
    <div class="muted" style="margin-top:8px">Muestra este QR al subir al bus.</div>
  </section>`;

  const rutaSel = $('#ruta'), paradaSel = $('#parada'), tipoSel=$('#tipoViaje'), hvSel=$('#horaVuelta'), uniSel=$('#universidad');
  const disponiblesLbl = $('#disponibles');

  // Actualizar asientos disponibles en tiempo real
  function actualizarDisponibles() {
    disponiblesLbl.textContent = '—';
    // Solo mostrar si hay ruta y tipo seleccionados
    const ruta = rutaSel.value, tipo = tipoSel.value, fecha = $('#fecha').value;
    if (!ruta || !tipo || !fecha) return;
    // Solo cuenta reservas para la misma fecha, ruta y tipo
    if (typeof window._stopDisponibles === 'function') window._stopDisponibles();
    window._stopDisponibles = listenByJornada(sab, snap => {
      // Filtrar por ruta y tipo
      const reservas = snap.docs.map(d=>d.data()).filter(r => r.ruta === ruta && r.tipo === tipo);
      const ocupados = reservas.length;
      disponiblesLbl.textContent = `${CAPACIDAD - ocupados}/${CAPACIDAD}`;
    });
  }

  rutaSel.onchange = ()=>{
    paradaSel.innerHTML = '<option value="">— Seleccionar —</option>';
    const r = rutaSel.value; if(!r) return;
    RUTAS[r].paradas.forEach(p=> paradaSel.insertAdjacentHTML('beforeend', `<option>${p}</option>`));
    actualizarDisponibles();
  };
  tipoSel.onchange = ()=>{
    hvSel.style.display = (tipoSel.value==='solo_vuelta')?'block':'none';
    $('#costoLbl').textContent = tipoSel.value ? `Q${PRECIO[tipoSel.value].toFixed(2)}` : '—';
    actualizarDisponibles();
  };
  $('#fecha').onchange = actualizarDisponibles;

  // Inicializar disponibles al cargar
  setTimeout(actualizarDisponibles, 0);

  uniSel.onchange = ()=> $('#universidadOtra').style.display = (uniSel.value==='_otra')?'block':'none';


  // Mostrar QR si existe en localStorage
  function mostrarQRReserva(alerta=false) {
    const qrData = localStorage.getItem('qrReserva');
    const qrMsg = localStorage.getItem('qrMsg');
    if (qrData && qrMsg) {
      $('#qrSection').style.display = 'block';
      $('#qrMsg').textContent = qrMsg;
      const qr = new QRious({ 
        element: $('#qrCanvas'), 
        value: qrData, 
        size: 320, // tamaño grande para mejor lectura
        background: '#fff', // fondo blanco
        foreground: '#000'  // QR negro
      });
      $('#btnDescargarQR').onclick = function() {
        const link = document.createElement('a');
        link.download = 'reserva_unibus_qr.png';
        link.href = $('#qrCanvas').toDataURL();
        link.click();
      };
      $('#btnDescargarPDF').onclick = function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const imgData = $('#qrCanvas').toDataURL('image/png');
        doc.setFontSize(16);
        doc.text('Reserva UniBus Zacapa', 20, 20);
        doc.setFontSize(12);
        doc.text($('#qrMsg').textContent, 20, 30);
        doc.addImage(imgData, 'PNG', 50, 40, 100, 100);
        doc.save('reserva_unibus_qr.pdf');
      };
      // Solo mostrar la alerta si se indica (tras reservar)
      if(alerta) {
        setTimeout(()=>{
          if (window.Swal) {
            Swal.fire({
              icon: 'info',
              title: '¡Reserva completada!',
              text: 'Descarga tu ticket antes de salir de este sitio.',
              confirmButtonText: 'Entendido',
              customClass: {popup: 'swal2-border-radius'}
            });
          }
        }, 300);
      }
    }
  }

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
      // Crear reserva y obtener ID
      const docRef = await create({
        nombre, telefono, universidad:uni, fecha, ruta:ruta||'', parada:parada||'',
        tipo, horaVuelta, comentario, precio: PRECIO[tipo], jornadaId: sab
      });
      $('#nombre').value=''; $('#telefono').value=''; $('#comentario').value='';
      toast('Reserva enviada ✅');

      // Generar QR con el ID de la reserva
      const qrData = `UNIBUS|${docRef.id}`;
      const qrMsg = `Reserva a nombre de ${nombre} para el bus ${ruta} el ${fecha}`;
      localStorage.setItem('qrReserva', qrData);
      localStorage.setItem('qrMsg', qrMsg);
  mostrarQRReserva(true);
    }catch(e){ console.error(e); toast('No se pudo guardar.'); }
  }

  $('#btnGuardar').onclick = guardar;
  mostrarQRReserva(false);

  // (Opcional) conteo de disponibles se actualizará cuando admin esté conectado;
  // aquí lo dejamos en "—" para no dar falsos positivos.
}
