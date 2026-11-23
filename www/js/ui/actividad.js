// Fase 3 — Anotar actividad física o pasos. Lo quemado se suma a lo que podés comer ese día.
// Parámetros: fecha=YYYY-MM-DD · tab=pasos
import { hoy as fechaHoy, obtener } from '../db.js';
import { pesoActual } from '../objetivo.js';
import {
  ACTIVIDADES, kcalActividad, kcalPasos, factorActividad, PASOS_BASE,
  guardarActividad, actividadesDelDia, borrarActividad, pasosDelDia, guardarPasos,
} from '../actividad.js';
import { aviso } from './registrar.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
const z = n => String(n).padStart(2, '0');

export async function montar(contenedor, params = new URLSearchParams()) {
  // Raíz propia: el contenedor de la app se reusa entre pantallas y no debe acumular escuchas.
  const c = document.createElement('div');
  contenedor.replaceChildren(c);
  const perfil = await obtener('perfil', 'main');
  const kg = (await pesoActual()) ?? 70;
  const factor = factorActividad(perfil?.actividad);
  const fecha = params.get('fecha') || fechaHoy();
  const volver = fecha === fechaHoy() ? '#/hoy' : `#/hoy?fecha=${fecha}`;
  const s = { tab: params.get('tab') === 'pasos' ? 'pasos' : 'actividad', actividad: 'caminar', minutos: 30 };
  let pasos = await pasosDelDia(fecha);

  async function pintar() {
    const hechas = await actividadesDelDia(fecha);
    const a = ACTIVIDADES.find(x => x.id === s.actividad);
    const kcal = kcalActividad(a.met, kg, s.minutos);
    const kp = kcalPasos(pasos, kg);
    const notaFactor = factor < 1
      ? 'Como tu nivel de actividad ya cuenta con que entrenás, sumamos la mitad para no contarlo dos veces.'
      : '';
    c.innerHTML = `
      <section class="reg">
        <header class="reg__top">
          <a class="icono-btn" href="${volver}" aria-label="Cerrar">✕</a>
          <h1 tabindex="-1">Actividad</h1>
        </header>
        <div class="seg" role="group" aria-label="Qué anotar">
          <button data-tab="actividad" aria-pressed="${s.tab === 'actividad'}">Ejercicio</button>
          <button data-tab="pasos" aria-pressed="${s.tab === 'pasos'}">Pasos</button>
        </div>
        ${s.tab === 'actividad' ? `
          <div class="grilla-act" role="radiogroup" aria-label="Tipo de actividad">
            ${ACTIVIDADES.map(x => `<button class="act" role="radio" aria-checked="${x.id === s.actividad}" data-act="${x.id}">
              <span aria-hidden="true">${x.emoji}</span>${esc(x.nombre)}</button>`).join('')}
          </div>
          <div class="contador">
            <button class="icono-btn" data-min="-5" aria-label="Menos 5 minutos">–</button>
            <div class="contador__centro">
              <label class="visualmente-oculto" for="min">Minutos</label>
              <input id="min" type="text" inputmode="numeric" value="${s.minutos}">
              <span class="contador__unidad">minutos</span>
            </div>
            <button class="icono-btn" data-min="5" aria-label="Más 5 minutos">+</button>
          </div>
          <p class="resumen-kcal" aria-live="polite">≈ <b>${num(kcal)} kcal</b> quemadas · se suman <b class="acento-txt">${num(kcal * factor)}</b> a tu día</p>
          <button class="btn" id="guardar">Anotar ${esc(a.nombre.toLowerCase())}</button>
          ${hechas.length ? `<div class="tarjeta tarjeta--plana">
            <h2 class="metrica__titulo">Anotado ese día</h2>
            <ul class="lista-simple">${hechas.map(h => `<li><span>${h.emoji} ${esc(h.nombre)} · ${h.minutos} min</span>
              <b>${num(h.kcal)} kcal</b>
              <button class="icono-btn icono-btn--chico" data-borrar="${h.id}" aria-label="Borrar ${esc(h.nombre)}">✕</button></li>`).join('')}</ul>
          </div>` : ''}`
        : `
          <p class="ayuda">Copialos de tu reloj o del contador del teléfono. Hasta ${num(PASOS_BASE)} pasos ya están dentro de tu meta; los que pasen de ahí suman.</p>
          <div class="contador">
            <button class="icono-btn" data-pasos="-500" aria-label="Menos 500 pasos">–</button>
            <div class="contador__centro">
              <label class="visualmente-oculto" for="pasos">Pasos del día</label>
              <input id="pasos" type="text" inputmode="numeric" value="${pasos}">
              <span class="contador__unidad">pasos</span>
            </div>
            <button class="icono-btn" data-pasos="500" aria-label="Más 500 pasos">+</button>
          </div>
          <p class="resumen-kcal" aria-live="polite">≈ <b>${num(kp)} kcal</b> extra · se suman <b class="acento-txt">${num(kp * factor)}</b> a tu día</p>
          <p class="ayuda">Si anotás pasos, no anotes la caminata aparte: se contaría dos veces.</p>
          <button class="btn" id="guardar-pasos">Guardar pasos</button>`}
        ${notaFactor ? `<p class="ayuda">${notaFactor}</p>` : ''}
      </section>`;
    c.querySelector('h1').focus({ preventScroll: true });
  }

  c.addEventListener('click', async e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.tab) { s.tab = t.dataset.tab; return pintar(); }
    if (t.dataset.act) { s.actividad = t.dataset.act; return pintar(); }
    if (t.dataset.min) { s.minutos = Math.max(5, Math.min(600, leer('#min') + Number(t.dataset.min))); return pintar(); }
    if (t.dataset.pasos) { pasos = Math.max(0, leer('#pasos') + Number(t.dataset.pasos)); return pintar(); }
    if (t.dataset.borrar) { await borrarActividad(t.dataset.borrar); return pintar(); }
    if (t.id === 'guardar') {
      const minutos = leer('#min');
      if (!(minutos > 0 && minutos <= 600)) return;
      const d = new Date();
      await guardarActividad({ fecha, hora: `${z(d.getHours())}:${z(d.getMinutes())}`, actividad: s.actividad, minutos, kg });
      aviso('¡Bien ahí! Actividad anotada.');
      location.hash = volver;
    }
    if (t.id === 'guardar-pasos') {
      await guardarPasos(fecha, leer('#pasos'));
      aviso('Pasos guardados.');
      location.hash = volver;
    }
  });
  c.addEventListener('change', e => {
    if (e.target.id === 'min') { s.minutos = leer('#min') || s.minutos; pintar(); }
    if (e.target.id === 'pasos') { pasos = leer('#pasos'); pintar(); }
  });
  function leer(sel) { return Math.round(Number(String(c.querySelector(sel)?.value ?? '').replace(/\./g, '').replace(',', '.')) || 0); }

  await pintar();
}
