import { $, CAPACIDAD, sabadoVigente } from "./ui.js";
import { addRoute, start, goto } from "./router.js";
import { HomeView } from "../views/home.js";
import { StudentView } from "../views/student.js";
import { AdminCobrosView } from "../views/admin-cobros.js";
import { AdminGestionView } from "../views/admin-gestion.js";
import { login, logout, watchAuth, current } from "./auth.js";



$('#capacidadLbl').textContent = CAPACIDAD;
$('#chipSabado').textContent = `Sábado: ${sabadoVigente()}`;

// Evitar zoom por pinch/double-tap en móviles para mantener layout estable
try{
  document.body.classList.add('no-zoom','prevent-pinch');
  let lastTouch = 0;
  document.addEventListener('touchstart', function(e){
    if (e.touches.length > 1) e.preventDefault();
    const t = Date.now(); if (t - lastTouch <= 300) e.preventDefault(); lastTouch = t;
  }, { passive: false });
  document.addEventListener('gesturestart', function(e){ e.preventDefault(); });
}catch(e){}

const nav = $('#nav');
function paintNav(){
  const user = current();
  nav.innerHTML = user ? `
    <a href="#/admin/cobros">Cobros</a>
    <a href="#/admin/gestion">Gestión</a>
    <a href="#/student">Estudiante</a>
    <a href="#/" id="btnLogout">Salir (${user.email})</a>
  ` : `
    <a href="#/">Inicio</a>
    <a href="#/student">Estudiante</a>
    <a href="#/admin">Admin</a>
  `;
  const btnOut = $('#btnLogout'); if(btnOut) btnOut.onclick = async e => { e.preventDefault(); await logout(); goto('/'); };
}
watchAuth(()=>{ paintNav(); });

/* Rutas */
addRoute('/', HomeView);
addRoute('/student', StudentView);
addRoute('/admin', ()=>{  // login simple
  $('#app').innerHTML = `
    <section class="card">
      <h2>Ingreso admin</h2>
      <div class="grid-2">
        <div><label>Email</label><input id="email" placeholder="admin@dominio.com"></div>
        <div><label>Contraseña</label><input id="pass" type="password" placeholder="********"></div>
      </div>
      <div class="row"><button class="btn btn-secondary" id="btnIn">Iniciar sesión</button></div>
    </section>`;
  $('#btnIn').onclick = async ()=>{
    const email=$('#email').value.trim(), pass=$('#pass').value.trim();
    try{ await login(email, pass); goto('/admin/cobros'); }catch{ alert('No se pudo iniciar sesión'); }
  };
});
addRoute('/admin/cobros', AdminCobrosView);
addRoute('/admin/gestion', AdminGestionView);

start();
