// Fase 4 — Entrenar: elegir equipo y nivel, ver las rutinas y el historial.
import { obtener, guardar } from '../db.js';
import { gatoSVG } from '../gato.js';
import { GRUPOS } from '../datos/ejercicios.js';
import {
  NIVELES, rutinasPara, minutosEstimados, ejercicio, sesionesEntreno, nivelPreferido, guardarNivel,
} from '../entrenamiento.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EQUIPOS = [['ninguno', 'En casa'], ['mancuernas', 'Mancuernas'], ['gimnasio', 'Gimnasio']];

export async function montar(contenedor) {
  const c = document.createElement('div');
  contenedor.replaceChildren(c);
  const perfil = await obtener('perfil', 'main');
  const s = { equipo: perfil?.equipo ?? 'ninguno', nivel: await nivelPreferido(perfil) };
  const historial = (await sesionesEntreno()).slice(0, 5);

  function pintar() {
    const rutinas = rutinasPara(s.equipo, s.nivel);
    c.innerHTML = `
      <div class="pila">
        <div class="retos__cabecera">
          <div class="retos__gato">${gatoSVG('saluda', { titulo: perfil?.gato?.nombre })}</div>
          <div>
            <h1 tabindex="-1">Entrenar</h1>
            <p>Rutinas guiadas con descanso. Lo que quemás se suma a tu día.</p>
          </div>
        </div>
        <section class="tarjeta">
          <h2 class="metrica__titulo">¿Con qué entrenás?</h2>
          <div class="seg" role="group" aria-label="Equipo" style="margin-top:8px">
            ${EQUIPOS.map(([v, t]) => `<button data-equipo="${v}" aria-pressed="${v === s.equipo}">${t}</button>`).join('')}
          </div>
          <h2 class="metrica__titulo" style="margin-top:16px">Nivel</h2>
          <div class="seg" role="group" aria-label="Nivel" style="margin-top:8px">
            ${Object.entries(NIVELES).map(([v, n]) => `<button data-nivel="${v}" aria-pressed="${v === s.nivel}">${n.nombre}</button>`).join('')}
          </div>
        </section>
        <ul class="rutinas">
          ${rutinas.map(r => {
            const grupos = [...new Set(r.ejercicios.map(x => GRUPOS[ejercicio(x.id).grupo]))].slice(0, 4).join(' · ');
            return `<li class="tarjeta rutina">
              <span class="rutina__emoji" aria-hidden="true">${r.emoji}</span>
              <div class="rutina__texto">
                <b>${esc(r.nombre)}</b>
                <small>${r.ejercicios.length} ejercicios · ~${minutosEstimados(r)} min</small>
                <small>${esc(grupos)}</small>
              </div>
              <a class="btn btn--chico" href="#/sesion?rutina=${r.id}&equipo=${s.equipo}&nivel=${s.nivel}">Empezar</a>
            </li>`;
          }).join('')}
        </ul>
        ${historial.length ? `<section class="tarjeta">
          <h2 class="metrica__titulo">Últimos entrenamientos</h2>
          <ul class="lista-simple">${historial.map(h => `<li>
            <span>${h.emoji} ${esc(h.nombre)} · ${esc(new Date(h.fecha + 'T12:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }))}</span>
            <b>${h.minutos} min · ${h.kcal} kcal</b></li>`).join('')}</ul>
        </section>` : ''}
        <p class="ayuda" style="padding:0 8px">Si sentís dolor (no cansancio), pará. Si tenés una lesión o una condición de salud, consultá antes con un profesional.</p>
      </div>`;
    c.querySelector('h1').focus({ preventScroll: true });
  }

  c.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.equipo) {
      s.equipo = b.dataset.equipo;
      if (perfil) { perfil.equipo = s.equipo; await guardar('perfil', perfil); }
      pintar();
    }
    if (b.dataset.nivel) { s.nivel = b.dataset.nivel; await guardarNivel(s.nivel); pintar(); }
  });
  pintar();
}
