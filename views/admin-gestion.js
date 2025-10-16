import { $, esc, RUTAS, TIPO_LABEL, tipoTexto, sabadoVigente, csvVal, toast, PRECIO } from "../src/ui.js";
import { listenByJornada, update, remove, create, marcarAbordoIda, marcarAbordoRegreso } from "../src/reservas.js";
import { listenStudents } from "../src/students.js";
import { current } from "../src/auth.js";

let stop = null, rows = [];
let studentStop = null, students = [];

// ====== Beeps (WebAudio, sin tocar index.html) ======
function beep(freq = 880, dur = 120) {
  try {
    const A = new (window.AudioContext || window.webkitAudioContext)();
    const o = A.createOscillator(), g = A.createGain();
    o.type = "sine"; o.frequency.value = freq;
    o.connect(g); g.connect(A.destination);
    g.gain.setValueAtTime(0.0001, A.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, A.currentTime + 0.02);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, A.currentTime + dur/1000);
    o.stop(A.currentTime + dur/1000 + 0.05);
  } catch {}
}
const playOk = () => beep(880, 120);
const playErr = () => beep(220, 180);

// ====== Cola offline ======
const QKEY = "unibus_queue";
function qRead(){ try{ return JSON.parse(localStorage.getItem(QKEY)||"[]"); }catch{ return []; } }
function qWrite(arr){ localStorage.setItem(QKEY, JSON.stringify(arr)); }
async function qFlush(){
  const q = qRead(); if(!q.length) return;
  const adminEmail = current()?.email || null;
  const remaining = [];
  for(const it of q){
    try{
      if(it.tipo === "ida")   await marcarAbordoIda(it.id, adminEmail);
      if(it.tipo === "r1600") await marcarAbordoRegreso(it.id, "1600", adminEmail);
      if(it.tipo === "r1730") await marcarAbordoRegreso(it.id, "1730", adminEmail);
    }catch{ remaining.push(it); }
  }
  qWrite(remaining);
  if(!remaining.length) toast("Sincronización completada");
}
window.addEventListener("online", qFlush);

export function AdminGestionView(){
  $('#app').innerHTML = `
  <section class="card">
    <h2>Filtros & Acciones</h2>
    <div class="grid">
      <div class="grid-2">
        <div><label>Fecha</label><input type="date" id="f_fecha" value="${sabadoVigente()}"></div>
        <div>
          <label>Ruta</label>
          <select id="f_ruta">
            <option value="">Todas</option>
            <option value="A">Bus A</option>
            <option value="B">Bus B</option>
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div>
          <label>Tipo de viaje</label>
          <select id="f_tipo">
            <option value="">Todos</option>
            <option value="ida_vuelta_1600">${TIPO_LABEL?.ida_vuelta_1600 || 'Ida y vuelta 4:00 pm'}</option>
            <option value="ida_vuelta_1730">${TIPO_LABEL?.ida_vuelta_1730 || 'Ida y vuelta 5:30 pm'}</option>
            <option value="solo_ida">${TIPO_LABEL?.solo_ida || 'Solo ida'}</option>
            <option value="solo_vuelta">${TIPO_LABEL?.solo_vuelta || 'Solo vuelta'}</option>
          </select>
          <select id="f_hora" style="display:none;margin-top:8px">
            <option value="">— Hora —</option>
            <option value="1600">4:00 pm</option>
            <option value="1730">5:30 pm</option>
          </select>
        </div>
        <div><label>Buscar</label><input id="f_q" placeholder="Nombre/Univ/Parada…"></div>
      </div>
      <div class="row">
  <button class="btn btn-secondary" id="btnXLSX">Exportar Excel</button>
        <button class="btn btn-secondary" id="btnWA">WhatsApp (lista)</button>
        <button class="btn btn-secondary" id="btnRoster">Roster estudiantes</button>
        <button class="btn btn-primary" id="btnScanQR">Escanear QR</button>
        <span class="right muted">Total: <b id="totales">0</b></span>
      </div>
      <div id="stats" class="stats"></div>
    </div>

    <div id="qrScanPanel" style="display:none;margin-top:18px">
      <h3>Escanear QR de reserva</h3>
      <div id="qr-reader" style="width:320px;margin:auto;"></div>
      <div id="qr-result" style="margin-top:10px"></div>
      <button class="btn btn-secondary" id="btnCloseQR">Cerrar escáner</button>
      <div id="manualPanel" class="muted" style="margin-top:12px">También puedes validar desde la lista (botones en cada fila).</div>
    </div>
  </section>

  <section class="card">
    <h2>Lista de pasajeros</h2>
    <div id="tabla"></div>
  </section>`;

  // ========= Escaneo QR =========
  $('#btnScanQR').onclick = async () => {
    $('#qrScanPanel').style.display = 'block';
    // asegurar que el panel esté visible en pantalla (móviles)
    setTimeout(()=>{ document.getElementById('qrScanPanel').scrollIntoView({behavior:'smooth', block:'center'}); }, 80);
    $('#qr-result').textContent = 'Inicializando cámara…';

    if (!window.Html5Qrcode) {
      $('#qr-result').textContent = 'Falta la librería QR (html5-qrcode).';
      return;
    }

    function mapErr(e){
      const m = (e && e.message) ? e.message : String(e || '');
      if (location.protocol !== 'https:' && location.hostname !== 'localhost')
        return 'Abre el sitio en HTTPS o en http://localhost para usar la cámara.';
      if (/Permission|NotAllowedError/i.test(m)) return 'Permiso de cámara denegado.';
      if (/NotFoundError|no camera|no cameras/i.test(m)) return 'No hay cámaras disponibles.';
      if (/InUse|NotReadable|TrackStart/i.test(m)) return 'La cámara está en uso por otra app.';
      return 'No se pudo iniciar la cámara: ' + m;
    }

    let qrReader = null;

    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices?.length) { $('#qr-result').textContent = 'No se encontró cámara.'; return; }
      const back = devices.find(d => /back|rear|environment|trasera|atrás/i.test(d.label)) || devices[0];

      qrReader = new Html5Qrcode('qr-reader', { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] });

      let scanLock = false;
      const onSuccess = async (decodedText) => {
        if(scanLock) return; // evitar multi-callbacks rápidos
        scanLock = true;
        $('#qr-result').textContent = 'Escaneado: ' + decodedText;
        // mostrar el resultado brevemente para que el admin vea lo que pasó
        setTimeout(async ()=>{
          if (!decodedText.startsWith('UNIBUS|')) {
            playErr();
            $('#qr-result').innerHTML = '<span style="color:#f00">QR inválido</span>';
            scanLock = false; return;
          }
          const id = decodedText.split('|')[1];
          $('#qr-result').textContent = 'Buscando reserva…';
          try {
            const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
            const { db } = await import('../src/firebase.js');
            const snap = await getDoc(doc(db, 'reservas', id));
            if (!snap.exists()) {
              playErr();
              $('#qr-result').innerHTML = '<span style="color:#f00">Reserva no encontrada</span>';
              scanLock = false; return;
            }
            const r = snap.data();
            await renderReservaParaValidar(snap.id, r, '#qr-result');
            playOk();
          } catch (e) {
            console.error(e);
            playErr();
            $('#qr-result').innerHTML = '<span style="color:#f00">Error al buscar reserva</span>';
          } finally {
            try { await qrReader.stop(); await qrReader.clear(); } catch {}
            scanLock = false;
          }
        }, 700); // pausa breve para que el admin vea el contenido del QR antes de procesar
      };

      await qrReader.start(
        { deviceId: { exact: back.id } },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onSuccess
      );

      $('#btnCloseQR').onclick = async () => {
        $('#qrScanPanel').style.display = 'none';
        try { await qrReader.stop(); await qrReader.clear(); } catch {}
      };

    } catch (e) {
      console.error(e);
      $('#qr-result').textContent = mapErr(e);
    }
  };

  // ========= Datos & tabla =========
  // usar las variables `stop` y `rows` definidas en el scope superior

  function cargarPorFecha(fecha) {
    if (typeof stop === 'function') stop();
    stop = listenByJornada(fecha, snap => {
      rows = (snap?.docs || []).map(d => ({ _id: d.id, ...d.data?.() }));
      render();
      if (typeof qFlush === 'function') qFlush();
    });
  }

  // Inicial carga con el sábado vigente
  cargarPorFecha($('#f_fecha').value);

  // Actualizar al cambiar la fecha
  $('#f_fecha').onchange = () => {
    const f = $('#f_fecha').value;
    cargarPorFecha(f);
    // si el roster está activo, volver a renderizar con la nueva jornada
    if(studentStop) startStudentRoster(f);
  };

  $('#f_tipo').oninput   = ()=>{ $('#f_hora').style.display = ($('#f_tipo').value==='solo_vuelta') ? 'block' : 'none'; render(); };
  $('#f_hora').oninput   = render;
  $('#f_ruta').oninput   = render;
  $('#f_q').oninput      = render;
  $('#btnXLSX').onclick   = exportXLSX;
  // Ocultamos la opción WhatsApp porque no se usará/permitirá mejoras ahora
  try{ $('#btnWA').style.display = 'none'; }catch(e){}
  // Roster button
  $('#btnRoster').onclick = ()=>{
    const f = $('#f_fecha').value || sabadoVigente();
    startStudentRoster(f);
  };
}

// ------- UI de detalle (para QR) -------
async function renderReservaParaValidar(id, r, targetSel){
  const a = r.abordos || {};
  const idaDone = !!a.idaAt;
  const r16Done = !!a.regreso_1600At;
  const r17Done = !!a.regreso_1730At;

  const tipo = r.tipo;
  const horaVuelta = r.horaVuelta || '';
  const puedeIda = (tipo === 'solo_ida' || tipo.startsWith('ida_vuelta'));
  const puedeR16 = (tipo === 'solo_vuelta' && horaVuelta==='1600') || (tipo === 'ida_vuelta_1600');
  const puedeR17 = (tipo === 'solo_vuelta' && horaVuelta==='1730') || (tipo === 'ida_vuelta_1730');

  const pill = (ok, label) => ok ? `<span class="pill pill-ok">${label} ✓</span>` : `<span class="pill pill-pend">${label}</span>`;

  $(targetSel).innerHTML = `
    <div class="qr-card">
      <div class="qr-top">
        <div>
          <b>Reserva válida</b><br>
          Nombre: ${esc(r.nombre)}<br>
          Univ.: ${esc(r.universidad)}<br>
          Tipo: ${esc(tipoTexto(r))}
        </div>
        <div class="qr-badges">
          ${pill(idaDone,'Ida')}
          ${pill(r16Done,'Regreso 4:00')}
          ${pill(r17Done,'Regreso 5:30')}
        </div>
      </div>
      <div class="qr-actions">
        ${puedeIda ? `<button class="btn btn-primary" id="btnRegIda" ${idaDone?'disabled':''}>Registrar Ida</button>`:''}
        ${puedeR16 ? `<button class="btn btn-primary" id="btnReg1600" ${r16Done?'disabled':''}>Registrar Regreso 4:00</button>`:''}
        ${puedeR17 ? `<button class="btn btn-primary" id="btnReg1730" ${r17Done?'disabled':''}>Registrar Regreso 5:30</button>`:''}
      </div>
      <div class="muted" style="margin-top:8px">Fecha: ${esc(r.fecha)} ${r.ruta ? `· Ruta ${esc(r.ruta)} (${esc(RUTAS[r.ruta]?.nombre||'')})` : ''}</div>
    </div>
  `;

  const adminEmail = current()?.email || null;
  const rid = id;
  const disable = (bId)=>{ const b=document.getElementById(bId); if(b){ b.disabled=true; b.textContent='Registrado ✓'; } };

  const tryIda   = async ()=>{ try{ await marcarAbordoIda(rid, adminEmail); playOk(); toast('Ida registrada'); disable('btnRegIda'); }catch{ const q=qRead(); q.push({id:rid,tipo:'ida',ts:Date.now()}); qWrite(q); playOk(); toast('Ida registrada (offline)'); disable('btnRegIda'); } };
  const tryR16   = async ()=>{ try{ await marcarAbordoRegreso(rid,'1600',adminEmail); playOk(); toast('Regreso 4:00 registrado'); disable('btnReg1600'); }catch{ const q=qRead(); q.push({id:rid,tipo:'r1600',ts:Date.now()}); qWrite(q); playOk(); toast('Regreso 4:00 (offline)'); disable('btnReg1600'); } };
  const tryR17   = async ()=>{ try{ await marcarAbordoRegreso(rid,'1730',adminEmail); playOk(); toast('Regreso 5:30 registrado'); disable('btnReg1730'); }catch{ const q=qRead(); q.push({id:rid,tipo:'r1730',ts:Date.now()}); qWrite(q); playOk(); toast('Regreso 5:30 (offline)'); disable('btnReg1730'); } };

  if (puedeIda && !idaDone) $('#btnRegIda')?.addEventListener('click', tryIda);
  if (puedeR16 && !r16Done) $('#btnReg1600')?.addEventListener('click', tryR16);
  if (puedeR17 && !r17Done) $('#btnReg1730')?.addEventListener('click', tryR17);
}

// ------- Filtros, contadores y tabla -------
function frows(){
  const f = $('#f_fecha').value, r = $('#f_ruta').value, t = $('#f_tipo').value, h = $('#f_hora').value, q = ($('#f_q').value||'').toLowerCase().trim();
  return rows
    .filter(x=> !f || x.fecha===f)
    .filter(x=> !r || x.ruta===r || x.tipo==='solo_vuelta')
    .filter(x=> !t || x.tipo===t)
    .filter(x=> !(t==='solo_vuelta' && h) || x.horaVuelta===h)
    .filter(x=> !q || (String(x.nombre||'')+String(x.universidad||'')+String(x.parada||'')).toLowerCase().includes(q));
}

function stats(list){
  let idaT=0, idaD=0, r16T=0, r16D=0, r17T=0, r17D=0;
  list.forEach(r=>{
    const a = r.abordos||{};
    if (r.tipo==='solo_ida' || r.tipo?.startsWith('ida_vuelta')) { idaT++; if(a.idaAt) idaD++; }
    if ((r.tipo==='solo_vuelta' && r.horaVuelta==='1600') || r.tipo==='ida_vuelta_1600') { r16T++; if(a.regreso_1600At) r16D++; }
    if ((r.tipo==='solo_vuelta' && r.horaVuelta==='1730') || r.tipo==='ida_vuelta_1730') { r17T++; if(a.regreso_1730At) r17D++; }
  });
  return { idaT, idaD, r16T, r16D, r17T, r17D };
}

function renderStats(s){
  $('#stats').innerHTML = `
    <div class="stat-pill">Ida: <b>${s.idaD}</b>/<span>${s.idaT}</span></div>
    <div class="stat-pill">Regreso 4:00: <b>${s.r16D}</b>/<span>${s.r16T}</span></div>
    <div class="stat-pill">Regreso 5:30: <b>${s.r17D}</b>/<span>${s.r17T}</span></div>
  `;
}

function render(){
  const tabla = $('#tabla');
  const list = frows().sort((a,b)=> (a?.creadoEn?.seconds||0)-(b?.creadoEn?.seconds||0));
  $('#totales').textContent = list.length;
  renderStats(stats(list));

  if(!list.length){ tabla.innerHTML = `<div class="empty">Sin resultados.</div>`; return; }

  let html = `<table class="rwd"><thead><tr>
    <th>#</th><th>Nombre</th><th>Univ.</th><th>Ruta</th><th>Parada</th><th>Tipo</th><th>Fecha</th><th>Estado</th><th>Precio</th><th>Teléfono</th><th>Comentario</th><th>Acciones</th>
  </tr></thead><tbody>`;

  list.forEach((r,i)=>{
    const a = r.abordos||{};
    const idaOk = !!a.idaAt, r16Ok = !!a.regreso_1600At, r17Ok = !!a.regreso_1730At;
    const puedeIda = (r.tipo==='solo_ida'||r.tipo?.startsWith('ida_vuelta'));
    const puedeR16 = (r.tipo==='solo_vuelta'&&r.horaVuelta==='1600')||r.tipo==='ida_vuelta_1600';
    const puedeR17 = (r.tipo==='solo_vuelta'&&r.horaVuelta==='1730')||r.tipo==='ida_vuelta_1730';

    const pill = (ok, label) => ok ? `<span class="pill pill-ok">${label} ✓</span>` : `<span class="pill pill-pend">${label}</span>`;

    // Acciones de validación desde la lista (responsive wrapper)
    let actsInner = `
      <button class="btn btn-secondary" data-act="edit" data-id="${r._id}">Editar</button>
      <button class="btn btn-danger" data-act="del" data-id="${r._id}">Eliminar</button>
    `;
    if (puedeIda) actsInner += ` <button class="btn btn-primary btn-sm" data-act="v_ida" data-id="${r._id}" ${idaOk?'disabled':''}>Validar Ida</button>`;
    if (puedeR16) actsInner += ` <button class="btn btn-primary btn-sm" data-act="v_r1600" data-id="${r._id}" ${r16Ok?'disabled':''}>Regreso 4:00</button>`;
    if (puedeR17) actsInner += ` <button class="btn btn-primary btn-sm" data-act="v_r1730" data-id="${r._id}" ${r17Ok?'disabled':''}>Regreso 5:30</button>`;

    // Vender regreso rápido: SOLO si es solo_ida (ya no mostramos para ida_vuelta ni solo_vuelta)
    if (r.tipo === 'solo_ida') {
      actsInner += ` <button class="btn btn-secondary btn-sm" data-act="sell_return" data-id="${r._id}">Vender regreso</button>`;
    }

    const acts = `<div class="row-actions">${actsInner}</div>`;

    html += `<tr>
      <td data-label="#">${i+1}</td>
      <td data-label="Nombre">${esc(r.nombre)}</td>
      <td data-label="Univ.">${esc(r.universidad)}</td>
      <td data-label="Ruta">${r.ruta? `<span class="pill">${r.ruta} · ${esc(RUTAS[r.ruta]?.nombre||'')}</span>`:'-'}</td>
      <td data-label="Parada">${esc(r.parada||'-')}</td>
      <td data-label="Tipo">${esc(tipoTexto(r))}</td>
      <td data-label="Fecha">${esc(r.fecha)}</td>
      <td data-label="Estado">${[pill(idaOk,'Ida'), pill(r16Ok,'R 4:00'), pill(r17Ok,'R 5:30')].join(' ')}</td>
      <td data-label="Precio">Q${Number(r.precio||0).toFixed(2)}</td>
      <td data-label="Teléfono">${esc(r.telefono||'')}</td>
      <td data-label="Comentario">${esc(r.comentario||'')}</td>
      <td data-label="Acciones">${acts}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  tabla.innerHTML = html;

  // Delegación de eventos acciones de fila
  tabla.onclick = async (e)=>{
    const b = e.target.closest('button'); if(!b) return;
    const id = b.dataset.id, act = b.dataset.act;
    const row = rows.find(x=>x._id===id);
    if(!row) return;

    if (act==='del') {
      if(confirm('¿Eliminar?')){ try{ await remove(id); }catch{ toast('No se pudo eliminar'); } }
      return;
    }
    if (act==='edit'){
      const nombre = prompt('Nombre', row.nombre); if(nombre===null) return;
      try{ await update(id, { nombre }); }catch{ toast('No se pudo actualizar'); }
      return;
    }

    const adminEmail = current()?.email || null;

    if (act==='v_ida'){
      try{
        await marcarAbordoIda(id, adminEmail);
        playOk();
        b.disabled=true; b.textContent='Registrado ✓';
        // actualizar localmente para reflejar el cambio en los contadores
        const rr = rows.find(x=>x._id===id); if(rr){ rr.abordos = rr.abordos || {}; rr.abordos.idaAt = rr.abordos.idaAt || true; }
        render();
      }
      catch{
        const q=qRead(); q.push({id, tipo:'ida', ts:Date.now()}); qWrite(q);
        playOk(); b.disabled=true; b.textContent='Pendiente ✓';
        const rr = rows.find(x=>x._id===id); if(rr){ rr.abordos = rr.abordos || {}; rr.abordos.idaAt = rr.abordos.idaAt || true; }
        render();
      }
      return;
    }
    if (act==='v_r1600'){
      try{
        await marcarAbordoRegreso(id, '1600', adminEmail);
        playOk(); b.disabled=true; b.textContent='Registrado ✓';
        const rr = rows.find(x=>x._id===id); if(rr){ rr.abordos = rr.abordos || {}; rr.abordos.regreso_1600At = rr.abordos.regreso_1600At || true; }
        render();
      }
      catch{ const q=qRead(); q.push({id, tipo:'r1600', ts:Date.now()}); qWrite(q); playOk(); b.disabled=true; b.textContent='Pendiente ✓'; const rr = rows.find(x=>x._id===id); if(rr){ rr.abordos = rr.abordos || {}; rr.abordos.regreso_1600At = rr.abordos.regreso_1600At || true; } render(); }
      return;
    }
    if (act==='v_r1730'){
      try{
        await marcarAbordoRegreso(id, '1730', adminEmail);
        playOk(); b.disabled=true; b.textContent='Registrado ✓';
        const rr = rows.find(x=>x._id===id); if(rr){ rr.abordos = rr.abordos || {}; rr.abordos.regreso_1730At = rr.abordos.regreso_1730At || true; }
        render();
      }
      catch{ const q=qRead(); q.push({id, tipo:'r1730', ts:Date.now()}); qWrite(q); playOk(); b.disabled=true; b.textContent='Pendiente ✓'; const rr = rows.find(x=>x._id===id); if(rr){ rr.abordos = rr.abordos || {}; rr.abordos.regreso_1730At = rr.abordos.regreso_1730At || true; } render(); }
      return;
    }

    if (act==='sell_return'){
      // Vender regreso rápido (solo_ida)
      const hora = prompt('Hora de regreso (1600 o 1730)', '1600');
      if(hora!=='1600' && hora!=='1730') return toast('Hora inválida');
      const precioStr = prompt('Precio (Q)', (row.precio||0).toFixed(2));
      const precio = Number(precioStr||0);
      const payload = {
        nombre: row.nombre,
        universidad: row.universidad,
        ruta: row.ruta,
        parada: row.parada,
        telefono: row.telefono,
        comentario: (row.comentario||'') + ' · regreso rápido',
        tipo: 'solo_vuelta',
        horaVuelta: hora,
        fecha: row.fecha,
        jornadaId: row.jornadaId,
        precio,
        pagado: false
      };
      try{
        await create(payload);
        toast('Regreso vendido');
      }catch{
        toast('No se pudo vender regreso');
      }
    }
  };
}

// ------- Export CSV / WhatsApp -------
function exportCSV(){
  const list = frows();
  if(!list.length) return toast('Sin datos');

  // utilidades
  const stripHtml = s => (s||'').toString().replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
  const fmt = v => (v===undefined||v===null)?'':String(v);

  const head = ['#','Nombre','Universidad','Ruta','Parada','Tipo','Fecha','Estado_Ida','Estado_R1600','Estado_R1730','Precio','Telefono','Comentario'];
  const rowsOut = [];
  // agregar encabezado escapado
  rowsOut.push(head.map(csvVal).join(','));

  let totalPrecio = 0;
  let totalPagado = 0;

  list.forEach((r,i)=>{
    const a = r.abordos||{};
    const rutaTxt = r.ruta ? `${r.ruta} ${stripHtml(RUTAS[r.ruta]?.nombre||'')}` : '—';
    const sIda = a.idaAt ? 'OK' : 'Pend';
    const s16 = a.regreso_1600At ? 'OK' : 'Pend';
    const s17 = a.regreso_1730At ? 'OK' : 'Pend';
    const precio = Number(r.precio||0);
    totalPrecio += precio;
    if (r.pagado) totalPagado += precio;

    const cols = [
      i+1,
      stripHtml(fmt(r.nombre)),
      stripHtml(fmt(r.universidad)),
      stripHtml(rutaTxt),
      stripHtml(fmt(r.parada||'')),
      stripHtml(fmt(tipoTexto(r))),
      stripHtml(fmt(r.fecha)),
      sIda, s16, s17,
      precio.toFixed(2),
      stripHtml(fmt(r.telefono||'')),
      stripHtml(fmt(r.comentario||''))
    ];
    rowsOut.push(cols.map(csvVal).join(','));
  });

  // totales al final
  rowsOut.push('');
  rowsOut.push([ '','', '', '', '', '', '','Total Pagado:', '', '', totalPagado.toFixed(2), '', '' ].map(csvVal).join(','));
  rowsOut.push([ '','', '', '', '', '', '','Total (todos):', '', '', totalPrecio.toFixed(2), '', '' ].map(csvVal).join(','));

  // CSV con BOM y CRLF para abrir bien en Excel
  const csvContent = '\uFEFF' + rowsOut.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const fecha = $('#f_fecha').value || new Date().toISOString().slice(0,10);
  a.download = `unibus_${fecha}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportXLSX(){
  const list = frows(); if(!list.length) return toast('Sin datos');

  // cargar SheetJS si es necesario
  if(!window.XLSX){
    await new Promise((resolve,reject)=>{
      const s = document.createElement('script');
      s.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
      s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    }).catch(e=>{ console.error('No se pudo cargar xlsx:',e); toast('Error cargando librería XLSX'); });
  }

  // Roster: renderiza estudiantes y permite crear/actualizar reservas desde la lista
  function renderRoster(jornadaId){
    const $root = $('#tabla');
    if(!students || !students.length){ $root.innerHTML = `<div class="muted">No hay estudiantes registrados.</div>`; return; }

    const reservasByStudent = (rows||[]).reduce((acc,r)=>{ if(r.studentId) acc[r.studentId]=r; return acc; },{});

    const list = students.map(s=>{
      const ex = reservasByStudent[s.id] || {};
      const pag = !!ex.pagado;
      const ida = !!(ex.abordos && ex.abordos.idaAt);
      const regreso = !!(ex.abordos && (ex.abordos.regreso_1600At || ex.abordos.regreso_1730At));
      const bus = ex.bus || '';
      const precio = ex.precio != null ? ex.precio : (PRECIO || 0);
      return `
        <div class="row card-row">
          <div class="col">
            <strong>${esc(s.nombre)}</strong><br>
            <small class="muted">${esc(s.universidad||'')} • ${esc(s.horario||'')} • ${esc(s.telefono||'')}</small>
          </div>
          <div class="col cols-4">
            <label><input type="checkbox" data-student="${s.id}" data-action="ida" ${ida? 'checked':''}> Ida</label>
            <label><input type="checkbox" data-student="${s.id}" data-action="regreso" ${regreso? 'checked':''}> Regreso</label>
            <label><input type="checkbox" data-student="${s.id}" data-action="pagado" ${pag? 'checked':''}> Pagado</label>
            <input class="input" type="text" placeholder="Bus" data-student="${s.id}" data-action="bus" value="${esc(bus)}">
            <input class="input small" type="number" min="0" data-student="${s.id}" data-action="precio" value="${precio}">
            <button class="btn btn-sm btn-primary" data-student="${s.id}" data-action="save">Guardar</button>
          </div>
        </div>`;
    }).join('\n');

    $root.innerHTML = list;

    // Delegación para controles del roster
    $root.onclick = async (ev)=>{
      const b = ev.target.closest('button');
      if(b && b.dataset.action==='save'){
        const sid = b.dataset.student;
        // recoger valores del row
        const checkPag = $root.querySelector(`input[data-student="${sid}"][data-action="pagado"]`);
        const checkIda = $root.querySelector(`input[data-student="${sid}"][data-action="ida"]`);
        const checkReg = $root.querySelector(`input[data-student="${sid}"][data-action="regreso"]`);
        const inBus = $root.querySelector(`input[data-student="${sid}"][data-action="bus"]`);
        const inPrecio = $root.querySelector(`input[data-student="${sid}"][data-action="precio"]`);

        const payload = {
          pagado: !!(checkPag && checkPag.checked),
          precio: Number(inPrecio?.value||0),
          bus: inBus?.value||''
        };

        // si existe reserva para este student en la jornada, actualizar; si no, crear
        const existing = (rows||[]).find(r=>r.studentId===sid && r.jornadaId===( $('#f_fecha').value || sabadoVigente() ));
        try{
          if(existing){
            await update(existing._id, payload);
            toast('Reserva actualizada');
          } else {
            // crear reserva mínima
            const student = students.find(s=>s.id===sid) || {};
            const createPayload = {
              nombre: student.nombre||'', universidad: student.universidad||'', telefono: student.telefono||'', ruta: '', parada: '',
              tipo: 'solo_ida', fecha: ($('#f_fecha').value || sabadoVigente()), jornadaId: ($('#f_fecha').value || sabadoVigente()), precio: payload.precio, pagado: payload.pagado, bus: payload.bus, studentId: sid
            };
            await create(createPayload);
            toast('Reserva creada');
          }
          // refrescar
          cargarPorFecha($('#f_fecha').value);
        }catch(e){ console.error(e); toast('Error guardando'); }
      }
    };
  }

  function startStudentRoster(jornadaId){
    if(typeof studentStop==='function') studentStop();
    studentStop = listenStudents(snap=>{
      try{ console.debug('startStudentRoster: snapshot size', snap.size); }catch(e){}
      students = (snap.docs||[]).map(d=> ({ id: d.id, ...d.data() }));
      if(!students.length) { console.debug('startStudentRoster: no students'); }
      renderRoster(jornadaId);
    }, err=>{
      console.error('students listen error', err);
      toast('Error leyendo estudiantes');
      // UI: mostrar botón para cargar ejemplo local en la tabla
      const $root = $('#tabla');
      if($root){
        $root.innerHTML = `<div class="card"><div style="color:#900">Permisos insuficientes para leer 'students'.</div><div style="margin-top:8px"><button id="btnLoadExampleRoster" class="btn btn-secondary">Cargar ejemplo local</button></div></div>`;
        document.getElementById('btnLoadExampleRoster').onclick = ()=>{
          students = [ { id:'ex-1', nombre:'Alumno Ejemplo 1', universidad:'UMG Zacapa', horario:'16:00', telefono:'+502 5000 0001', preferredBus:'A' }, { id:'ex-2', nombre:'Alumno Ejemplo 2', universidad:'USAC Zacapa', horario:'18:00', telefono:'+502 5000 0002', preferredBus:'B' } ];
          renderRoster(jornadaId);
          toast('Datos de ejemplo cargados (local)');
        };
      }
    });
  }
  const stripHtml = s => (s||'').toString().replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
  const fmt = v => (v===undefined||v===null)?'':String(v);

  // construir datos para hoja "Reservas" (omitimos Fecha, Comentario y columnas de Estado)
  const data = list.map((r,i)=>({
    '#': i+1,
    Nombre: stripHtml(fmt(r.nombre)),
    Universidad: stripHtml(fmt(r.universidad)),
    Ruta: r.ruta ? `${r.ruta} — ${stripHtml(RUTAS[r.ruta]?.nombre||'')}` : '—',
    Parada: stripHtml(fmt(r.parada||'')),
    Tipo: stripHtml(fmt(tipoTexto(r))),
    Precio: Number(r.precio||0),
    Telefono: stripHtml(fmt(r.telefono||'')),
    Pagado: !!r.pagado
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data, {header: ['#','Nombre','Universidad','Ruta','Parada','Tipo','Precio','Telefono','Pagado']});

  // Estilos para encabezado
  const headerRange = XLSX.utils.decode_range(ws['!ref']);
  for(let C = headerRange.s.c; C <= headerRange.e.c; ++C){
    const cellAddress = XLSX.utils.encode_cell({r:0,c:C});
    if(!ws[cellAddress]) continue;
    ws[cellAddress].s = ws[cellAddress].s || {};
    ws[cellAddress].s.font = { bold: true, color: { rgb: 'FFFFFFFF' }, sz: 11 };
    ws[cellAddress].s.fill = { fgColor: { rgb: '263248' } };
    ws[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
  }

  // Anchos de columna más adecuados
  ws['!cols'] = [ {wpx:30}, {wpx:220}, {wpx:180}, {wpx:220}, {wpx:140}, {wpx:140}, {wpx:80}, {wpx:120}, {wpx:60} ];

  // Formato numérico para precio y boolean para pagado
  const rng = XLSX.utils.decode_range(ws['!ref']);
  for(let R = 1; R <= rng.e.r; ++R){
    const priceCell = XLSX.utils.encode_cell({r:R, c:6}); // Precio
    if(ws[priceCell]){ ws[priceCell].t = 'n'; ws[priceCell].z = '0.00'; }
    const pagCell = XLSX.utils.encode_cell({r:R, c:8}); if(ws[pagCell]){ ws[pagCell].t = 'b'; }
  }

  // Hoja de cierre: resumen formal
  const totalCount = list.length;
  const totalPrecio = list.reduce((a,r)=>a+(Number(r.precio||0)),0);
  const totalPagado = list.reduce((a,r)=>a + ((r.pagado)?Number(r.precio||0):0),0);
  const paidCount = list.filter(r=>r.pagado).length;
  const pendingCount = totalCount - paidCount;

  const cierre = [
    ['Cierre de caja'],
    ['Fecha', $('#f_fecha').value || new Date().toISOString().slice(0,10)],
    [],
    ['Total registros', totalCount],
    ['Total pagado (Q)', totalPagado.toFixed(2)],
    ['Total pendiente (Q)', (totalPrecio - totalPagado).toFixed(2)],
    ['Total recaudado (Q)', totalPagado.toFixed(2)],
    [],
    ['Pagados', paidCount],
    ['Pendientes', pendingCount]
  ];
  const wsC = XLSX.utils.aoa_to_sheet(cierre);
  // merge A1 across columns for title
  wsC['!merges'] = [{s:{r:0,c:0}, e:{r:0,c:3}}];
  // style title
  if(wsC['A1']) wsC['A1'].s = { font:{ sz:14, bold:true, color:{rgb:'FFFFFFFF'} }, fill:{ fgColor:{rgb:'1f4b6e'} }, alignment:{ horizontal:'center', vertical:'center' } };
  // style labels
  for(let r=3;r<=6;r++){ const cell = XLSX.utils.encode_cell({r:r,c:0}); if(wsC[cell]) wsC[cell].s = { font:{ bold:true } }; }
  wsC['!cols'] = [{wpx:160},{wpx:120},{wpx:60},{wpx:60}];

  XLSX.utils.book_append_sheet(wb, ws, 'Reservas');
  XLSX.utils.book_append_sheet(wb, wsC, 'Cierre de caja');

  const fecha = $('#f_fecha').value || new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `unibus_${fecha}.xlsx`);
}

function sendWA(){
  const list=frows(); if(!list.length) return toast('Sin datos');
  const totalQ=list.reduce((a,r)=>a+(Number(r.precio)||0),0);
  let t=`*Lista UniBus*%0AFecha: ${sabadoVigente()}%0ATotal: Q${totalQ.toFixed(2)}%0A%0A`;
  list.forEach((x,i)=>{ t+=`${i+1}. ${encodeURIComponent(x.nombre||'')} — ${encodeURIComponent(tipoTexto(x))} — Q${Number(x.precio||0).toFixed(2)}%0A`; });
  window.open(`https://wa.me/?text=${t}`,'_blank');
}
