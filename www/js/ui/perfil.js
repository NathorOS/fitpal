// Perfil — datos, plan actual y la clave propia de Gemini para la IA (Fase 6).
// El resto (editar datos, respaldo, recordatorios) llega en la Fase 8.
import { obtener } from '../db.js';
import { gatoSVG } from '../gato.js';
import { metaVigente, pesoActual } from '../objetivo.js';
import { obtenerClave, guardarClave, borrarClave, probarClave } from '../ia.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 0) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d });
const NIVEL = { sedentario: 'Poco', ligero: 'Algo', moderado: 'Bastante', alto: 'Mucho' };

export async function montar(contenedor) {
  const c = document.createElement('div');
  contenedor.replaceChildren(c);
  const perfil = await obtener('perfil', 'main');
  const meta = await metaVigente();
  const kg = await pesoActual();

  async function pintar(mensaje = '') {
    const clave = await obtenerClave();
    const oculta = clave ? `${clave.slice(0, 4)}…${clave.slice(-4)}` : '';
    c.innerHTML = `
      <div class="pila">
        <div class="retos__cabecera">
          <div class="retos__gato">${gatoSVG('feliz', { titulo: perfil?.gato?.nombre })}</div>
          <div>
            <h1 tabindex="-1">${esc(perfil?.nombre || 'Perfil')}</h1>
            <p>Con ${esc(perfil?.gato?.nombre || 'tu gatito')} desde ${perfil?.actualizado ? esc(new Date(perfil.actualizado).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })) : 'hoy'}.</p>
          </div>
        </div>

        <section class="tarjeta">
          <h2 class="metrica__titulo">Tu plan</h2>
          <ul class="lista-simple">
            <li><span>Objetivo</span><b>${perfil?.objetivo === 'mantener' ? 'Mantener el peso' : `Bajar a ${num(perfil?.peso_meta, 1)} kg`}</b></li>
            <li><span>Peso actual</span><b>${kg ? `${num(kg, 1)} kg` : '–'}</b></li>
            <li><span>Meta por día</span><b>${meta ? `${num(meta.kcal_objetivo)} kcal` : '–'}</b></li>
            <li><span>Macros</span><b>${meta ? `P ${meta.prot} · C ${meta.carb} · G ${meta.grasa} g` : '–'}</b></li>
            <li><span>Actividad</span><b>${esc(NIVEL[perfil?.actividad] ?? '–')}</b></li>
          </ul>
        </section>

        <section class="tarjeta" aria-labelledby="t-ia">
          <h2 class="metrica__titulo" id="t-ia">✨ IA para fotos y descripciones</h2>
          ${clave ? `
            <p class="perfil__estado">✅ Clave de Gemini cargada <span class="suave">(${esc(oculta)})</span></p>
            <div class="campos-2">
              <button class="btn btn--secundario" data-a="probar">Probar</button>
              <button class="btn btn--fantasma btn--peligro" data-a="borrar">Borrar clave</button>
            </div>`
          : `
            <p class="ayuda">Para analizar fotos y descripciones, Nathor Fit usa Gemini con <b>tu propia clave</b>. Es gratis con límites diarios.</p>
            <ol class="pasos-clave">
              <li>Entrá a <b>aistudio.google.com</b> con tu cuenta de Google.</li>
              <li>Tocá <b>Get API key</b> → <b>Create API key</b> y copiala.</li>
              <li>Pegala acá abajo.</li>
            </ol>
            <label class="campo">Clave de Gemini
              <input id="clave" class="campo-texto" type="password" autocomplete="off" spellcheck="false" placeholder="Pegá tu clave"></label>
            <button class="btn" data-a="guardar">Guardar y probar</button>`}
          <p class="perfil__msg" role="status">${esc(mensaje)}</p>
          <p class="hoja__nota" style="text-align:left">La clave queda guardada solo en este teléfono: no se sube a ningún lado ni se incluye en los respaldos.
            Las fotos y textos que analices se envían a Google para procesarlos.</p>
        </section>

        <section class="tarjeta">
          <ul class="lista-simple lista-enlaces">
            <li><a href="#/entrenar">🏋️ Entrenar</a></li>
            <li><a href="#/ayuno">⏳ Ayuno</a></li>
            <li><a href="#/peso">⚖️ Anotar peso</a></li>
          </ul>
        </section>

        <p class="ayuda" style="padding:0 8px">Nathor Fit te orienta, pero no reemplaza a tu médico ni a tu nutricionista.</p>
      </div>`;
    c.querySelector('h1').focus({ preventScroll: true });
  }

  c.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const msg = t => { c.querySelector('.perfil__msg').textContent = t; };
    if (b.dataset.a === 'guardar') {
      const clave = c.querySelector('#clave').value.trim();
      if (clave.length < 20) return msg('Esa clave parece incompleta. Copiala de nuevo.');
      b.disabled = true; b.setAttribute('aria-busy', 'true'); msg('Probando la clave…');
      try {
        await probarClave(clave);
        await guardarClave(clave);
        pintar('¡Listo! La IA ya funciona.');
      } catch (err) {
        b.disabled = false; b.removeAttribute('aria-busy');
        msg(err.message);
      }
    }
    if (b.dataset.a === 'probar') {
      b.disabled = true; msg('Probando…');
      try { await probarClave(await obtenerClave()); msg('✅ Funciona.'); } catch (err) { msg(err.message); }
      b.disabled = false;
    }
    if (b.dataset.a === 'borrar' && confirm('¿Borrar la clave de Gemini de este teléfono?')) {
      await borrarClave();
      pintar('Clave borrada.');
    }
  });
  pintar();
}
