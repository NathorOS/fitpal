// STUB de Fase 0. En la Fase 1 este archivo se reemplaza por el onboarding de 7 pasos.
// El perfil que guarda acá lleva `provisional: true` para que la Fase 1 lo detecte y
// vuelva a pedir los datos reales.
import { guardar } from '../db.js';

export async function montar(c) {
  c.innerHTML = `
    <h1>Bienvenido a Nathor Fit</h1>
    <div class="tarjeta">
      <p>El onboarding completo llega en la Fase 1.</p>
      <p class="suave" style="margin-top:8px">Nathor Fit no reemplaza a un médico ni a un nutricionista.</p>
    </div>
    <button class="boton" id="seguir">Empezar</button>`;
  c.querySelector('#seguir').addEventListener('click', async () => {
    await guardar('perfil', { id: 'main', provisional: true });
    location.hash = '#/hoy';
  });
}
