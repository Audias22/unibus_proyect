import { $, esc, RUTAS, TIPO_LABEL, tipoTexto, sabadoVigente, csvVal, toast } from "../src/ui.js";
import { listenByJornada, update, remove } from "../src/reservas.js";

let stop=null, rows=[];

export function AdminGestionView(){
  $('#app').innerHTML = `
  <section class="card">
    <h2>Filtros & Acciones</h2>
    <div class="grid">
      <div class="grid-2">
        <div><label>Fecha</label><input type="date" id="f_fecha" value="${sabadoVigente()}"></div>
        <div>
          <label>Ruta</label><select id="f_ruta"><option value="">Todas</option><option value="A">Bus A</option><option value="B">Bus B</option></select>
        </div>
      </div>
      <div class="grid-2">
        <div>
          <label>Tipo de viaje</label>
          <select id="f_tipo">
            <option value="">Todos</option><option value="ida_vuelta_1600">Ida y vuelta 4:00 pm</option><option value="ida_vuelta_1730">Ida y vuelta 5:30 pm</option><option value="solo_ida">Solo ida</option><option value="solo_vuelta">Solo vuelta</option>
          </select>
          <select id="f_hora" style="display:none;margin-top:8px"><option value="">— Hora —</option><option value="1600">4:00 pm</option><option value="1730">5:30 pm</option></select>
        </div>
        <div><label>Buscar</label><input id="f_q" placeholder="Nombre/Univ/Parada…"></div>
      </div>
      <div class="row">
        <button class="btn btn-secondary" id="btnCSV">Exportar CSV</button>
        <button class="btn btn-secondary" id="btnWA">WhatsApp (lista)</button>
        <button class="btn btn-primary" id="btnScanQR">Escanear QR</button>
        <span class="right muted">Total: <b id="totales">0</b></span>
      </div>
    </div>
    <div id="qrScanPanel" style="display:none;margin-top:18px">
      <h3>Escanear QR de reserva</h3>
      <div id="qr-reader" style="width:320px;margin:auto;"></div>
      <div id="qr-result" style="margin-top:10px"></div>
      <button class="btn btn-secondary" id="btnCloseQR">Cerrar escáner</button>
    </div>
  </section>

  <section class="card">
    <h2>Lista de pasajeros</h2>
    <div id="tabla"></div>
  </section>`;

  // Escaneo QR (mejorado)
$('#btnScanQR').onclick = async () => {
  $('#qrScanPanel').style.display = 'block';
  $('#qr-result').textContent = 'Inicializando cámara…';

  // 1) Cargar html5-qrcode si hace falta
  async function ensureHtml5Qrcode() {
    if (window.Html5Qrcode) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/html5-qrcode@2.3.10/minified/html5-qrcode.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('No se pudo cargar html5-qrcode'));
      document.body.appendChild(s);
    });
  }

  // 2) Mensajes claros
  function mapErr(e) {
    const m = (e && e.message) ? e.message : String(e || '');
    if (location.protocol !== 'https:' && location.hostname !== 'localhost')
      return 'Abre el sitio en HTTPS o en http://localhost para usar la cámara.';
    if (/Permission|NotAllowedError/i.test(m)) return 'Permiso de cámara denegado.';
    if (/NotFoundError|no camera|no cameras/i.test(m)) return 'No hay cámaras disponibles.';
    if (/InUse|NotReadable|TrackStart/i.test(m)) return 'La cámara está en uso por otra app.';
    return 'No se pudo iniciar la cámara: ' + m;
  }

  try {
    await ensureHtml5Qrcode();

    // 3) Elegir cámara (trasera si existe)
    const devices = await Html5Qrcode.getCameras();
    if (!devices?.length) { $('#qr-result').textContent = 'No se encontró cámara.'; return; }
    const back = devices.find(d => /back|rear|environment|trasera|atrás/i.test(d.label)) || devices[0];

    const qrReader = new Html5Qrcode('qr-reader', {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
    });

    await qrReader.start(
      { deviceId: { exact: back.id } },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      // onSuccess
      async (decodedText) => {
        if (!decodedText.startsWith('UNIBUS|')) {
          $('#qr-result').innerHTML = '<span style="color:#f00">QR inválido</span>';
          return;
        }
        const id = decodedText.split('|')[1];
        $('#qr-result').textContent = 'Buscando reserva…';

        try {
          const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
          // OJO: desde /views/ la ruta correcta es ../firebase.js
          const { db } = await import('../firebase.js');
          const snap = await getDoc(doc(db, 'reservas', id));

          if (snap.exists()) {
            const r = snap.data();
            $('#qr-result').innerHTML = `
              <b>Reserva válida</b><br>
              Nombre: ${r.nombre}<br>
              Universidad: ${r.universidad}<br>
              Ruta: ${r.ruta || '—'}<br>
              Parada: ${r.parada || '—'}<br>
              Tipo: ${r.tipo}<br>
              Fecha: ${r.fecha}
            `;
            // Ejemplo opcional: marcar abordo/pagado aquí
            // import('../reservas.js').then(({ updateReserva }) => updateReserva(id, { abordo: true }));
          } else {
            $('#qr-result').innerHTML = '<span style="color:#f00">Reserva no encontrada</span>';
          }
        } catch (e) {
          $('#qr-result').innerHTML = '<span style="color:#f00">Error al buscar reserva</span>';
        } finally {
          try { await qrReader.stop(); await qrReader.clear(); } catch {}
        }
      }
    );

    // 4) Cerrar
    $('#btnCloseQR').onclick = async () => {
      $('#qrScanPanel').style.display = 'none';
      try { await qrReader.stop(); await qrReader.clear(); } catch {}
    };

  } catch (e) {
    $('#qr-result').textContent = mapErr(e);
  }
};


  const sab = sabadoVigente();
  if(typeof stop==='function') stop();
  stop = listenByJornada(sab, snap=>{
    rows = snap.docs.map(d=>({ _id:d.id, ...d.data() }));
    render();
  });

  $('#f_tipo').oninput = ()=>{ $('#f_hora').style.display = ($('#f_tipo').value==='solo_vuelta')?'block':'none'; render(); };
  $('#f_hora').oninput = render;
  $('#f_ruta').oninput = render;
  $('#f_q').oninput = render;
  $('#f_fecha').onchange = ()=>{ /* por simplicidad, fija sábado vigente */ render(); };
  $('#btnCSV').onclick = exportCSV;
  $('#btnWA').onclick  = sendWA;
}

function frows(){
  const f= $('#f_fecha').value, r=$('#f_ruta').value, t=$('#f_tipo').value, h=$('#f_hora').value, q=($('#f_q').value||'').toLowerCase().trim();
  return rows
    .filter(x=> !f || x.fecha===f)
    .filter(x=> !r || x.ruta===r || x.tipo==='solo_vuelta')
    .filter(x=> !t || x.tipo===t)
    .filter(x=> !(t==='solo_vuelta' && h) || x.horaVuelta===h)
    .filter(x=> !q || (x.nombre+x.universidad+(x.parada||'')).toLowerCase().includes(q));
}

function render(){
  const tabla=$('#tabla'); const list=frows().sort((a,b)=> (a.creadoEn?.seconds||0)-(b.creadoEn?.seconds||0));
  $('#totales').textContent=list.length;
  if(!list.length){ tabla.innerHTML = `<div class="empty">Sin resultados.</div>`; return; }
  let html = `<table class="rwd"><thead><tr>
    <th>#</th><th>Nombre</th><th>Univ.</th><th>Ruta</th><th>Parada</th><th>Tipo</th><th>Fecha</th><th>Precio</th><th>Teléfono</th><th>Comentario</th><th>Acciones</th>
  </tr></thead><tbody>`;
  list.forEach((r,i)=>{
    html += `<tr>
      <td data-label="#">${i+1}</td>
      <td data-label="Nombre">${esc(r.nombre)}</td>
      <td data-label="Univ.">${esc(r.universidad)}</td>
      <td data-label="Ruta">${r.ruta? `<span class="pill">${r.ruta} · ${esc(RUTAS[r.ruta]?.nombre||'')}</span>`:'-'}</td>
      <td data-label="Parada">${esc(r.parada||'-')}</td>
      <td data-label="Tipo">${esc(tipoTexto(r))}</td>
      <td data-label="Fecha">${r.fecha}</td>
      <td data-label="Precio">Q${(r.precio||0).toFixed(2)}</td>
      <td data-label="Teléfono">${esc(r.telefono||'')}</td>
      <td data-label="Comentario">${esc(r.comentario||'')}</td>
      <td data-label="Acciones">
        <button class="btn btn-secondary" data-act="edit" data-id="${r._id}">Editar</button>
        <button class="btn btn-danger" data-act="del" data-id="${r._id}">Eliminar</button>
      </td>
    </tr>`;
  });
  html += `</tbody></table>`;
  tabla.innerHTML = html;

  tabla.onclick = async (e)=>{
    const b = e.target.closest('button'); if(!b) return;
    const id = b.dataset.id, act=b.dataset.act;
    if(act==='del'){ if(confirm('¿Eliminar?')){ try{ await remove(id); }catch(e){toast('No se pudo eliminar')} } }
    if(act==='edit'){ editRow(id); }
  };
}

function editRow(id){
  const r = rows.find(x=>x._id===id); if(!r) return;
  const nombre = prompt('Nombre', r.nombre); if(nombre===null) return;
  try{ update(id, { nombre }); } catch{ toast('No se pudo actualizar'); }
}

function exportCSV(){
  const list=frows();
  if(!list.length) return toast('Sin datos');
  const head=['#','Nombre','Universidad','Ruta','Parada','Tipo','Fecha','Precio','Telefono','Comentario'];
  const lines=[head.join(',')];
  list.forEach((r,i)=>{
    const rutaTxt=r.ruta?`${r.ruta} ${RUTAS[r.ruta]?.nombre||''}`:'—';
    lines.push([i+1,r.nombre,r.universidad,rutaTxt,r.parada||'',tipoTexto(r),r.fecha,`Q${(r.precio||0).toFixed(2)}`,r.telefono||'',(r.comentario||'').replace(/[\r\n,]/g,' ')].map(csvVal).join(','));
  });
  const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=`unibus_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(a.href);
}

function sendWA(){
  const list=frows(); if(!list.length) return toast('Sin datos');
  const totalQ=list.reduce((a,r)=>a+(r.precio||0),0);
  let t=`*Lista UniBus*%0AFecha: ${sabadoVigente()}%0ATotal: Q${totalQ.toFixed(2)}%0A%0A`;
  list.forEach((x,i)=>{ t+=`${i+1}. ${encodeURIComponent(x.nombre)} — ${encodeURIComponent(tipoTexto(x))} — Q${(x.precio||0).toFixed(2)}%0A`; });
  window.open(`https://wa.me/?text=${t}`,'_blank');
}
