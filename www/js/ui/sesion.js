// Fase 4 — Sesión guiada: serie por serie, con descanso en cuenta regresiva y resumen al final.
// Parámetros: rutina=<id> · equipo · nivel (rutina=ia: la que armó el entrenador con IA, guardada en config)
import { obtener, hoy as fechaHoy } from '../db.js';
import { ayudanteHTML } from './ayudante.js';
import { decir } from '../ayudantes.js';
import { GRUPOS } from '../datos/ejercicios.js';
import { pesoActual } from '../objetivo.js';
import { factorActividad } from '../actividad.js';
import { rutinasPara, ejercicio, sugerir, ultimasMarcas, guardarSesion, kcalSesion } from '../entrenamiento.js';
import { aviso } from './registrar.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 1) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d });
const z = n => String(n).padStart(2, '0');
const mmss = s => `${z(Math.floor(Math.max(0, s) / 60))}:${z(Math.max(0, Math.ceil(s)) % 60)}`;
const leerNum = v => Number(String(v ?? '').replace(',', '.'));

export async function montar(contenedor, params = new URLSearchParams()) {
  const c = document.createElement('div');
  contenedor.replaceChildren(c);
  const rutina = params.get('rutina') === 'ia'
    ? (await obtener('config', 'coach_rutina'))?.valor
    : rutinasPara(params.get('equipo') || 'ninguno', params.get('nivel') || 'principiante').find(r => r.id === params.get('rutina'));
  if (!rutina) { location.hash = '#/entrenar'; return; }
  const perfil = await obtener('perfil', 'main');
  const kg = (await pesoActual()) ?? 70;
  const marcas = await ultimasMarcas();
  const t0 = Date.now();
  const totalSeries = rutina.ejercicios.reduce((a, x) => a + x.series, 0);
  const registro = rutina.ejercicios.map(x => ({ id: x.id, objetivo: x.objetivo, series: [] }));
  const st = { i: 0, serie: 1, fase: 'trabajo', restan: 0, corriendo: false, valor: null, kg: null, guardado: false };
  let timer = null;
  // Lo que dice del Giudice: una frase por serie/descanso, que no cambia si la pantalla se vuelve a pintar
  const dichos = {};
  const dicho = (clave, sit) => (dichos[clave] ??= decir('entrenador', sit));

  const actual = () => rutina.ejercicios[st.i];
  const hechas = () => registro.reduce((a, r) => a + r.series.length, 0);
  const parar = () => { clearInterval(timer); timer = null; };
  const vivo = () => c.isConnected || (parar(), false);

  function prepararEjercicio() {
    const x = actual();
    const sug = sugerir(x.id, x.objetivo, marcas[x.id]);
    st.sug = sug;
    st.valor = ejercicio(x.id).tipo === 'tiempo' ? sug.seg : sug.reps;
    st.kg = sug.kg;
    st.restan = sug.seg ?? 0;
    st.corriendo = false;
  }

  function cabecera() {
    return `<header class="reg__top sesion__top">
      <button class="icono-btn" data-a="salir" aria-label="Terminar el entrenamiento">✕</button>
      <div class="sesion__avance">
        <small>${esc(rutina.nombre)} · ejercicio ${st.i + 1} de ${rutina.ejercicios.length}</small>
        <div class="macro__pista" role="progressbar" aria-label="Series hechas" aria-valuemin="0" aria-valuemax="${totalSeries}" aria-valuenow="${hechas()}">
          <i style="width:${(hechas() / totalSeries) * 100}%;background:var(--accent)"></i></div>
      </div>
    </header>`;
  }

  function pintar() {
    parar();
    if (st.fase === 'fin') return pintarFin();
    if (st.fase === 'descanso') return pintarDescanso();
    const x = actual(), e = ejercicio(x.id);
    const tiempo = e.tipo === 'tiempo';
    const pasoKg = e.equipo === 'gimnasio' ? 2.5 : 1;
    c.innerHTML = `
      <section class="reg sesion">
        ${cabecera()}
        <div class="sesion__ej">
          <span class="hoja__emoji" aria-hidden="true">${e.emoji}</span>
          <h1 tabindex="-1">${esc(e.nombre)}</h1>
          <span class="chip">${GRUPOS[e.grupo]}</span>
          <p class="sesion__indic">${esc(e.indicaciones)}</p>
        </div>
        ${ayudanteHTML('entrenador', dicho(`serie|${st.i}|${st.serie}`, 'serie'), { tam: 'chico' })}
        <p class="sesion__serie">Serie ${st.serie} de ${x.series}</p>
        ${st.sug.subio && st.serie === 1 ? `<p class="sesion__sube">⬆️ La vez pasada completaste todo: hoy subimos un poco.</p>` : ''}
        ${tiempo ? `
          <div class="sesion__reloj" role="timer" aria-live="off"><span id="cuenta">${mmss(st.restan)}</span></div>
          <button class="btn btn--secundario" data-a="reloj">${st.corriendo ? '⏸ Pausar' : st.restan < st.valor ? '▶ Seguir' : '▶ Empezar'}</button>`
        : `
          <div class="contador">
            <button class="icono-btn" data-a="reps-" aria-label="Una repetición menos">–</button>
            <div class="contador__centro">
              <label class="visualmente-oculto" for="reps">Repeticiones hechas</label>
              <input id="reps" type="text" inputmode="numeric" value="${st.valor}">
              <span class="contador__unidad">repeticiones</span>
            </div>
            <button class="icono-btn" data-a="reps+" aria-label="Una repetición más">+</button>
          </div>`}
        ${e.usaPeso ? `
          <div class="contador contador--chico">
            <button class="icono-btn" data-a="kg-" aria-label="Menos ${num(pasoKg)} kg">–</button>
            <div class="contador__centro">
              <label class="visualmente-oculto" for="kg">Peso en kilos</label>
              <input id="kg" type="text" inputmode="decimal" placeholder="—" value="${st.kg != null ? String(st.kg).replace('.', ',') : ''}">
              <span class="contador__unidad">kg${st.kg == null ? ' (opcional)' : ''}</span>
            </div>
            <button class="icono-btn" data-a="kg+" aria-label="Más ${num(pasoKg)} kg">+</button>
          </div>` : ''}
        <button class="btn" data-a="hecha">✓ Serie hecha</button>
        <button class="btn btn--fantasma" data-a="saltar">Saltar este ejercicio</button>
      </section>`;
    c.querySelector('h1').focus({ preventScroll: true });
    if (tiempo && st.corriendo) arrancarReloj();
  }

  function arrancarReloj() {
    parar();
    let ult = performance.now();
    timer = setInterval(() => {
      if (!vivo()) return;
      const ahora = performance.now();
      st.restan -= (ahora - ult) / 1000; ult = ahora;
      const el = c.querySelector('#cuenta');
      if (el) el.textContent = mmss(st.restan);
      if (st.restan <= 0) { navigator.vibrate?.(200); marcarSerie(); }
    }, 250);
  }

  function marcarSerie() {
    parar();
    const x = actual(), e = ejercicio(x.id);
    const reg = registro[st.i];
    if (e.tipo === 'tiempo') reg.series.push({ seg: Math.round(st.valor - Math.max(0, st.restan)) });
    else {
      const reps = Math.max(0, Math.round(leerNum(c.querySelector('#reps')?.value ?? st.valor)));
      const kgv = e.usaPeso ? leerNum(c.querySelector('#kg')?.value) : NaN;
      reg.series.push(Number.isFinite(kgv) && kgv > 0 ? { reps, kg: kgv } : { reps });
      st.valor = reps;
      if (Number.isFinite(kgv) && kgv > 0) st.kg = kgv;
    }
    siguiente(x.descanso);
  }

  function siguiente(descanso) {
    const x = actual();
    if (st.serie < x.series) { st.serie++; st.restan = st.sug.seg ?? 0; st.corriendo = false; }
    else if (st.i < rutina.ejercicios.length - 1) { st.i++; st.serie = 1; prepararEjercicio(); }
    else { st.fase = 'fin'; return pintar(); }
    st.fase = 'descanso';
    st.descanso = descanso;
    pintar();
  }

  function pintarDescanso() {
    const x = actual(), e = ejercicio(x.id);
    let restan = st.descanso;
    c.innerHTML = `
      <section class="reg sesion sesion--descanso">
        ${cabecera()}
        <h1 tabindex="-1">Descanso</h1>
        ${ayudanteHTML('entrenador', dicho(`descanso|${st.i}|${st.serie}`, 'descanso'))}
        <div class="sesion__reloj" role="timer" aria-live="off"><span id="cuenta">${mmss(restan)}</span></div>
        <div class="campos-2">
          <button class="btn btn--secundario" data-a="mas15">+15 s</button>
          <button class="btn btn--secundario" data-a="fin-descanso">Saltar</button>
        </div>
        <p class="sesion__sigue">Sigue: <b>${e.emoji} ${esc(e.nombre)}</b> · serie ${st.serie} de ${x.series}</p>
      </section>`;
    c.querySelector('h1').focus({ preventScroll: true });
    let ult = performance.now();
    timer = setInterval(() => {
      if (!vivo()) return;
      const ahora = performance.now();
      restan -= (ahora - ult) / 1000; ult = ahora;
      st.descanso = restan;
      c.querySelector('#cuenta').textContent = mmss(restan);
      if (restan <= 0) { navigator.vibrate?.([120, 80, 120]); st.fase = 'trabajo'; pintar(); }
    }, 250);
  }

  async function pintarFin() {
    const minutos = Math.max(1, Math.round((Date.now() - t0) / 60000));
    const kcal = kcalSesion(rutina, minutos, kg);
    const suma = Math.round(kcal * factorActividad(perfil?.actividad));
    const hechos = registro.filter(r => r.series.length);
    if (!st.guardado && hechos.length) {
      st.guardado = true;
      const d = new Date();
      await guardarSesion({
        fecha: fechaHoy(), hora: `${z(d.getHours())}:${z(d.getMinutes())}`, rutina: rutina.id, nombre: rutina.nombre,
        emoji: rutina.emoji, minutos, kcal, ejercicios: hechos,
      });
    }
    const proximas = hechos.map(r => ({ r, s: sugerir(r.id, r.objetivo, r) })).filter(x => x.s.subio).slice(0, 4);
    c.innerHTML = `
      <section class="reg sesion sesion--fin">
        <h1 tabindex="-1">${hechos.length ? '¡Entrenamiento completo!' : 'Lo dejamos para otro día'}</h1>
        ${ayudanteHTML('entrenador', dicho('fin', hechos.length ? 'fin' : 'abandono'), { tam: 'grande' })}
        ${hechos.length ? `
          <div class="fichas">
            <div class="ficha"><span class="ficha__num">${minutos}</span><span class="ficha__txt">minutos</span></div>
            <div class="ficha"><span class="ficha__num">${hechas()}</span><span class="ficha__txt">series hechas</span></div>
          </div>
          <p class="resumen-kcal">≈ <b>${kcal} kcal</b> quemadas · se suman <b class="acento-txt">${suma}</b> a tu día</p>
          ${proximas.length ? `<div class="tarjeta tarjeta--plana"><h2 class="metrica__titulo">La próxima vez</h2>
            <ul class="lista-simple">${proximas.map(({ r, s }) => `<li><span>${ejercicio(r.id).emoji} ${esc(ejercicio(r.id).nombre)}</span>
              <b>${s.kg ? `${num(s.kg)} kg` : s.seg ? `${s.seg} s` : `${s.reps} reps`} ⬆️</b></li>`).join('')}</ul></div>` : ''}`
        : '<p class="ayuda" style="text-align:center">No se guardó nada porque no completaste ninguna serie.</p>'}
        <a class="btn" href="#/hoy" data-a="listo">Listo</a>
      </section>`;
    c.querySelector('h1').focus({ preventScroll: true });
    if (hechos.length) aviso(`💪 ${rutina.nombre}: ${minutos} min, +${suma} kcal a tu día.`);
  }

  c.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const x = actual(), ej = ejercicio(x.id);
    const pasoKg = ej.equipo === 'gimnasio' ? 2.5 : 1;
    switch (b.dataset.a) {
      case 'reps-': case 'reps+': {
        const i = c.querySelector('#reps');
        i.value = Math.max(0, Math.round(leerNum(i.value) + (b.dataset.a === 'reps+' ? 1 : -1)));
        break;
      }
      case 'kg-': case 'kg+': {
        const i = c.querySelector('#kg');
        const v = Math.max(0, (leerNum(i.value) || 0) + (b.dataset.a === 'kg+' ? pasoKg : -pasoKg));
        i.value = String(v).replace('.', ',');
        break;
      }
      case 'reloj':
        st.corriendo = !st.corriendo;
        if (st.corriendo) arrancarReloj(); else parar();
        b.textContent = st.corriendo ? '⏸ Pausar' : '▶ Seguir';
        break;
      case 'hecha': marcarSerie(); break;
      case 'saltar':
        st.serie = x.series;   // termina este ejercicio sin registrar más series
        siguiente(10);
        break;
      case 'mas15': st.descanso += 15; pintarDescanso(); break;
      case 'fin-descanso': st.fase = 'trabajo'; pintar(); break;
      case 'salir':
        if (!hechas()) { parar(); location.hash = '#/entrenar'; break; }
        if (confirm('¿Terminar ahora? Se guarda lo que hiciste.')) { st.fase = 'fin'; pintar(); }
        break;
    }
  });

  prepararEjercicio();
  pintar();
}
