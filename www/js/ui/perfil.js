// Perfil — plan actual, editar datos (Fase 8), clave propia de Gemini (Fase 6) y respaldo (Fase 8).
import { obtener, guardar, exportarTodo, importarTodo, leerRespaldo, borrarTodo, hoy as fechaHoy } from '../db.js';
import { pjHTML } from './pj.js';
import { metaVigente, pesoActual } from '../objetivo.js';
import { obtenerClave, guardarClave, borrarClave, probarClave, medirIA } from '../ia.js';
import { revisarMeta } from '../adaptativo.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 0) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d });
const NIVEL = { sedentario: 'Poco', ligero: 'Algo', moderado: 'Bastante', alto: 'Mucho' };

export async function montar(contenedor) {
  const c = document.createElement('div');
  contenedor.replaceChildren(c);
  const perfil = await obtener('perfil', 'main');
  const meta = await metaVigente();
  const kg = await pesoActual();
  const ajuste = await revisarMeta();

  async function pintar(mensaje = '') {
    const clave = await obtenerClave();
    const ultimo = (await obtener('config', 'ultimo_respaldo'))?.valor;
    const oculta = clave ? `${clave.slice(0, 4)}…${clave.slice(-4)}` : '';
    c.innerHTML = `
      <div class="pila">
        <div class="retos__cabecera">
          <div class="retos__gato">${pjHTML('feliz', { titulo: perfil?.gato?.nombre })}</div>
          <div>
            <h1 tabindex="-1">${esc(perfil?.nombre || 'Perfil')}</h1>
            <p>Con ${esc(perfil?.gato?.nombre || 'tu personaje')} desde ${perfil?.actualizado ? esc(new Date(perfil.actualizado).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })) : 'hoy'}.</p>
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
          <p class="hoja__nota" style="text-align:left;margin-top:8px">📊 Meta adaptativa: ${ajuste.listo
            ? `hay un ajuste para revisar en Hoy (${num(ajuste.antes)} → ${num(ajuste.despues)} kcal).`
            : esc(ajuste.motivo)}${meta?.adaptativa ? ' Tu meta actual ya fue ajustada con tus datos reales.' : ''}</p>
          <a class="btn btn--secundario" href="#/datos" style="margin-top:12px">✏️ Editar mis datos y mi plan</a>
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

        <section class="tarjeta" aria-labelledby="t-resp">
          <h2 class="metrica__titulo" id="t-resp">💾 Tus datos</h2>
          <p class="ayuda">Todo lo que anotás vive solo en este teléfono. Si lo cambiás o borrás la app, se pierde:
            guardá un respaldo cada tanto (por ejemplo, en tu Drive o mandándotelo por mail).</p>
          <p class="perfil__estado">${ultimo ? `Último respaldo: ${esc(new Date(ultimo + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }))}` : 'Todavía no guardaste ningún respaldo.'}</p>
          <div class="campos-2">
            <button class="btn btn--secundario" data-a="exportar">⬇️ Guardar</button>
            <label class="btn btn--secundario">⬆️ Restaurar<input type="file" accept=".json,application/json" data-restaurar hidden></label>
          </div>
          <p class="perfil__msg perfil__msg--resp" role="status"></p>
          <button class="btn btn--fantasma btn--peligro" data-a="borrar-todo">Borrar todos mis datos</button>
        </section>

        <section class="tarjeta">
          <ul class="lista-simple lista-enlaces">
            <li><a href="#/entrenar">🏋️ Entrenar</a></li>
            <li><a href="#/ayuno">⏳ Ayuno</a></li>
            <li><a href="#/peso">⚖️ Anotar peso</a></li>
          </ul>
        </section>

        <p class="ayuda" style="padding:0 8px">Nathor Fit te orienta, pero no reemplaza a tu médico ni a tu nutricionista.</p>
        <p class="aviso-flotante" role="status" hidden></p>
      </div>`;
    mostrarAviso();
    c.querySelector('h1').focus({ preventScroll: true });
  }

  function mostrarAviso() {
    let texto = null;
    try { texto = sessionStorage.getItem('nathorfit-aviso'); sessionStorage.removeItem('nathorfit-aviso'); } catch { /* nada */ }
    if (!texto) return;
    const p = c.querySelector('.aviso-flotante');
    p.textContent = texto; p.hidden = false;
    setTimeout(() => { p.hidden = true; }, 3500);
  }
  const msgResp = t => { c.querySelector('.perfil__msg--resp').textContent = t; };

  // Restaurar: se lee y se revisa el archivo, se muestra de cuándo es y se pide confirmación.
  c.addEventListener('change', async e => {
    if (!e.target.matches('[data-restaurar]') || !e.target.files?.[0]) return;
    const archivo = e.target.files[0];
    e.target.value = '';
    try {
      const texto = await archivo.text();
      const r = leerRespaldo(texto);
      const cuando = r.fecha ? r.fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'fecha desconocida';
      if (!confirm(`Respaldo del ${cuando} (${r.comidas} comidas, ${r.pesos} pesos).\n\nVa a REEMPLAZAR todo lo que hay en este teléfono. ¿Seguir?`)) return;
      msgResp('Restaurando…');
      await importarTodo(texto);
      try { sessionStorage.setItem('nathorfit-aviso', '✅ Respaldo restaurado.'); } catch { /* nada */ }
      location.hash = '#/hoy';
      location.reload();
    } catch (err) {
      console.error(err);
      msgResp(err.message || 'No se pudo restaurar el respaldo.');
    }
  });

  c.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const msg = t => { c.querySelector('.perfil__msg').textContent = t; };
    if (b.dataset.a === 'exportar') {
      b.disabled = true;
      try {
        const json = await exportarTodo();
        const nombre = `nathorfit-respaldo-${fechaHoy()}.json`;
        const archivo = new File([json], nombre, { type: 'application/json' });
        // En el celular, compartir deja elegir dónde guardarlo (Drive, mail, WhatsApp…).
        if (navigator.canShare?.({ files: [archivo] }) && matchMedia('(pointer: coarse)').matches) {
          try { await navigator.share({ files: [archivo], title: 'Respaldo de Nathor Fit' }); }
          catch (err) { if (err.name === 'AbortError') { b.disabled = false; return; } throw err; }
        } else {
          const url = URL.createObjectURL(archivo);
          const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
          document.body.append(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
        await guardar('config', { clave: 'ultimo_respaldo', valor: fechaHoy() });
        await pintar();
        msgResp(`Listo: se guardó ${nombre}. La clave de la IA no se incluye.`);
      } catch (err) {
        console.error(err);
        b.disabled = false;
        msgResp('No se pudo guardar el respaldo. Probá de nuevo.');
      }
      return;
    }
    if (b.dataset.a === 'borrar-todo') {
      if (!confirm('¿Borrar TODOS tus datos de este teléfono? Comidas, pesos, plan y la clave de la IA. No se puede deshacer.')) return;
      if (!confirm('Última confirmación: ¿borrar todo y empezar de cero?')) return;
      await borrarTodo();
      try { sessionStorage.clear(); } catch { /* nada */ }
      location.hash = '#/onboarding';
      location.reload();
      return;
    }
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
      b.disabled = true; msg('Probando con una respuesta de verdad…');
      try {
        const { modelo, segundos, saltados } = await medirIA(await obtenerClave());
        msg(`✅ Funciona con ${modelo}: contestó en ${String(segundos).replace('.', ',')} s.`
          + (saltados.length ? ` Salteé ${saltados.map(x => `${x.modelo} (${x.status === 429 ? 'sin cuota' : x.status === 404 ? 'no existe' : 'saturado'})`).join(', ')}.` : ''));
      } catch (err) { msg(err.detalle ? `${err.message} Detalle: ${err.detalle}` : err.message); }
      b.disabled = false;
    }
    if (b.dataset.a === 'borrar' && confirm('¿Borrar la clave de Gemini de este teléfono?')) {
      await borrarClave();
      pintar('Clave borrada.');
    }
  });
  pintar();
}
