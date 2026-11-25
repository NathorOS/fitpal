// Entrenador con IA: rutina del día, qué cocino, cómo vengo y charla libre.
// Parámetro: tab=rutina|cocinar|progreso|charla
import { obtener, hoy as fechaHoy } from '../db.js';
import { pjHTML } from './pj.js';
import { obtenerClave, prepararFoto } from '../ia.js';
import { ejercicio, minutosEstimados } from '../entrenamiento.js';
import {
  ANIMOS, FOCOS, crearRutina, rutinaGuardada, proponerRecetas, recetaAItem, analizarProgreso, analisisGuardado,
  consejoGuardado, consejoDelDia, chat, enviarMensaje, borrarChat,
} from '../entrenador.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
const TABS = [['rutina', 'Rutina'], ['cocinar', 'Cocinar'], ['progreso', 'Cómo vengo'], ['charla', 'Charlar']];
const SUGERIDAS = ['¿Qué ceno hoy?', '¿Por qué no bajo de peso?', 'Motivame que no tengo ganas', '¿Cuánta proteína me falta?'];

export async function montar(contenedor, params = new URLSearchParams()) {
  const c = document.createElement('div');
  contenedor.replaceChildren(c);
  const perfil = await obtener('perfil', 'main');
  const nombre = perfil?.gato?.nombre || 'Tu entrenador';
  const hayClave = Boolean(await obtenerClave());
  const st = {
    tab: TABS.some(([t]) => t === params.get('tab')) ? params.get('tab') : 'rutina',
    animo: 'normal', minutos: 30, foco: 'libre',
    texto: '', foto: null, recetas: null,
    ocupado: false, error: '', pendiente: '',
  };

  const cabecera = consejo => `<div class="retos__cabecera">
      <div class="retos__gato">${pjHTML(st.tab === 'rutina' ? 'entrenando' : 'saluda', { titulo: nombre })}</div>
      <div><h1 tabindex="-1">Entrenador</h1>
        <p>${consejo ? esc(consejo) : `${esc(nombre)} mira tus datos y te dice qué hacer.`}</p></div>
    </div>`;

  if (!hayClave) {
    c.innerHTML = `<div class="pila">${cabecera('')}
      <section class="tarjeta">
        <p>Para que te entrene, te cocine y te diga cómo venís necesito tu clave de Gemini. Es gratis y se carga una sola vez.</p>
        <a class="btn" href="#/perfil" style="margin-top:12px">Cargar mi clave en Perfil</a>
        <a class="btn btn--secundario" href="#/entrenar" style="margin-top:8px">Mientras tanto, rutinas fijas</a>
      </section></div>`;
    c.querySelector('h1').focus({ preventScroll: true });
    return;
  }

  let consejo = await consejoGuardado();

  async function pintar({ foco = true } = {}) {
    const cuerpo = await ({ rutina: htmlRutina, cocinar: htmlCocinar, progreso: htmlProgreso, charla: htmlCharla })[st.tab]();
    c.innerHTML = `<div class="pila">
      ${cabecera(consejo)}
      <div class="seg coach__tabs" role="group" aria-label="Qué querés">
        ${TABS.map(([t, n]) => `<button data-tab="${t}" aria-pressed="${t === st.tab}">${n}</button>`).join('')}
      </div>
      ${cuerpo}
      <p class="error" role="alert">${esc(st.error)}</p>
      <p class="ayuda" style="padding:0 8px">Lo que dice la IA es una idea, no una indicación médica. Tus datos resumidos se mandan a Gemini con tu clave.</p>
    </div>`;
    if (foco) c.querySelector('h1').focus({ preventScroll: true });
    if (st.tab === 'charla') { const l = c.querySelector('.chat'); if (l) l.scrollTop = l.scrollHeight; }
  }

  const ocupado = texto => `<div class="tarjeta coach__pensando" role="status"><span class="coach__puntos" aria-hidden="true"></span> ${esc(texto)}</div>`;
  const opciones = (clave, lista, actual, etiqueta) => `<div class="seg seg--chico${lista.length === 4 && clave === 'minutos' ? ' seg--4' : ''}" role="group" aria-label="${etiqueta}">
    ${lista.map(([v, n]) => `<button data-${clave}="${v}" aria-pressed="${String(v) === String(actual)}">${n}</button>`).join('')}</div>`;

  // --- Rutina ---
  async function htmlRutina() {
    const r = await rutinaGuardada();
    const deHoy = r?.fecha === fechaHoy();
    const form = `<section class="tarjeta pila-chica">
      <h2 class="metrica__titulo">¿Cómo estás hoy?</h2>
      ${opciones('animo', Object.entries(ANIMOS).map(([v, n]) => [v, { energia: '💪 Con pilas', normal: '🙂 Normal', cansado: '😮‍💨 Cansado', dolor: '🤕 Dolorido' }[v] ?? n]), st.animo, 'Cómo te sentís')}
      <h2 class="metrica__titulo">¿Cuánto tiempo tenés?</h2>
      ${opciones('minutos', [[15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 h']], st.minutos, 'Tiempo')}
      <label class="campo">Qué querés trabajar
        <select id="foco" class="campo-texto">${Object.entries(FOCOS).map(([v, n]) => `<option value="${v}" ${v === st.foco ? 'selected' : ''}>${n[0].toUpperCase() + n.slice(1)}</option>`).join('')}</select></label>
      <button class="btn" data-a="rutina" ${st.ocupado ? 'disabled' : ''}>✨ ${deHoy ? 'Armar otra rutina' : 'Armar mi rutina de hoy'}</button>
    </section>`;
    if (st.ocupado) return ocupado(`${nombre} está armando tu rutina…`) + form;
    if (!r) return form;
    return `<section class="tarjeta pila-chica coach__rutina">
      <small class="suave">${deHoy ? 'Tu rutina de hoy' : `La última que armamos (${esc(new Date(r.fecha + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' }))})`}</small>
      <h2>${esc(r.nombre)}</h2>
      ${r.porque ? `<p>${esc(r.porque)}</p>` : ''}
      <ol class="coach__ejercicios">${r.ejercicios.map(x => {
        const e = ejercicio(x.id);
        const obj = x.objetivo.seg ? (x.objetivo.seg >= 120 ? `${Math.round(x.objetivo.seg / 60)} min` : `${x.objetivo.seg} s`) : `${x.objetivo.reps} reps`;
        return `<li><span aria-hidden="true">${e?.emoji ?? '•'}</span><b>${esc(e?.nombre ?? x.id)}</b><small>${x.series > 1 ? `${x.series} × ` : ''}${obj}</small></li>`;
      }).join('')}</ol>
      <p class="suave">~${minutosEstimados(r)} min${r.consejo ? ` · ${esc(r.consejo)}` : ''}</p>
      <a class="btn" href="#/sesion?rutina=ia">▶️ Empezar</a>
    </section>${form}`;
  }

  // --- Cocinar ---
  async function htmlCocinar() {
    const form = `<section class="tarjeta pila-chica">
      <h2 class="metrica__titulo">¿Qué tenés para cocinar?</h2>
      <label class="campo"><span class="visualmente-oculto">Lo que tenés en casa</span>
        <textarea id="ingredientes" class="campo-texto campo-texto--area" maxlength="300" placeholder="Ej.: huevos, papa, media cebolla, queso cremoso, arroz">${esc(st.texto)}</textarea></label>
      ${st.foto ? `<img class="ia__foto ia__foto--chica" src="${st.foto.url}" alt="La foto de lo que tenés">` : ''}
      <div class="campos-2">
        <label class="btn btn--secundario">📷 ${st.foto ? 'Otra foto' : 'Foto de la heladera'}<input type="file" accept="image/*" capture="environment" data-foto hidden></label>
        <button class="btn" data-a="recetas" ${st.ocupado ? 'disabled' : ''}>✨ Proponeme</button>
      </div>
      <p class="hoja__nota">Las recetas entran en lo que te queda hoy. Si anotás una, la revisás antes de guardarla.</p>
    </section>`;
    if (st.ocupado) return ocupado(`${nombre} está revolviendo la heladera…`) + form;
    if (!st.recetas) return form;
    return `${st.recetas.comentario ? `<div class="pregunta"><div>${pjHTML('feliz', { titulo: nombre })}</div><p class="burbuja">${esc(st.recetas.comentario)}</p></div>` : ''}
      ${st.recetas.recetas.map((x, k) => `<section class="tarjeta pila-chica coach__receta">
        <h2>${esc(x.nombre)}</h2>
        <p class="suave">${num(x.kcal)} kcal · P ${num(x.prot)} · C ${num(x.carb)} · G ${num(x.grasa)} g${x.minutos ? ` · ${x.minutos} min` : ''}</p>
        <details><summary>Ingredientes y pasos</summary>
          <ul class="coach__ingredientes">${x.ingredientes.map(i => `<li>${esc(i.nombre)} <span class="suave">${num(i.gramos)} g</span></li>`).join('')}</ul>
          <ol class="coach__pasos">${x.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
        </details>
        <button class="btn btn--secundario" data-anotar="${k}">Anotar esta</button>
      </section>`).join('')}
      ${form}`;
  }

  // --- Cómo vengo ---
  async function htmlProgreso() {
    if (st.ocupado) return ocupado(`${nombre} está mirando tus números…`);
    const a = await analisisGuardado();
    if (!a) return `<section class="tarjeta pila-chica">
      <p>Miro tus últimas dos semanas (comidas, proteína, agua, pasos, entrenamientos y peso) y te digo qué ajustar.</p>
      <button class="btn" data-a="analizar">✨ Analizar cómo vengo</button></section>`;
    const lista = (t, items, emoji) => items.length ? `<h3 class="metrica__titulo">${t}</h3><ul class="coach__lista">${items.map(s => `<li><span aria-hidden="true">${emoji}</span>${esc(s)}</li>`).join('')}</ul>` : '';
    return `<section class="tarjeta pila-chica">
      <small class="suave">${a.fecha === fechaHoy() ? 'Análisis de hoy' : `Análisis del ${esc(new Date(a.fecha + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }))}`}</small>
      <h2>${esc(a.titulo)}</h2>
      <p>${esc(a.resumen)}</p>
      ${lista('Bien', a.bien, '✅')}
      ${lista('A mejorar', a.mejorar, '⚠️')}
    </section>
    ${a.plan.length ? `<section class="tarjeta pila-chica"><h2 class="metrica__titulo">Plan para esta semana</h2>
      <ol class="coach__plan">${a.plan.map(p => `<li><b>${esc(p.titulo)}</b><p>${esc(p.texto)}</p></li>`).join('')}</ol></section>` : ''}
    <button class="btn btn--secundario" data-a="analizar-de-nuevo">🔄 Analizar de nuevo</button>`;
  }

  // --- Charla ---
  async function htmlCharla() {
    const msgs = await chat();
    return `<section class="tarjeta pila-chica">
      <ul class="chat" aria-live="polite">${msgs.length || st.pendiente ? msgs.map(m => `<li class="chat__msg chat__msg--${m.rol}">${esc(m.texto).replace(/\n/g, '<br>')}</li>`).join('')
        : `<li class="chat__msg chat__msg--pj">Preguntame lo que quieras: qué comer, cómo entrenar, por qué no bajás… Conozco tus números.</li>`}
        ${st.pendiente ? `<li class="chat__msg chat__msg--yo">${esc(st.pendiente)}</li>` : ''}
        ${st.ocupado ? '<li class="chat__msg chat__msg--pj"><span class="coach__puntos" aria-label="Escribiendo"></span></li>' : ''}</ul>
      ${msgs.length || st.ocupado ? '' : `<div class="chips">${SUGERIDAS.map(s => `<button class="chip chip--opcion" data-sugerida="${esc(s)}">${esc(s)}</button>`).join('')}</div>`}
      <form class="chat__form" data-chat>
        <label class="visualmente-oculto" for="mensaje">Tu mensaje</label>
        <input id="mensaje" class="campo-texto" maxlength="500" autocomplete="off" placeholder="Escribile a ${esc(nombre)}…" ${st.ocupado ? 'disabled' : ''}>
        <button class="btn btn--chico" ${st.ocupado ? 'disabled' : ''}>Enviar</button>
      </form>
      ${msgs.length ? '<button class="btn btn--fantasma" data-a="borrar-chat">Borrar la charla</button>' : ''}
    </section>`;
  }

  async function correr(tarea) {
    st.ocupado = true; st.error = '';
    await pintar({ foco: false });
    try { await tarea(); } catch (err) { console.error(err); st.error = err.message || 'Algo falló. Probá de nuevo.'; }
    st.ocupado = false;
    await pintar({ foco: false });
  }

  async function mandar(texto) {
    if (!texto.trim() || st.ocupado) return;
    // Se muestra lo que escribiste mientras contesta
    st.ocupado = true; st.error = ''; st.pendiente = texto.trim();
    await pintar({ foco: false });
    try { await enviarMensaje(texto); } catch (err) { console.error(err); st.error = err.message; }
    st.ocupado = false; st.pendiente = '';
    await pintar({ foco: false });
    c.querySelector('#mensaje')?.focus();
  }

  c.addEventListener('submit', e => {
    if (!e.target.matches('[data-chat]')) return;
    e.preventDefault();
    mandar(c.querySelector('#mensaje').value);
  });

  c.addEventListener('change', async e => {
    if (e.target.id === 'foco') st.foco = e.target.value;
    if (e.target.id === 'ingredientes') st.texto = e.target.value;
    if (e.target.matches('[data-foto]') && e.target.files?.[0]) {
      st.texto = c.querySelector('#ingredientes')?.value ?? st.texto;
      try { st.foto = await prepararFoto(e.target.files[0]); st.error = ''; } catch { st.error = 'No pude abrir esa imagen. Probá con otra.'; }
      pintar({ foco: false });
    }
  });

  c.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b || st.ocupado) return;
    if (b.dataset.tab) { st.tab = b.dataset.tab; st.error = ''; history.replaceState(null, '', `#/entrenador?tab=${st.tab}`); return pintar({ foco: false }); }
    if (b.dataset.animo) { st.animo = b.dataset.animo; return pintar({ foco: false }); }
    if (b.dataset.minutos) { st.minutos = Number(b.dataset.minutos); return pintar({ foco: false }); }
    if (b.dataset.sugerida) return mandar(b.dataset.sugerida);
    if (b.dataset.anotar) {
      const x = st.recetas?.recetas?.[Number(b.dataset.anotar)];
      if (!x) return;
      try { sessionStorage.setItem('nathorfit-carrito', JSON.stringify([recetaAItem(x)])); sessionStorage.removeItem('nathorfit-foto'); } catch { /* nada */ }
      location.hash = '#/registrar?desde=ia';
      return;
    }
    const a = b.dataset.a;
    if (a === 'rutina') return correr(() => crearRutina({ animo: st.animo, minutos: st.minutos, foco: st.foco }));
    if (a === 'recetas') {
      st.texto = c.querySelector('#ingredientes')?.value.trim() ?? '';
      return correr(async () => { st.recetas = await proponerRecetas({ texto: st.texto, imagenBase64: st.foto?.base64 }); });
    }
    if (a === 'analizar' || a === 'analizar-de-nuevo') return correr(() => analizarProgreso({ forzar: a === 'analizar-de-nuevo' }));
    if (a === 'borrar-chat' && confirm('¿Borrar toda la charla con el entrenador?')) { await borrarChat(); return pintar({ foco: false }); }
  });

  await pintar();
  // El consejo del día se pide una vez por día, sin frenar la pantalla
  if (!consejo) consejoDelDia().then(t => { if (t) { consejo = t; const p = c.querySelector('.retos__cabecera p'); if (p) p.textContent = t; } }).catch(err => console.warn(err));
}
