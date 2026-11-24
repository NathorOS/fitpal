// Fase 3 — Anotar el peso. Parámetros: fecha=YYYY-MM-DD · volver=progreso
import { hoy as fechaHoy, obtener } from '../db.js';
import { pjHTML } from './pj.js';
import { pesos, guardarPeso } from '../actividad.js';
import { PESO } from '../objetivo.js';
import { aviso } from './registrar.js';
import { montarRuedasDecimal } from './rueda.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 1 });

export async function montar(c, params = new URLSearchParams()) {
  const perfil = await obtener('perfil', 'main');
  const lista = await pesos();
  let fecha = params.get('fecha') || fechaHoy();
  const volver = params.get('volver') === 'progreso' ? '#/progreso' : (fecha === fechaHoy() ? '#/hoy' : `#/hoy?fecha=${fecha}`);
  const previo = lista.find(p => p.fecha === fecha)?.kg ?? lista.at(-1)?.kg ?? 70;

  c.innerHTML = `
    <section class="reg">
      <header class="reg__top">
        <a class="icono-btn" href="${volver}" aria-label="Cerrar">✕</a>
        <h1 tabindex="-1">Tu peso</h1>
      </header>
      <div class="pregunta">
        <div>${pjHTML('pesandose', { titulo: perfil?.gato?.nombre || 'Tu personaje' })}</div>
        <p class="burbuja">¿Cuánto pesás hoy?</p>
      </div>
      <div data-rueda></div>
      <label class="campo">Día<input type="date" id="fecha" class="campo-texto" value="${fecha}" max="${fechaHoy()}"></label>
      <p class="error" role="alert"></p>
      <p class="ayuda">Pesate a la misma hora, si podés en ayunas. El peso sube y baja día a día por agua y sal: lo que importa es la tendencia, no un número suelto.</p>
      <button class="btn" id="guardar">Guardar peso</button>
      ${lista.length ? `<div class="tarjeta tarjeta--plana">
        <h2 class="metrica__titulo">Últimos registros</h2>
        <ul class="lista-simple">${lista.slice(-5).reverse().map(p =>
          `<li><span>${esc(new Date(p.fecha + 'T12:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }))}</span><b>${num(p.kg)} kg</b></li>`).join('')}</ul>
      </div>` : ''}
    </section>`;

  const rueda = montarRuedasDecimal(c.querySelector('[data-rueda]'), {
    min: PESO.min, max: PESO.max, valor: previo, etiqueta: 'Peso', unidad: 'kg',
  });
  c.querySelector('#fecha').addEventListener('change', e => {
    fecha = e.target.value || fecha;
    const ese = lista.find(p => p.fecha === fecha);
    if (ese) rueda.fijar(ese.kg);
  });
  c.querySelector('#guardar').addEventListener('click', async () => {
    const kg = rueda.valor();
    if (!(kg >= PESO.min && kg <= PESO.max)) {
      c.querySelector('.error').textContent = `Poné un peso entre ${PESO.min} y ${PESO.max} kg.`;
      return;
    }
    await guardarPeso(fecha, kg);
    if (!volver.startsWith('#/progreso')) aviso(`Peso guardado: ${num(kg)} kg.`);
    location.hash = volver;
  });
  c.querySelector('h1').focus({ preventScroll: true });
}
