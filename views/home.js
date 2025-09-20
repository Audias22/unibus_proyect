import { $, CAPACIDAD, sabadoVigente } from "../src/ui.js";
import { goto } from "../src/router.js";

export function HomeView(){
  $('#app').innerHTML = `
    <section class="card">
      <div class="row"><h2 style="margin:0">¿Cómo quieres entrar?</h2></div>
      <div class="grid">
        <div class="card">
          <h3>Estudiante</h3>
          <p>Registra tu lugar para el sábado ${sabadoVigente()}. Capacidad por bus: <b>${CAPACIDAD}</b>.</p>
          <button class="btn btn-primary stretch" id="goStudent">Reservar asiento</button>
        </div>
        <div class="card">
          <h3>Admin / Dueño</h3>
          <p>Inicia sesión para ver la lista, marcar pagos y gestionar reservas.</p>
          <button class="btn btn-secondary stretch" id="goAdmin">Ir al panel</button>
        </div>
      </div>
    </section>`;
  $('#goStudent').onclick = ()=> goto('/student');
  $('#goAdmin').onclick   = ()=> goto('/admin');
}
