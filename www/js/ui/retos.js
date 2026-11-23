// Fase 5 — Retos diarios y semanales. Se completan solos con lo que anotás.
import { todos, obtener, hoy as fechaHoy } from '../db.js';
import { gatoSVG } from '../gato.js';
import { calcularRetos, semanaDe } from '../retos.js';
import { metaAgua, kcalExtraDelDia } from '../actividad.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });

export async function montar(c) {
  const [perfil, comidas, agua, sesiones, pesos, pasos, metas, ayunos] = await Promise.all([
    obtener('perfil', 'main'), todos('registro'), todos('agua'), todos('sesiones'),
    todos('peso'), todos('pasos'), todos('metas'), todos('ayuno'),
  ]);
  const ordMetas = [...metas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const kg = [...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1)?.kg ?? 70;
  // Misma meta que muestra Hoy: la base más lo que suma la actividad de ese día.
  const metaKcal = f => {
    const base = (ordMetas.filter(m => m.fecha <= f).at(-1) ?? ordMetas[0])?.kcal_objetivo ?? 0;
    const extra = kcalExtraDelDia({
      actividades: sesiones.filter(s => (s.tipo === 'actividad' || s.tipo === 'entrenamiento') && s.fecha === f),
      pasos: pasos.find(p => p.fecha === f)?.pasos ?? 0, kg, nivel: perfil?.actividad,
    });
    return base ? base + extra.suma : 0;
  };
  const { diarios, semanales } = calcularRetos({
    hoy: fechaHoy(), ahora: new Date(), semana: semanaDe(new Date()), aguaMeta: metaAgua(kg), metaKcal,
    comidas, agua, sesiones: sesiones.filter(s => s.tipo === 'actividad' || s.tipo === 'entrenamiento'), pasos, pesos, ayunos,
  });
  const hechosHoy = diarios.filter(r => r.hecho).length;
  const hechosSem = semanales.filter(r => r.hecho).length;

  const fila = r => `<li class="reto${r.hecho ? ' reto--hecho' : ''}">
    <span class="reto__icono" aria-hidden="true">${r.hecho ? '✓' : r.emoji}</span>
    <div class="reto__texto">
      <b>${esc(r.titulo)}</b>
      <small>${esc(r.detalle ?? r.desc)}</small>
      <div class="macro__pista" role="progressbar" aria-label="${esc(r.titulo)}" aria-valuemin="0" aria-valuemax="${r.meta}" aria-valuenow="${r.valor}">
        <i style="width:${(r.valor / r.meta) * 100}%;background:var(--accent)"></i></div>
    </div>
    <span class="reto__valor">${r.hecho ? '¡Listo!' : `${num(r.valor)}/${num(r.meta)}${r.unidad ? ` ${r.unidad}` : ''}`}</span>
  </li>`;

  c.innerHTML = `
    <div class="pila">
      <div class="retos__cabecera">
        <div class="retos__gato">${gatoSVG(hechosHoy === diarios.length ? 'festeja' : 'feliz', { titulo: perfil?.gato?.nombre })}</div>
        <div>
          <h1 tabindex="-1">Retos</h1>
          <p>Se completan solos con lo que anotás. Si uno no sale, vuelve a empezar: sin castigos.</p>
        </div>
      </div>
      <section class="tarjeta" aria-labelledby="r-dia">
        <div class="metrica__fila"><h2 class="metrica__titulo" id="r-dia">De hoy</h2><span class="chip">${hechosHoy} de ${diarios.length}</span></div>
        <ul class="retos">${diarios.map(fila).join('')}</ul>
      </section>
      <section class="tarjeta" aria-labelledby="r-sem">
        <div class="metrica__fila"><h2 class="metrica__titulo" id="r-sem">De la semana</h2><span class="chip">${hechosSem} de ${semanales.length}</span></div>
        <ul class="retos">${semanales.map(fila).join('')}</ul>
      </section>
    </div>`;
  c.querySelector('h1').focus({ preventScroll: true });
}
