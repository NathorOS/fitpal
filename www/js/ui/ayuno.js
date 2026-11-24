// Fase 5 — Ayuno: elegir protocolo y empezar (ahora, desde la última comida o a otra hora),
// o seguir el que está en curso con su cronómetro. El inicio se puede editar hacia atrás.
import { todos, obtener } from '../db.js';
import { pjHTML } from './pj.js';
import {
  PROTOCOLOS, reloj, progresoAyuno, validarInicio, ultimaComida, ayunoEnCurso, ayunos,
  empezarAyuno, editarAyuno, terminarAyuno, borrarAyuno, metaAyunoPreferida, guardarMetaAyuno,
} from '../ayuno.js';
import { aviso } from './registrar.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const z = n => String(n).padStart(2, '0');
const paraInput = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
function cuando(d) {
  const hoy = new Date(); const ayer = new Date(); ayer.setDate(ayer.getDate() - 1); const man = new Date(); man.setDate(man.getDate() + 1);
  const mismo = (a, b) => a.toDateString() === b.toDateString();
  const dia = mismo(d, hoy) ? 'hoy' : mismo(d, ayer) ? 'ayer' : mismo(d, man) ? 'mañana'
    : d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
  return `${dia} a las ${z(d.getHours())}:${z(d.getMinutes())}`;
}

export async function montar(contenedor) {
  const c = document.createElement('div');
  contenedor.replaceChildren(c);
  const perfil = await obtener('perfil', 'main');
  const gato = perfil?.gato?.nombre || 'Tu personaje';
  let timer = null;
  const s = { meta: await metaAyunoPreferida(), modo: 'ahora', otra: paraInput(new Date()) };

  async function pintar() {
    clearInterval(timer);
    const curso = await ayunoEnCurso();
    curso ? pintarCurso(curso) : pintarInicio();
  }

  async function pintarInicio() {
    const ultima = ultimaComida(await todos('registro'));
    const ultimaValida = ultima && !validarInicio(ultima);
    const historial = (await ayunos()).filter(a => a.fin).slice(0, 5);
    c.innerHTML = `
      <section class="reg">
        <header class="reg__top">
          <a class="icono-btn" href="#/hoy" aria-label="Cerrar">✕</a>
          <h1 tabindex="-1">Ayuno</h1>
        </header>
        <div class="pregunta">
          <div>${pjHTML('durmiendo', { titulo: gato })}</div>
          <p class="burbuja">¿Cuántas horas querés ayunar?</p>
        </div>
        <div class="opciones" role="radiogroup" aria-label="Protocolo">
          ${PROTOCOLOS.map(p => `<button class="opcion" role="radio" aria-checked="${p.horas === s.meta}" data-meta="${p.horas}">
            <span class="emoji" aria-hidden="true">⏳</span>
            <span>${p.nombre}${p.recomendado ? '<span class="etiqueta">Recomendado</span>' : ''}<small>${p.horas} h de ayuno · ${esc(p.sub)}</small></span>
          </button>`).join('')}
        </div>
        <h2 class="metrica__titulo">¿Desde cuándo?</h2>
        <div class="opciones" role="radiogroup" aria-label="Inicio del ayuno">
          <button class="opcion" role="radio" aria-checked="${s.modo === 'ahora'}" data-modo="ahora"><span class="emoji" aria-hidden="true">▶️</span>Desde ahora</button>
          ${ultimaValida ? `<button class="opcion" role="radio" aria-checked="${s.modo === 'ultima'}" data-modo="ultima"><span class="emoji" aria-hidden="true">🍽️</span>
            <span>Desde mi última comida<small>${esc(cuando(ultima))}</small></span></button>` : ''}
          <button class="opcion" role="radio" aria-checked="${s.modo === 'otra'}" data-modo="otra"><span class="emoji" aria-hidden="true">🕒</span>Elegir otra hora</button>
        </div>
        ${s.modo === 'otra' ? `<label class="campo">Empezó
          <input type="datetime-local" class="campo-texto" id="otra" value="${s.otra}" max="${paraInput(new Date())}"></label>` : ''}
        <p class="error" role="alert"></p>
        <button class="btn" id="empezar">Empezar ayuno de ${s.meta} h</button>
        <p class="ayuda">El ayuno no es para todos. Si estás embarazada o dando la teta, tenés diabetes, tomás medicación o tuviste un trastorno de la conducta alimentaria, consultá antes con un profesional. Durante el ayuno tomá agua.</p>
        ${historial.length ? `<div class="tarjeta tarjeta--plana">
          <h2 class="metrica__titulo">Últimos ayunos</h2>
          <ul class="lista-simple">${historial.map(a => {
            const p = progresoAyuno(a);
            return `<li><span>${p.cumplido ? '✅' : '⏸️'} ${esc(new Date(a.inicio).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }))}</span>
              <b>${reloj(p.horas).slice(0, 5)} h de ${a.meta_h}</b></li>`;
          }).join('')}</ul></div>` : ''}
      </section>`;
    c.querySelector('h1').focus({ preventScroll: true });

    c.querySelectorAll('[data-meta]').forEach(b => b.onclick = () => { s.meta = Number(b.dataset.meta); pintarInicio(); });
    c.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => { s.modo = b.dataset.modo; pintarInicio(); });
    c.querySelector('#otra')?.addEventListener('change', e => { s.otra = e.target.value; });
    c.querySelector('#empezar').onclick = async () => {
      const inicio = s.modo === 'ultima' ? ultima : s.modo === 'otra' ? new Date(s.otra) : new Date();
      const error = validarInicio(inicio);
      if (error) { c.querySelector('.error').textContent = error; return; }
      await guardarMetaAyuno(s.meta);
      await empezarAyuno({ inicio, meta_h: s.meta });
      pintar();
    };
  }

  function pintarCurso(a) {
    const R = 100, CIRC = 2 * Math.PI * R;
    const fin = new Date(new Date(a.inicio).getTime() + a.meta_h * 3600000);
    c.innerHTML = `
      <section class="reg ayuno">
        <header class="reg__top">
          <a class="icono-btn" href="#/hoy" aria-label="Cerrar">✕</a>
          <h1 tabindex="-1">Estás en ayuno</h1>
        </header>
        <div class="ayuno__reloj">
          <svg viewBox="0 0 240 240" aria-hidden="true">
            <circle cx="120" cy="120" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="16"/>
            <circle id="arco" cx="120" cy="120" r="${R}" fill="none" stroke="var(--accent)" stroke-width="16" stroke-linecap="round"
              stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}" transform="rotate(-90 120 120)"/>
          </svg>
          <div class="ayuno__centro">
            <div class="gato-mini" id="gato-ayuno"></div>
            <p class="ayuno__tiempo" id="tiempo" role="timer" aria-live="off">00:00:00</p>
            <p class="ayuno__meta">de ${a.meta_h} h</p>
          </div>
        </div>
        <p class="ayuno__estado" id="estado" aria-live="polite"></p>
        <div class="fichas">
          <div class="ficha"><span class="ficha__txt">Empezó</span><b>${esc(cuando(new Date(a.inicio)))}</b>
            <button class="enlace" id="editar">Editar</button></div>
          <div class="ficha"><span class="ficha__txt">Meta</span><b>${esc(cuando(fin))}</b></div>
        </div>
        <div id="edicion" hidden>
          <label class="campo">Empezó
            <input type="datetime-local" class="campo-texto" id="nuevo-inicio" value="${paraInput(new Date(a.inicio))}" max="${paraInput(new Date())}"></label>
          <p class="error" role="alert"></p>
          <button class="btn btn--secundario" id="guardar-inicio">Guardar hora de inicio</button>
        </div>
        <button class="btn" id="terminar">Terminar ayuno</button>
        <button class="btn btn--fantasma" id="cancelar">Cancelar (no lo guarda)</button>
      </section>`;
    c.querySelector('h1').focus({ preventScroll: true });

    let gatoActual = '';
    const tick = () => {
      if (!c.isConnected) return clearInterval(timer);
      const p = progresoAyuno(a);
      c.querySelector('#tiempo').textContent = reloj(p.horas);
      c.querySelector('#arco').setAttribute('stroke-dashoffset', String(CIRC * (1 - p.pct)));
      const estado = p.cumplido ? 'festejando' : 'durmiendo';
      if (estado !== gatoActual) {
        gatoActual = estado;
        c.querySelector('#gato-ayuno').innerHTML = pjHTML(estado, { titulo: gato });
        c.querySelector('#estado').textContent = p.cumplido
          ? `¡Llegaste a las ${a.meta_h} horas! Podés cortar cuando quieras.`
          : 'Tomá agua, té o café sin azúcar. Si te sentís mal, cortá: no pasa nada.';
        c.querySelector('#terminar').textContent = p.cumplido ? 'Terminar ayuno 🎉' : 'Terminar ayuno';
      }
    };
    tick();
    timer = setInterval(tick, 1000);

    c.querySelector('#editar').onclick = () => { c.querySelector('#edicion').hidden = false; c.querySelector('#nuevo-inicio').focus(); };
    c.querySelector('#guardar-inicio').onclick = async () => {
      const v = new Date(c.querySelector('#nuevo-inicio').value);
      const error = validarInicio(v);
      if (error) { c.querySelector('#edicion .error').textContent = error; return; }
      await editarAyuno(a.id, { inicio: v.toISOString() });
      pintar();
    };
    c.querySelector('#terminar').onclick = async () => {
      const p = progresoAyuno(a);
      await terminarAyuno(a.id);
      aviso(p.cumplido ? `¡Ayuno de ${a.meta_h} h completo! 🎉` : `Ayuno terminado: ${reloj(p.horas).slice(0, 5)} h. ¡Bien igual!`);
      location.hash = '#/hoy';
    };
    c.querySelector('#cancelar').onclick = async () => {
      if (!confirm('¿Cancelar este ayuno? No va a quedar guardado.')) return;
      await borrarAyuno(a.id);
      pintar();
    };
  }

  await pintar();
}
