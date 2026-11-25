// Modo arcade: salís a caminar, correr o andar en bici y el GPS lo convierte en juego.
// Vistas: lobby (elegir juego) → cuenta regresiva → partida → fin (guardar). Parámetro: ver=<id> para ver una partida.
import { obtener } from '../db.js';
import { pjHTML } from './pj.js';
import { pesoActual } from '../objetivo.js';
import { factorActividad } from '../actividad.js';
import { crearMapa, puntoEnRuta } from '../mapa.js';
import { activar, sonar, decir, callar } from '../sonido.js';
import {
  MODOS, nuevaPartida, avanzar, tic, pausar, resumenFinal, elegirFantasma, fantasmaEn, distancia, ritmo, kmh,
  textoRitmo, textoTiempo, fraseVoz, salidas, guardarSalida, borrarSalida, guardarEnCurso, enCurso, borrarEnCurso,
  ajustes, guardarAjustes,
} from '../salida.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n, d = 0) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d, minimumFractionDigits: d });
const km2 = m => num(m / 1000, 2);
const pad6 = n => String(Math.max(0, Math.round(n))).padStart(6, '0');
const fechaCorta = f => new Date(`${f}T12:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
const estrellasHTML = n => `<span class="arc__estrellas" role="img" aria-label="${n} de 3 estrellas">${[1, 2, 3].map(i => `<span class="${i <= n ? 'si' : ''}">★</span>`).join('')}</span>`;
const RECORD = { puntaje: 'PUNTAJE', distancia: 'DISTANCIA', ritmo: 'RITMO', velocidad: 'VELOCIDAD' };

export async function montar(contenedor, params = new URLSearchParams()) {
  const c = document.createElement('div');
  c.className = 'arc';
  contenedor.replaceChildren(c);
  const perfil = await obtener('perfil', 'main');
  const kg = (await pesoActual()) ?? perfil?.peso_kg ?? 70;
  const personalidad = perfil?.gato?.personalidad ?? 'directo';
  const nombrePj = perfil?.gato?.nombre || 'Tu entrenador';
  let aj = await ajustes();
  let lista = await salidas();
  let pendiente = await enCurso();

  // Estado de la partida y de los recursos del teléfono
  let est = null, resumen = null, guardadoId = null;
  let vista = 'lobby', confirmando = false, bolsillo = false, error = '';
  let mapa = null, watchId = null, reloj = null, wake = null, ultimaSenal = null, ultimoFix = null, ultimoGuardado = 0;
  let monedasPos = [];
  let largoRuta = 0;

  const vivo = () => c.isConnected || (limpiar(), false);

  function limpiar() {
    if (watchId != null) navigator.geolocation?.clearWatch(watchId);
    watchId = null;
    clearInterval(reloj); reloj = null;
    wake?.release?.().catch(() => {}); wake = null;
    callar();
    mapa?.destruir(); mapa = null;
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    // Si te fuiste de la pantalla en plena partida, queda guardada para seguirla
    if (est && vista === 'juego') guardarEnCurso(est).catch(() => {});
  }

  // ------------------------------------------------------------------ lobby
  function htmlLobby() {
    const m = MODOS[aj.modo];
    const delModo = lista.filter(s => s.modo === aj.modo);
    const fantasma = elegirFantasma(lista, aj.modo);
    const mejor = delModo.reduce((a, s) => Math.max(a, s.puntaje ?? 0), 0);
    const masLejos = delModo.reduce((a, s) => Math.max(a, s.km ?? 0), 0);
    return `
      <header class="arc__top">
        <a class="arc__x" href="#/entrenador" aria-label="Volver al Entrenador">✕</a>
        <span class="arc__marca">NATHOR ARCADE</span>
        <span class="arc__creditos" aria-hidden="true">P1</span>
      </header>
      <div class="arc__titulo">
        <div class="arc__pj">${pjHTML('entrenando', { titulo: nombrePj })}</div>
        <div><h1 tabindex="-1">¡A JUGAR AFUERA!</h1>
          <p class="arc__parpadeo">CADA PASO SUMA PUNTOS</p></div>
      </div>
      ${pendiente ? `<section class="arc__panel arc__panel--alerta pila-chica" aria-labelledby="t-pend">
        <h2 id="t-pend">PARTIDA SIN TERMINAR</h2>
        <p>${MODOS[pendiente.modo]?.emoji ?? ''} ${km2(pendiente.metros)} km · ${textoTiempo(pendiente.tiempoMs / 1000)} · ${num(pendiente.puntaje)} pts</p>
        <div class="arc__fila">
          <button class="arc__btn arc__btn--oro" data-a="seguir-pendiente">▶ SEGUIR</button>
          <button class="arc__btn" data-a="cerrar-pendiente">💾 TERMINAR</button>
          <button class="arc__btn arc__btn--fantasma" data-a="descartar-pendiente">DESCARTAR</button>
        </div>
      </section>` : ''}
      <section class="arc__panel" aria-labelledby="t-juego">
        <h2 id="t-juego">ELEGÍ TU JUEGO</h2>
        <div class="arc__modos" role="group" aria-label="Juego">
          ${Object.values(MODOS).map(x => `<button data-modo="${x.id}" aria-pressed="${x.id === aj.modo}">
            <span class="arc__modo-emoji" aria-hidden="true">${x.emoji}</span>${x.nombre.toUpperCase()}</button>`).join('')}
        </div>
        <h2 id="t-meta">META</h2>
        <div class="arc__metas" role="group" aria-labelledby="t-meta">
          ${m.metas.map(k => `<button data-meta="${k}" aria-pressed="${k === aj.metaKm}">${k ? `${k} KM` : 'LIBRE'}</button>`).join('')}
        </div>
        <div class="arc__fila arc__fila--ajustes">
          <button class="arc__toggle" data-a="sonido" aria-pressed="${aj.sonido}">${aj.sonido ? '🔊' : '🔇'} SONIDO</button>
          <button class="arc__toggle" data-a="voz" aria-pressed="${aj.voz}">${aj.voz ? '🗣️' : '🤐'} VOZ</button>
        </div>
      </section>
      <button class="arc__start" data-a="start">▶ START</button>
      <p class="error arc__error" role="alert">${esc(error)}</p>
      <section class="arc__panel arc__panel--info pila-chica" aria-labelledby="t-rec">
        <h2 id="t-rec">RÉCORDS · ${m.nombre.toUpperCase()}</h2>
        ${delModo.length ? `<dl class="arc__records">
          <div><dt>MEJOR PUNTAJE</dt><dd>${pad6(mejor)}</dd></div>
          <div><dt>MÁS LEJOS</dt><dd>${num(masLejos, 2)} km</dd></div>
          <div><dt>PARTIDAS</dt><dd>${delModo.length}</dd></div>
        </dl>` : '<p>Todavía no jugaste. ¡Tu primera partida pone los récords!</p>'}
        <p class="arc__fantasma-info"><span aria-hidden="true">👻</span> ${fantasma
          ? `Vas a correr contra tu fantasma: tu mejor ${m.nombre.toLowerCase()} (${num(fantasma.km, 2)} km a ${aj.modo === 'bici' ? `${num(fantasma.kmh, 1)} km/h` : `${textoRitmo(fantasma.ritmo)} /km`}).`
          : 'Jugá una partida de 500 m o más y la próxima vez vas a competir contra tu fantasma.'}</p>
      </section>
      ${lista.length ? `<section class="arc__panel pila-chica" aria-labelledby="t-ult">
        <h2 id="t-ult">ÚLTIMAS PARTIDAS</h2>
        <ul class="arc__lista">${lista.slice(0, 8).map(s => `<li>
          <a href="#/salida?ver=${s.id}" class="arc__partida">
            <span class="arc__partida-emoji" aria-hidden="true">${s.emoji}</span>
            <span><b>${num(s.km, 2)} km</b> · ${textoTiempo(s.segMov)} · ${num(s.kcal)} kcal<br><small>${esc(fechaCorta(s.fecha))} · ${pad6(s.puntaje)} pts</small></span>
            ${estrellasHTML(s.estrellas ?? 0)}
          </a>
          <button class="arc__borrar" data-borrar="${s.id}" aria-label="Borrar la partida del ${esc(fechaCorta(s.fecha))}">✕</button>
        </li>`).join('')}</ul>
      </section>` : ''}
      <p class="arc__nota">Tu ubicación queda solo en tu teléfono. Dejá la app abierta mientras jugás: si bloqueás la pantalla, el teléfono pausa el GPS. Para ahorrar batería usá el modo 🌙 bolsillo.</p>`;
  }

  // ------------------------------------------------------------------ partida
  function htmlJuego() {
    const m = MODOS[est.modo];
    return `
      <div class="arc__hud">
        <div class="arc__hud-celda"><small>PUNTOS</small><b id="h-puntos" class="arc__oro">${pad6(est.puntaje)}</b></div>
        <div class="arc__hud-celda"><small>COMBO</small><b id="h-combo" class="arc__rosa">x${est.combo}</b></div>
        <div class="arc__hud-celda"><small>NIVEL</small><b id="h-nivel" class="arc__neon">${est.nivel + 1}</b></div>
      </div>
      <div class="arc__mapa-caja">
        <div class="arc__mapa" id="mapa"></div>
        <div class="arc__desafio" id="h-desafio" hidden></div>
        <div class="arc__estado" id="h-estado" role="status"></div>
        <div class="arc__pops" id="pops" aria-hidden="true"></div>
        <div class="arc__banner" id="banner" hidden></div>
      </div>
      <div class="arc__barras">
        <div class="arc__barra"><span>🪙 PRÓXIMA MONEDA</span><div class="arc__pista"><i id="b-moneda"></i></div></div>
        <div class="arc__barra"><span>⭐ NIVEL ${'<span id="b-nivel-n"></span>'}</span><div class="arc__pista arc__pista--neon"><i id="b-nivel"></i></div></div>
        ${est.metaKm ? `<div class="arc__barra"><span>🏁 META ${est.metaKm} KM</span><div class="arc__pista arc__pista--rosa"><i id="b-meta"></i></div></div>` : ''}
      </div>
      <dl class="arc__datos">
        <div><dt>KM</dt><dd id="d-km">0,00</dd></div>
        <div><dt>TIEMPO</dt><dd id="d-tiempo">00:00</dd></div>
        <div><dt>${est.modo === 'bici' ? 'KM/H' : 'RITMO /KM'}</dt><dd id="d-ritmo">--:--</dd></div>
        <div><dt>KCAL</dt><dd id="d-kcal">0</dd></div>
        <div><dt>${m.zancada ? 'PASOS' : 'MONEDAS'}</dt><dd id="d-pasos">0</dd></div>
        <div><dt>👻 FANTASMA</dt><dd id="d-fantasma">${est.fantasma ? '0 m' : '—'}</dd></div>
      </dl>
      <div class="arc__controles">
        <button class="arc__btn" data-a="pausa" id="b-pausa">${est.pausaManual ? '▶ SEGUIR' : '⏸ PAUSA'}</button>
        <button class="arc__btn" data-a="bolsillo" aria-label="Modo bolsillo: pantalla oscura para ahorrar batería">🌙</button>
        <button class="arc__btn" data-a="silencio" aria-label="${aj.sonido ? 'Silenciar' : 'Activar sonido'}" aria-pressed="${!aj.sonido}">${aj.sonido ? '🔊' : '🔇'}</button>
        <button class="arc__btn arc__btn--rojo" data-a="fin">⏹ FIN</button>
      </div>
      <div class="arc__confirmar" id="confirmar" ${confirmando ? '' : 'hidden'} role="dialog" aria-modal="true" aria-labelledby="t-conf">
        <div class="arc__panel pila-chica"><h2 id="t-conf">¿TERMINAR LA PARTIDA?</h2>
          <div class="arc__fila"><button class="arc__btn arc__btn--oro" data-a="terminar">SÍ, TERMINAR</button>
          <button class="arc__btn" data-a="no-terminar">SEGUIR JUGANDO</button></div></div>
      </div>
      <div class="arc__bolsillo" id="bolsillo" ${bolsillo ? '' : 'hidden'}>
        <b id="bo-km">0,00 km</b><span id="bo-tiempo">00:00</span><small>Tocá dos veces para volver</small>
      </div>
      <p class="visualmente-oculto" aria-live="polite" id="anuncio"></p>`;
  }

  function fijar(id, texto) { const el = c.querySelector(id); if (el && el.textContent !== texto) el.textContent = texto; }
  function ancho(id, f) { const el = c.querySelector(id); if (el) el.style.width = `${Math.max(0, Math.min(1, f)) * 100}%`; }

  function actualizar() {
    if (vista !== 'juego' || !est) return;
    const m = MODOS[est.modo];
    fijar('#h-puntos', pad6(est.puntaje));
    fijar('#h-combo', `x${est.combo}`);
    c.querySelector('#h-combo')?.classList.toggle('arc__combo--max', est.combo >= 5);
    fijar('#h-nivel', String(est.nivel + 1));
    fijar('#d-km', km2(est.metros));
    fijar('#d-tiempo', textoTiempo(est.tiempoMs / 1000));
    fijar('#d-ritmo', est.modo === 'bici' ? num(kmh(est.metros, est.segMov), 1) : textoRitmo(ritmo(est.metros, est.segMov)));
    fijar('#d-kcal', num(est.kcal));
    fijar('#d-pasos', m.zancada ? num(Math.round(est.metros / ((est.alturaCm || 165) * m.zancada / 100))) : String(est.monedas));
    if (est.fantasma) {
      const dif = Math.round(est.metros - fantasmaEn(est.fantasma.marcas, est.segMov));
      fijar('#d-fantasma', `${dif >= 0 ? '+' : '−'}${num(Math.abs(dif))} m`);
      c.querySelector('#d-fantasma')?.classList.toggle('arc__neon', dif >= 0);
      c.querySelector('#d-fantasma')?.classList.toggle('arc__rosa', dif < 0);
    }
    ancho('#b-moneda', (est.metros % m.moneda) / m.moneda);
    ancho('#b-nivel', (est.metros % (m.nivelKm * 1000)) / (m.nivelKm * 1000));
    fijar('#b-nivel-n', String(est.nivel + 1));
    if (est.metaKm) ancho('#b-meta', est.metros / (est.metaKm * 1000));
    fijar('#b-pausa', est.pausaManual ? '▶ SEGUIR' : '⏸ PAUSA');
    fijar('#bo-km', `${km2(est.metros)} km`);
    fijar('#bo-tiempo', textoTiempo(est.tiempoMs / 1000));

    // Estado del GPS
    const estado = est.pausaManual ? '⏸ EN PAUSA'
      : ultimaSenal == null ? '📡 BUSCANDO SEÑAL GPS…'
        : ultimaSenal > 35 ? '📡 SEÑAL DÉBIL… SALÍ A CIELO ABIERTO'
          : est.pausaAuto ? '💤 PAUSA AUTOMÁTICA · MOVETE PARA SEGUIR' : '';
    fijar('#h-estado', estado);
    c.querySelector('#h-estado').hidden = !estado;

    // Desafío
    const d = est.desafio, caja = c.querySelector('#h-desafio');
    if (caja) {
      caja.hidden = !d;
      if (d) {
        const queda = Math.max(0, Math.ceil((d.hasta - Date.now()) / 1000));
        const avance = d.tipo === 'turbo' ? `${num(Math.min(d.meta, est.metros - d.desde))} / ${num(d.meta)} m`
          : d.tipo === 'monedas' ? `${est.monedas - d.monedasDesde} / ${d.meta} 🪙` : 'NO TE FRENES';
        fijar('#h-desafio', `⚡ ${d.titulo} ${avance} · ${queda} s`);
      }
    }
  }

  function dibujarMapa() {
    if (!mapa || !est) return;
    const m = MODOS[est.modo];
    let fantasma = null;
    if (est.fantasma) {
      const fm = fantasmaEn(est.fantasma.marcas, est.segMov);
      if (fm <= est.metros) fantasma = puntoEnRuta(est.ruta, fm, distancia);
    }
    const fin = est.ruta.at(-1) ?? (ultimoFix ? [ultimoFix.lat, ultimoFix.lon] : null);
    if (!fin) return;
    mapa.mostrar({ ruta: est.ruta.length ? est.ruta : [fin], centro: fin, zoom: m.id === 'bici' ? 16 : 17, monedas: monedasPos, fantasma });
  }

  // ------------------------------------------------------------------ eventos del juego
  let timerBanner = null;
  function banner(titulo, sub = '') {
    const b = c.querySelector('#banner');
    if (!b) return;
    b.innerHTML = `<b>${esc(titulo)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
    b.hidden = false;
    b.classList.remove('arc__banner--anim'); void b.offsetWidth; b.classList.add('arc__banner--anim');
    clearTimeout(timerBanner);
    timerBanner = setTimeout(() => { b.hidden = true; }, 2600);
    fijar('#anuncio', `${titulo} ${sub}`.trim());
  }
  function pop(texto, clase = '') {
    const caja = c.querySelector('#pops');
    if (!caja) return;
    const p = document.createElement('span');
    p.className = `arc__pop ${clase}`;
    p.textContent = texto;
    caja.append(p);
    setTimeout(() => p.remove(), 1200);
  }
  const ruido = n => { if (aj.sonido) sonar(n); };
  const hablar = e => { if (aj.voz) decir(fraseVoz(e, est, personalidad)); };

  function manejar(eventos) {
    for (const e of eventos) {
      switch (e.tipo) {
        case 'moneda':
          ruido('moneda'); pop(`+${e.puntos}`); navigator.vibrate?.(25);
          if (est.ruta.length) monedasPos.push(est.ruta.at(-1));
          break;
        case 'nivel': ruido('nivel'); banner(`¡NIVEL ${e.nivel}!`, `${e.km} km · +${e.puntos}`); hablar(e); navigator.vibrate?.([80, 60, 80]); break;
        case 'meta': ruido('meta'); banner('¡META CUMPLIDA!', `+${e.puntos}`); hablar(e); navigator.vibrate?.([120, 60, 120, 60, 200]); break;
        case 'mitad': banner('¡MITAD DEL CAMINO!'); hablar(e); break;
        case 'desafio': ruido('desafio'); banner(e.desafio.titulo, 'DESAFÍO RELÁMPAGO'); hablar(e); navigator.vibrate?.([60, 40, 60]); break;
        case 'desafio-logrado': ruido('logrado'); pop(`+${e.puntos}`, 'arc__pop--grande'); banner('¡DESAFÍO SUPERADO!', `+${e.puntos}`); hablar(e); break;
        case 'desafio-perdido': ruido('perdido'); banner('DESAFÍO PERDIDO', 'ya viene otro'); hablar(e); break;
        case 'pasaste-fantasma': ruido('fantasma'); banner('¡PASASTE AL FANTASMA!', '👻'); hablar(e); break;
        case 'te-paso-fantasma': banner('EL FANTASMA TE PASÓ', '👻'); hablar(e); break;
        case 'combo-perdido': ruido('perdido'); pop('COMBO x1', 'arc__pop--rosa'); hablar(e); break;
        case 'pausa-auto': ruido('pausa'); break;
        case 'senal-mala': hablar(e); break;
        default: break;
      }
    }
  }

  // ------------------------------------------------------------------ GPS, reloj y pantalla
  function alPunto(pos) {
    if (!vivo()) return;
    ultimaSenal = pos.coords.accuracy;
    ultimoFix = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy, t: Date.now() };
    if (vista !== 'juego' || !est) return;
    manejar(avanzar(est, ultimoFix));
    actualizar();
    if (est.ruta.length !== largoRuta || !est.ruta.length) { largoRuta = est.ruta.length; dibujarMapa(); }
  }

  function alFallarGPS(err) {
    if (!vivo()) return;
    if (err.code === 1) {                  // sin permiso
      parar();
      error = 'Sin permiso de ubicación no puedo medir. Activalo en los permisos del navegador para esta app y probá de nuevo.';
      if (est && est.metros > 0) { terminar(); return; }
      est = null; vista = 'lobby'; pintar();
      return;
    }
    ultimaSenal = 999;
    actualizar();
  }

  function empezarGPS() {
    if (watchId != null) return true;
    if (!navigator.geolocation) { error = 'Este navegador no tiene GPS. Probá desde el teléfono.'; return false; }
    watchId = navigator.geolocation.watchPosition(alPunto, alFallarGPS, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    return true;
  }

  async function pantallaPrendida() {
    try { if (navigator.wakeLock && document.visibilityState === 'visible') wake = await navigator.wakeLock.request('screen'); } catch { /* no hay: sigue igual */ }
  }

  function alCambiarVisibilidad() {
    if (!est || vista !== 'juego') return;
    if (document.visibilityState === 'visible') { pantallaPrendida(); actualizar(); }
    else guardarEnCurso(est).catch(() => {});
  }

  function parar() {
    if (watchId != null) navigator.geolocation?.clearWatch(watchId);
    watchId = null;
    clearInterval(reloj); reloj = null;
    wake?.release?.().catch(() => {}); wake = null;
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
  }

  function arrancarReloj() {
    clearInterval(reloj);
    reloj = setInterval(() => {
      if (!vivo() || !est) return;
      const ahora = Date.now();
      manejar(tic(est, ahora));
      actualizar();
      if (ahora - ultimoGuardado > 10000) { ultimoGuardado = ahora; guardarEnCurso(est).catch(() => {}); }
    }, 1000);
  }

  // ------------------------------------------------------------------ flujo
  async function empezar({ seguir = null } = {}) {
    error = '';
    activar();
    if (!empezarGPS()) return pintar();
    const m = MODOS[seguir?.modo ?? aj.modo];
    vista = 'cuenta';
    c.innerHTML = `<div class="arc__cuenta" role="status" aria-live="assertive">
      <p>${m.emoji} ${m.nombre.toUpperCase()}${aj.metaKm && !seguir ? ` · META ${aj.metaKm} KM` : ''}</p><b id="cuenta">3</b>
      <small>Buscando tu ubicación…</small></div>`;
    for (const n of ['3', '2', '1']) {
      fijar('#cuenta', n);
      ruido('cuenta');
      await new Promise(r => setTimeout(r, 800));
      if (!vivo() || vista !== 'cuenta') return;
    }
    fijar('#cuenta', '¡YA!');
    ruido('ya');
    await new Promise(r => setTimeout(r, 500));
    if (!vivo() || vista !== 'cuenta') return;

    const ahora = Date.now();
    if (seguir) {
      est = seguir;
      pausar(est, false, ahora);
      monedasPos = [];
      for (let i = 1; i <= est.monedas; i++) { const p = puntoEnRuta(est.ruta, i * MODOS[est.modo].moneda, distancia); if (p) monedasPos.push(p); }
    } else {
      est = nuevaPartida({ modo: aj.modo, kg, alturaCm: perfil?.altura_cm ?? 165, metaKm: aj.metaKm, fantasma: elegirFantasma(lista, aj.modo), ahora });
      monedasPos = [];
    }
    pendiente = null;
    vista = 'juego';
    confirmando = false; bolsillo = false;
    pintar();
    if (ultimoFix && Date.now() - ultimoFix.t < 15000) manejar(avanzar(est, { ...ultimoFix, t: Date.now() }));
    largoRuta = -1;
    dibujarMapa();
    actualizar();
    arrancarReloj();
    pantallaPrendida();
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    if (aj.voz) decir(seguir ? '¡Seguimos!' : `¡Arrancamos! Cada ${MODOS[est.modo].moneda} metros, una moneda.`);
    guardarEnCurso(est).catch(() => {});
  }

  function terminar() {
    parar();
    callar();
    manejar(tic(est, Date.now()));
    resumen = resumenFinal(est, lista);
    vista = 'fin';
    guardadoId = null;
    if (resumen.records.length || resumen.metaLograda) ruido('meta'); else ruido('logrado');
    if (aj.voz) decir(`¡Fin de la partida! ${num(resumen.km, 2)} kilómetros y ${num(resumen.kcal)} calorías.${resumen.records.length ? ' ¡Nuevo récord!' : ''}`);
    guardarEnCurso(est).catch(() => {});
    pintar();
  }

  // ------------------------------------------------------------------ fin y ver
  function htmlResultado(r, { soloVer = false, fila = null } = {}) {
    const m = MODOS[r.modo];
    const sumaHoy = Math.round(r.kcal * factorActividad(perfil?.actividad));
    const corto = r.metros < 20;
    return `
      <header class="arc__top">
        <a class="arc__x" href="#/salida" aria-label="Volver al lobby">✕</a>
        <span class="arc__marca">${soloVer ? esc(fechaCorta(fila.fecha)).toUpperCase() : 'NATHOR ARCADE'}</span>
        <span class="arc__creditos" aria-hidden="true">${m.emoji}</span>
      </header>
      <div class="arc__fin pila-chica">
        <h1 tabindex="-1">${soloVer ? `${m.nombre.toUpperCase()} · ${num(r.km, 2)} KM` : corto ? 'CASI NI TE MOVISTE' : '¡FIN DE LA PARTIDA!'}</h1>
        ${estrellasHTML(r.estrellas)}
        <p class="arc__puntaje-final"><small>PUNTAJE</small><b>${pad6(r.puntaje)}</b></p>
        ${r.records?.length && !soloVer ? `<div class="arc__records-nuevos">${r.records.map(x => `<span>🏆 ¡NUEVO RÉCORD DE ${RECORD[x]}!</span>`).join('')}</div>` : ''}
        ${!soloVer && r.metaKm ? `<p class="arc__neon">${r.metaLograda ? `🏁 Meta de ${r.metaKm} km cumplida` : `🏁 Meta de ${r.metaKm} km: llegaste al ${num(Math.min(99, r.km / r.metaKm * 100))} %`}</p>` : ''}
      </div>
      ${r.rutaLarga ? '<div class="arc__mapa arc__mapa--fin" id="mapa"></div>' : ''}
      <dl class="arc__datos">
        <div><dt>KM</dt><dd>${num(r.km, 2)}</dd></div>
        <div><dt>EN MOVIMIENTO</dt><dd>${textoTiempo(r.segMov)}</dd></div>
        <div><dt>${r.modo === 'bici' ? 'KM/H' : 'RITMO /KM'}</dt><dd>${r.modo === 'bici' ? num(r.kmh, 1) : textoRitmo(r.ritmo)}</dd></div>
        <div><dt>KCAL</dt><dd>${num(r.kcal)}</dd></div>
        <div><dt>${m.zancada ? 'PASOS ≈' : 'MONEDAS'}</dt><dd>${m.zancada ? num(r.pasos) : r.monedas}</dd></div>
        <div><dt>${soloVer ? 'MONEDAS' : 'DESAFÍOS'}</dt><dd>${soloVer ? r.monedas : `${r.desafios}/${r.desafiosTotal}`}</dd></div>
      </dl>
      ${r.fantasma && !soloVer ? `<p class="arc__panel arc__fantasma-final">👻 ${r.fantasma.ganaste ? `¡Le ganaste a tu fantasma por ${num(r.fantasma.diferencia)} m!` : `Tu fantasma te ganó por ${num(-r.fantasma.diferencia)} m. ¡La revancha!`}</p>` : ''}
      ${soloVer ? `<div class="arc__fila"><a class="arc__btn arc__btn--oro" href="#/salida">VOLVER</a></div>`
        : guardadoId ? `<div class="arc__panel pila-chica"><p class="arc__neon" role="status">💾 ¡Partida guardada! Sumaste ${num(sumaHoy)} kcal a tu día.</p>
            <div class="arc__fila"><button class="arc__btn arc__btn--oro" data-a="otra">▶ JUGAR OTRA</button><a class="arc__btn" href="#/hoy">VER MI DÍA</a></div></div>`
          : corto ? `<p>No llegaste a moverte 20 metros, así que no hay nada para guardar.</p>
            <div class="arc__fila"><button class="arc__btn arc__btn--oro" data-a="descartar">VOLVER</button></div>`
            : `<div class="arc__fila"><button class="arc__btn arc__btn--oro" data-a="guardar">💾 GUARDAR PARTIDA</button>
              <button class="arc__btn arc__btn--fantasma" data-a="descartar">DESCARTAR</button></div>
              <p class="arc__nota">Al guardarla suma ${num(sumaHoy)} kcal a lo que podés comer hoy${m.zancada ? '. Los pasos son estimados con tu altura' : ''}.</p>`}`;
  }

  // ------------------------------------------------------------------ pintar
  function pintar() {
    mapa?.destruir(); mapa = null;
    c.classList.toggle('arc--juego', vista === 'juego');
    if (vista === 'lobby') {
      c.innerHTML = htmlLobby();
      c.querySelector('h1').focus({ preventScroll: true });
      return;
    }
    if (vista === 'juego') {
      c.innerHTML = htmlJuego();
      mapa = crearMapa(c.querySelector('#mapa'));
      largoRuta = -1;
      dibujarMapa();
      actualizar();
      return;
    }
    if (vista === 'fin') {
      c.innerHTML = htmlResultado({ ...resumen, rutaLarga: est.ruta.length > 1 });
      if (est.ruta.length > 1) { mapa = crearMapa(c.querySelector('#mapa')); mapa.mostrar({ ruta: est.ruta, monedas: monedasPos, zoom: 17 }); }
      c.querySelector('h1').focus({ preventScroll: true });
    }
  }

  // ------------------------------------------------------------------ ver una partida guardada
  if (params.get('ver')) {
    const fila = lista.find(s => String(s.id) === params.get('ver'));
    if (!fila) { location.hash = '#/salida'; return; }
    const r = { ...fila, metros: fila.km * 1000, rutaLarga: fila.ruta?.length > 1 };
    c.innerHTML = htmlResultado(r, { soloVer: true, fila });
    if (r.rutaLarga) { mapa = crearMapa(c.querySelector('#mapa')); mapa.mostrar({ ruta: fila.ruta, zoom: 17 }); }
    c.querySelector('h1').focus({ preventScroll: true });
    return;
  }

  // ------------------------------------------------------------------ toques
  let toqueBolsillo = 0;
  c.addEventListener('click', async e => {
    // Modo bolsillo: dos toques seguidos para volver
    if (e.target.closest('#bolsillo')) {
      const ahora = Date.now();
      if (ahora - toqueBolsillo < 450) { bolsillo = false; c.querySelector('#bolsillo').hidden = true; }
      toqueBolsillo = ahora;
      return;
    }
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.modo) {
      aj = { ...aj, modo: b.dataset.modo, metaKm: 0 };
      guardarAjustes(aj);
      return pintar();
    }
    if (b.dataset.meta) { aj = { ...aj, metaKm: Number(b.dataset.meta) }; guardarAjustes(aj); return pintar(); }
    if (b.dataset.borrar) {
      if (!confirm('¿Borrar esta partida? También se saca de la actividad de ese día.')) return;
      await borrarSalida(b.dataset.borrar);
      lista = await salidas();
      return pintar();
    }
    const a = b.dataset.a;
    if (a === 'sonido') { aj = { ...aj, sonido: !aj.sonido }; guardarAjustes(aj); return pintar(); }
    if (a === 'voz') { aj = { ...aj, voz: !aj.voz }; guardarAjustes(aj); if (!aj.voz) callar(); return pintar(); }
    if (a === 'start') return empezar();
    if (a === 'seguir-pendiente' && pendiente) return empezar({ seguir: pendiente });
    if (a === 'cerrar-pendiente' && pendiente) {
      est = pendiente; pendiente = null;
      monedasPos = [];
      for (let i = 1; i <= est.monedas; i++) { const p = puntoEnRuta(est.ruta, i * MODOS[est.modo].moneda, distancia); if (p) monedasPos.push(p); }
      resumen = resumenFinal(est, lista); vista = 'fin'; guardadoId = null;
      return pintar();
    }
    if (a === 'descartar-pendiente') {
      if (!confirm('¿Descartar la partida sin terminar?')) return;
      await borrarEnCurso(); pendiente = null; return pintar();
    }
    // En la partida
    if (a === 'pausa') {
      pausar(est, !est.pausaManual, Date.now());
      ruido('pausa');
      if (est.pausaManual) guardarEnCurso(est).catch(() => {});
      return actualizar();
    }
    if (a === 'silencio') {
      aj = { ...aj, sonido: !aj.sonido }; guardarAjustes(aj);
      b.textContent = aj.sonido ? '🔊' : '🔇';
      b.setAttribute('aria-pressed', String(!aj.sonido));
      b.setAttribute('aria-label', aj.sonido ? 'Silenciar' : 'Activar sonido');
      return;
    }
    if (a === 'bolsillo') { bolsillo = true; c.querySelector('#bolsillo').hidden = false; return; }
    if (a === 'fin') { confirmando = true; c.querySelector('#confirmar').hidden = false; c.querySelector('[data-a="terminar"]').focus(); return; }
    if (a === 'no-terminar') { confirmando = false; c.querySelector('#confirmar').hidden = true; return; }
    if (a === 'terminar') { confirmando = false; return terminar(); }
    // En el final
    if (a === 'guardar' && !guardadoId) {
      b.disabled = true;
      guardadoId = await guardarSalida(est, resumen);
      lista = await salidas();
      return pintar();
    }
    if (a === 'descartar') {
      if (resumen?.metros >= 20 && !confirm('¿Descartar la partida? No se guarda nada.')) return;
      await borrarEnCurso();
      est = null; resumen = null; vista = 'lobby';
      return pintar();
    }
    if (a === 'otra') { est = null; resumen = null; guardadoId = null; vista = 'lobby'; return pintar(); }
  });

  pintar();
}
