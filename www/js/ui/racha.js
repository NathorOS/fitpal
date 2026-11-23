// Fase 5 — Festejo de racha: aparece con la primera comida del día.
// Cuenta de 0 al número de días seguidos y muestra la semana. Sin vidas ni castigos.
import { todos, obtener } from '../db.js';
import { gatoSVG } from '../gato.js';
import { racha } from '../estadisticas.js';
import { semanaDe } from '../retos.js';
import { hoy as fechaHoy } from '../db.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LETRAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function fraseRacha(n) {
  if (n >= 30) return '¡Un mes entero! Esto ya es un hábito.';
  if (n >= 14) return '¡Dos semanas seguidas! Qué constancia.';
  if (n >= 7) return '¡Una semana completa! Vas muy bien.';
  if (n >= 3) return '¡Ya son varios días seguidos!';
  if (n === 2) return '¡Dos días seguidos! Mañana vamos por el tercero.';
  return '¡Primer día de tu racha! Volvé mañana y la seguimos.';
}

export async function montar(c) {
  const perfil = await obtener('perfil', 'main');
  const comidas = await todos('registro');
  const fechas = [...new Set(comidas.map(x => x.fecha))];
  const n = racha(fechas);
  const set = new Set(fechas);
  const hoy = fechaHoy();
  const semana = semanaDe(new Date());

  c.innerHTML = `
    <section class="racha">
      <div class="racha__gato">${gatoSVG('festeja', { titulo: perfil?.gato?.nombre })}</div>
      <p class="racha__num" aria-hidden="true"><span id="cuenta">0</span></p>
      <h1 tabindex="-1">${n === 1 ? 'día de racha' : 'días de racha'}<span class="visualmente-oculto">: ${n}</span></h1>
      <p class="racha__frase">${esc(fraseRacha(n))}</p>
      <ol class="semana" aria-label="Esta semana">
        ${semana.map((f, i) => `<li class="${set.has(f) ? 'hecho' : ''}${f === hoy ? ' hoy' : ''}" aria-label="${LETRAS[i]}: ${set.has(f) ? 'anotado' : 'sin anotar'}">
          <span class="semana__letra">${LETRAS[i]}</span><span class="semana__marca" aria-hidden="true">${set.has(f) ? '✓' : ''}</span></li>`).join('')}
      </ol>
      <p class="ayuda" style="text-align:center">Si un día no anotás, ${esc(perfil?.gato?.nombre || 'tu gatito')} duerme la siesta y la racha vuelve a empezar. Nada más.</p>
      <a class="btn" href="#/hoy">Seguir</a>
    </section>`;
  c.querySelector('h1').focus({ preventScroll: true });

  // Cuenta animada 0 → n
  const el = c.querySelector('#cuenta');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || n <= 1) { el.textContent = n; return; }
  const t0 = performance.now(), dur = Math.min(1200, 250 * n);
  const paso = t => {
    if (!el.isConnected) return;
    const k = Math.min(1, (t - t0) / dur);
    el.textContent = Math.round(n * (1 - (1 - k) ** 3));
    if (k < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
