import { $, toast } from '../src/ui.js';
import { createStudent } from '../src/students.js';

export function StudentRegisterView(){
  $('#app').innerHTML = `
  <section class="card">
    <h2>Registro estudiante</h2>
    <div class="grid">
      <div><label>Nombre y apellido</label><input id="s_nombre" placeholder="Ej. Ana López"></div>
      <div><label>Teléfono</label><input id="s_telefono" placeholder="+502 5xx xxx xx"></div>
      <div>
        <label>Universidad</label>
        <input id="s_universidad" placeholder="UMG Zacapa o escribe otra">
      </div>
      <div>
        <label>Horario preferido</label>
        <select id="s_horario">
          <option value="16:00">4:00 pm</option>
          <option value="18:00">6:00 pm</option>
        </select>
      </div>
      <div class="row">
        <button class="btn btn-primary" id="s_guardar">Registrarme</button>
      </div>
    </div>
  </section>`;

  $('#s_guardar').onclick = async ()=>{
    const nombre = $('#s_nombre').value.trim();
    const telefono = $('#s_telefono').value.trim();
    const universidad = $('#s_universidad').value.trim();
    const horario = $('#s_horario').value;
    if(!nombre || !universidad){ toast('Completa nombre y universidad'); return; }
    try{
      const docRef = await createStudent({ nombre, telefono, universidad, horario });
      toast('Registro creado ✅');
      // guardar id localmente para referencia
      localStorage.setItem('studentId', docRef.id);
      // mostrar pequeño resumen
      setTimeout(()=>{ location.hash = '#/student'; }, 900);
    }catch(e){ console.error(e); toast('No se pudo guardar'); }
  };
}

export default StudentRegisterView;
