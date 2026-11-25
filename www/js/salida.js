// Modo arcade: salidas con GPS (caminar, correr, bici) convertidas en juego.
// Arriba todo es puro y con tests (tests/salida.test.js): distancia, filtro del GPS, calorías, pasos,
// monedas, combo, niveles, desafíos y fantasma. Abajo, lo que usa la base de datos.

export const MODOS = {
  caminar: {
    id: 'caminar', nombre: 'Caminata', emoji: '🚶', verbo: 'caminar',
    moneda: 100, nivelKm: 1, maxVel: 6, minVel: 0.4, velTipica: 1.3, zancada: 0.415, metas: [0, 1, 2, 3, 5],
  },
  correr: {
    id: 'correr', nombre: 'Carrera', emoji: '🏃', verbo: 'correr',
    moneda: 100, nivelKm: 1, maxVel: 9, minVel: 0.8, velTipica: 2.8, zancada: 0.65, metas: [0, 2, 3, 5, 10],
  },
  bici: {
    id: 'bici', nombre: 'Bici', emoji: '🚴', verbo: 'pedalear',
    moneda: 250, nivelKm: 2, maxVel: 25, minVel: 1.5, velTipica: 4.5, zancada: 0, metas: [0, 5, 10, 15, 20],
  },
};

export const PRECISION_MAX = 35;     // m: puntos con peor precisión se descartan
export const QUIETO_SEG = 12;        // s sin moverte → pausa automática
export const COMBO_MAX = 5;
export const PUNTOS_MONEDA = 10;
export const PUNTOS_NIVEL = 100;
export const PUNTOS_META = 300;

const R = 6371000;
const rad = g => (g * Math.PI) / 180;

/** Distancia en metros entre dos puntos {lat, lon} (fórmula de haversine). */
export function distancia(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * MET según la velocidad real (Compendium of Physical Activities, redondeado).
 * A pie decide la velocidad, no el modo: si en "Caminata" trotás, cuenta como trote.
 */
export function metPorVelocidad(modo, kmh) {
  if (!(kmh > 0)) return 1;
  if (modo === 'bici') return kmh < 10 ? 3.5 : kmh < 16 ? 5.8 : kmh < 19 ? 6.8 : kmh < 22 ? 8 : kmh < 25.5 ? 10 : 12;
  if (kmh < 3.2) return 2;
  if (kmh < 4) return 2.8;
  if (kmh < 5.6) return 3.5;
  if (kmh < 6.4) return 4.3;
  if (kmh < 7.2) return 5;
  if (kmh < 8) return 7;
  if (kmh < 9.7) return 8.3;
  if (kmh < 10.8) return 9.8;
  if (kmh < 12.9) return 11;
  if (kmh < 14.5) return 11.8;
  return 12.8;
}

/** Pasos estimados: el GPS no cuenta pasos, así que se calculan con la distancia y tu altura. */
export function pasosEstimados(metros, modo, alturaCm = 165) {
  const z = MODOS[modo]?.zancada ?? 0;
  if (!z || !(metros > 0)) return 0;
  return Math.round(metros / ((Number(alturaCm) || 165) * z / 100));
}

/** Ritmo en segundos por km (a pie) o null si todavía no hay datos. */
export function ritmo(metros, seg) {
  return metros >= 50 && seg > 0 ? Math.round(seg / (metros / 1000)) : null;
}
export const kmh = (metros, seg) => (seg > 0 ? (metros / seg) * 3.6 : 0);

/** "10:05" para un ritmo en segundos por km. */
export function textoRitmo(s) {
  if (!s || !Number.isFinite(s) || s > 60 * 60) return '--:--';
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
}

/** "1:02:05" o "24:10". */
export function textoTiempo(seg) {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const dd = n => String(n).padStart(2, '0');
  return h ? `${h}:${dd(m)}:${dd(r)}` : `${dd(m)}:${dd(r)}`;
}

// Desafíos relámpago: aparecen cada tanto mientras te movés.
export const PRIMER_DESAFIO = 120;   // s en movimiento
export const ENTRE_DESAFIOS = 240;
export const DESAFIOS = [
  { tipo: 'turbo', titulo: '¡TURBO!', dur: 60, premio: 150 },
  { tipo: 'sinfrenar', titulo: '¡SIN FRENAR!', dur: 180, premio: 120 },
  { tipo: 'monedas', titulo: '¡LLUVIA DE MONEDAS!', dur: 120, premio: 200 },
];

/** Estado inicial de una partida. */
export function nuevaPartida({ modo = 'caminar', kg = 70, alturaCm = 165, metaKm = 0, fantasma = null, ahora = Date.now() } = {}) {
  return {
    modo, kg, alturaCm, metaKm, fantasma, inicio: ahora,
    ruta: [], ultimo: null, metros: 0, segMov: 0, tiempoMs: 0, kcal: 0,
    puntaje: 0, combo: 1, monedas: 0, nivel: 0, metaLograda: false, mitad: false,
    pausaManual: false, pausaAuto: false, quietoDesde: null, tic: ahora,
    marcas: [[0, 0]], desafio: null, desafiosHechos: 0, desafiosTotal: 0, proximoDesafio: PRIMER_DESAFIO,
    delanteFantasma: null, malaSenal: 0,
  };
}

/** Metros del fantasma a los `seg` segundos en movimiento (interpola entre sus marcas). */
export function fantasmaEn(marcas, seg) {
  if (!marcas?.length) return null;
  if (seg <= marcas[0][0]) return marcas[0][1];
  for (let i = 1; i < marcas.length; i++) {
    const [s1, m1] = marcas[i];
    if (seg <= s1) {
      const [s0, m0] = marcas[i - 1];
      return m0 + ((m1 - m0) * (seg - s0)) / (s1 - s0 || 1);
    }
  }
  return marcas.at(-1)[1];           // el fantasma ya terminó: queda quieto en su final
}

function sumarPuntos(est, n) { est.puntaje += Math.round(n); }

function crearDesafio(est, ahora) {
  const d = DESAFIOS[est.desafiosTotal % DESAFIOS.length];
  const m = MODOS[est.modo];
  const vel = est.segMov > 0 ? est.metros / est.segMov : m.velTipica;
  est.desafiosTotal += 1;
  const base = { ...d, desde: est.metros, empezo: ahora, hasta: ahora + d.dur * 1000 };
  // Turbo: recorrer un 20 % más de lo que venías haciendo en ese tiempo
  if (d.tipo === 'turbo') base.meta = Math.max(30, Math.round((vel * d.dur * 1.2) / 10) * 10);
  if (d.tipo === 'monedas') base.meta = 2;                 // 2 monedas en 2 minutos
  if (d.tipo === 'monedas') base.monedasDesde = est.monedas;
  if (d.tipo === 'sinfrenar') base.meta = d.dur;
  est.desafio = base;
  return { tipo: 'desafio', desafio: base };
}

function revisarDesafio(est, ahora, ev) {
  const d = est.desafio;
  if (!d) return;
  let logrado = false;
  if (d.tipo === 'turbo') logrado = est.metros - d.desde >= d.meta;
  if (d.tipo === 'monedas') logrado = est.monedas - d.monedasDesde >= d.meta;
  if (d.tipo === 'sinfrenar') {
    if (est.pausaAuto) { est.desafio = null; est.proximoDesafio = est.segMov + ENTRE_DESAFIOS; ev.push({ tipo: 'desafio-perdido', desafio: d }); return; }
    logrado = ahora >= d.hasta;
  }
  if (logrado) {
    sumarPuntos(est, d.premio * est.combo);
    est.desafiosHechos += 1;
    est.desafio = null;
    est.proximoDesafio = est.segMov + ENTRE_DESAFIOS;
    ev.push({ tipo: 'desafio-logrado', desafio: d, puntos: d.premio * est.combo });
  } else if (ahora >= d.hasta) {
    est.desafio = null;
    est.proximoDesafio = est.segMov + ENTRE_DESAFIOS;
    ev.push({ tipo: 'desafio-perdido', desafio: d });
  }
}

/**
 * Suma un punto del GPS. p = { lat, lon, acc, t } (t en ms). Cambia `est` y devuelve los eventos
 * del juego que pasaron (monedas, niveles, meta, fantasma…), para mostrarlos y hacer ruido.
 */
export function avanzar(est, p) {
  const ev = [];
  if (est.pausaManual) return ev;
  if (!(p.acc <= PRECISION_MAX)) {
    est.malaSenal += 1;
    if (est.malaSenal === 3) ev.push({ tipo: 'senal-mala' });
    return ev;
  }
  if (est.malaSenal >= 3) ev.push({ tipo: 'senal-ok' });
  est.malaSenal = 0;
  const m = MODOS[est.modo];
  if (!est.ultimo) {
    est.ultimo = { lat: p.lat, lon: p.lon, acc: p.acc, t: p.t };
    est.ruta.push([p.lat, p.lon]);
    return ev;
  }
  const dt = (p.t - est.ultimo.t) / 1000;
  if (!(dt > 0)) return ev;
  const d = distancia(est.ultimo, p);
  // Temblor del GPS: no se cuenta hasta que te alejás de verdad del último punto
  const umbral = Math.min(10, Math.max(3, Math.min(p.acc, est.ultimo.acc ?? p.acc) * 0.5));
  if (d < umbral) return ev;
  const vel = d / dt;
  if (vel > m.maxVel) return ev;                 // salto imposible: error del GPS
  const segMas = vel >= m.minVel ? dt : d / m.velTipica;
  const met = metPorVelocidad(est.modo, vel * 3.6);
  est.kcal += Math.max(0, met - 1) * est.kg * (segMas / 3600);
  const antes = est.metros;
  est.metros += d;
  est.segMov += segMas;
  est.ultimo = { lat: p.lat, lon: p.lon, acc: p.acc, t: p.t };
  est.ruta.push([p.lat, p.lon]);
  if (est.pausaAuto) { est.pausaAuto = false; ev.push({ tipo: 'sigue' }); }
  est.quietoDesde = null;

  // Marcas para el fantasma de la próxima vez (una cada ~10 s en movimiento)
  if (est.segMov - est.marcas.at(-1)[0] >= 10) est.marcas.push([Math.round(est.segMov), Math.round(est.metros)]);

  // Monedas y combo
  const monedas = Math.floor(est.metros / m.moneda);
  for (let i = est.monedas; i < monedas; i++) {
    const pts = PUNTOS_MONEDA * est.combo;
    sumarPuntos(est, pts);
    ev.push({ tipo: 'moneda', puntos: pts, combo: est.combo });
    est.combo = Math.min(COMBO_MAX, est.combo + 1);
  }
  est.monedas = monedas;

  // Niveles (1 km a pie, 2 km en bici)
  const nivel = Math.floor(est.metros / (m.nivelKm * 1000));
  for (let n = est.nivel + 1; n <= nivel; n++) {
    sumarPuntos(est, PUNTOS_NIVEL * n);
    ev.push({ tipo: 'nivel', nivel: n, km: n * m.nivelKm, puntos: PUNTOS_NIVEL * n });
  }
  est.nivel = nivel;

  // Meta de km
  if (est.metaKm > 0) {
    const meta = est.metaKm * 1000;
    if (!est.mitad && antes < meta / 2 && est.metros >= meta / 2) { est.mitad = true; ev.push({ tipo: 'mitad' }); }
    if (!est.metaLograda && est.metros >= meta) {
      est.metaLograda = true;
      sumarPuntos(est, PUNTOS_META);
      ev.push({ tipo: 'meta', puntos: PUNTOS_META });
    }
  }

  // Fantasma: tu mejor salida anterior, al mismo tiempo en movimiento
  if (est.fantasma?.marcas?.length && est.segMov >= 30) {
    const delante = est.metros >= fantasmaEn(est.fantasma.marcas, est.segMov);
    if (est.delanteFantasma !== null && delante !== est.delanteFantasma) ev.push({ tipo: delante ? 'pasaste-fantasma' : 'te-paso-fantasma' });
    est.delanteFantasma = delante;
  }

  revisarDesafio(est, p.t, ev);
  return ev;
}

/**
 * Se llama cada segundo: suma el tiempo, detecta la pausa automática y lanza o cierra desafíos.
 */
export function tic(est, ahora) {
  const ev = [];
  const dt = Math.max(0, ahora - est.tic);
  est.tic = ahora;
  if (est.pausaManual) return ev;
  est.tiempoMs += dt;
  if (est.ultimo && !est.pausaAuto && (ahora - est.ultimo.t) / 1000 >= QUIETO_SEG) {
    est.pausaAuto = true;
    est.quietoDesde = est.ultimo.t;
    ev.push({ tipo: 'pausa-auto' });
  }
  // Quedarte quieto más de 30 s corta el combo
  if (est.pausaAuto && est.combo > 1 && (ahora - est.quietoDesde) / 1000 >= 30) {
    est.combo = 1;
    ev.push({ tipo: 'combo-perdido' });
  }
  revisarDesafio(est, ahora, ev);
  if (!est.desafio && !est.pausaAuto && est.ultimo && est.segMov >= est.proximoDesafio) ev.push(crearDesafio(est, ahora));
  return ev;
}

/** Pausa o sigue a mano. Al seguir, el próximo punto arranca de cero (no se cuenta lo que te moviste en pausa). */
export function pausar(est, si, ahora = Date.now()) {
  est.pausaManual = si;
  est.tic = ahora;
  if (!si) { est.ultimo = null; est.pausaAuto = false; }
  if (si) est.desafio = null;
}

/** Saca puntos casi en línea recta para guardar la ruta más liviana (Douglas–Peucker simple, en metros). */
export function simplificar(ruta, tolerancia = 4) {
  if (ruta.length <= 2) return ruta.slice();
  const lat0 = rad(ruta[0][0]);
  const xy = ruta.map(([la, lo]) => [rad(lo) * R * Math.cos(lat0), rad(la) * R]);
  const quedan = new Uint8Array(ruta.length);
  quedan[0] = quedan[ruta.length - 1] = 1;
  const pila = [[0, ruta.length - 1]];
  while (pila.length) {
    const [a, b] = pila.pop();
    const [ax, ay] = xy[a], [bx, by] = xy[b];
    const L = Math.hypot(bx - ax, by - ay) || 1;
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const dd = Math.abs((bx - ax) * (ay - xy[i][1]) - (ax - xy[i][0]) * (by - ay)) / L;
      if (dd > max) { max = dd; idx = i; }
    }
    if (max > tolerancia) { quedan[idx] = 1; pila.push([a, idx], [idx, b]); }
  }
  return ruta.filter((_, i) => quedan[i]).map(([la, lo]) => [Math.round(la * 1e6) / 1e6, Math.round(lo * 1e6) / 1e6]);
}

/** Estrellas de la partida (0 a 3). */
export function estrellas(est) {
  if (est.metros < 200) return 0;
  const m = MODOS[est.modo];
  let n = 1;
  if (est.metaKm > 0 ? est.metaLograda : est.metros >= m.nivelKm * 1000) n += 1;
  if (est.desafiosHechos >= 2 || (est.fantasma && est.delanteFantasma)) n += 1;
  return n;
}

/** Resumen final de la partida y récords nuevos contra las salidas anteriores del mismo modo. */
export function resumenFinal(est, anteriores = []) {
  const m = MODOS[est.modo];
  const seg = est.segMov;
  const previas = anteriores.filter(s => s.modo === est.modo);
  const r = {
    modo: est.modo, km: Math.round(est.metros) / 1000, metros: Math.round(est.metros),
    segMov: Math.round(seg), minutos: Math.max(1, Math.round(seg / 60)), tiempo: Math.round(est.tiempoMs / 1000),
    ritmo: ritmo(est.metros, seg), kmh: Math.round(kmh(est.metros, seg) * 10) / 10,
    kcal: Math.round(est.kcal), pasos: pasosEstimados(est.metros, est.modo, est.alturaCm),
    puntaje: est.puntaje, monedas: est.monedas, desafios: est.desafiosHechos, desafiosTotal: est.desafiosTotal,
    estrellas: estrellas(est), metaKm: est.metaKm, metaLograda: est.metaLograda,
    fantasma: est.fantasma ? { ganaste: Boolean(est.delanteFantasma), diferencia: Math.round(est.metros - fantasmaEn(est.fantasma.marcas, seg)) } : null,
    records: [],
  };
  if (est.metros >= 200) {
    const max = k => previas.reduce((a, s) => Math.max(a, s[k] ?? 0), 0);
    if (previas.length && r.puntaje > max('puntaje')) r.records.push('puntaje');
    if (previas.length && r.km > max('km')) r.records.push('distancia');
    const conRitmo = previas.filter(s => s.km >= 0.5 && s.ritmo);
    if (r.km >= 0.5 && r.ritmo && conRitmo.length && r.ritmo < Math.min(...conRitmo.map(s => s.ritmo))) r.records.push(m.id === 'bici' ? 'velocidad' : 'ritmo');
  }
  return r;
}

/** Elige el fantasma: tu salida más rápida del mismo modo de al menos 500 m. */
export function elegirFantasma(salidas, modo) {
  const ok = salidas.filter(s => s.modo === modo && s.km >= 0.5 && s.marcas?.length > 2 && s.segMov > 0);
  if (!ok.length) return null;
  const mejor = ok.reduce((a, s) => (s.km * 1000 / s.segMov > a.km * 1000 / a.segMov ? s : a));
  return { id: mejor.id, fecha: mejor.fecha, km: mejor.km, ritmo: mejor.ritmo, kmh: mejor.kmh, marcas: mejor.marcas };
}

/** La fila que se guarda en `sesiones` (cuenta como actividad del día). */
export function filaSalida(est, r, { fecha, hora }) {
  const m = MODOS[est.modo];
  const km = r.km.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  return {
    tipo: 'actividad', fuente: 'gps', fecha, hora, actividad: est.modo === 'bici' ? 'bici' : est.modo,
    modo: est.modo, nombre: `${m.nombre} ${km} km`, emoji: m.emoji,
    minutos: r.minutos, kcal: r.kcal, km: r.km, segMov: r.segMov, ritmo: r.ritmo, kmh: r.kmh, pasos: r.pasos,
    puntaje: r.puntaje, estrellas: r.estrellas, monedas: r.monedas, desafios: r.desafios,
    ruta: simplificar(est.ruta), marcas: est.marcas,
  };
}

// Lo que dice la voz. Corto, para escucharlo con el teléfono en la mano.
const ANIMO = {
  carinoso: ['¡Vas re bien!', '¡Qué orgullo!', 'Seguí así, de a poquito.'],
  directo: ['Bien. Seguí.', 'No aflojes.', 'Eso es.'],
  divertido: ['¡Sos una máquina!', '¡Ni el colectivo te alcanza!', '¡Fuego en las zapatillas!'],
  tranqui: ['Tranqui, a tu ritmo.', 'Respirá y seguí.', 'Muy bien, sin apuro.'],
};
export function fraseVoz(e, est, personalidad = 'directo', azar = Math.random) {
  const a = ANIMO[personalidad] ?? ANIMO.directo;
  const extra = a[Math.floor(azar() * a.length)];
  const m = MODOS[est.modo];
  const r = ritmo(est.metros, est.segMov);
  const min = Math.round(est.segMov / 60);
  const como = est.modo === 'bici' ? `a ${Math.round(kmh(est.metros, est.segMov))} kilómetros por hora` : r ? `a ${textoRitmo(r).replace(':', ' con ')} el kilómetro` : '';
  switch (e.tipo) {
    case 'nivel': return `¡Nivel ${e.nivel}! ${e.km} ${e.km === 1 ? 'kilómetro' : 'kilómetros'} en ${min} minutos, ${como}. ${extra}`;
    case 'mitad': return `Mitad del camino. ${extra}`;
    case 'meta': return `¡Meta cumplida! ${est.metaKm} kilómetros. ${extra}`;
    case 'desafio': return {
      turbo: `¡Turbo! Hacé ${e.desafio.meta} metros en un minuto.`,
      sinfrenar: `¡Sin frenar! Tres minutos sin parar.`,
      monedas: `¡Lluvia de monedas! Agarrá dos monedas en dos minutos.`,
    }[e.desafio.tipo];
    case 'desafio-logrado': return `¡Desafío superado! Más ${e.puntos} puntos.`;
    case 'desafio-perdido': return 'Desafío perdido. Ya viene otro.';
    case 'pasaste-fantasma': return '¡Pasaste a tu fantasma!';
    case 'te-paso-fantasma': return `Tu fantasma te pasó. ¡A ${m.verbo}!`;
    case 'combo-perdido': return 'Se cortó el combo.';
    case 'senal-mala': return 'Perdí la señal del GPS. Sigo buscando.';
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Con base de datos (navegador)
// ---------------------------------------------------------------------------
const db = () => import('./db.js');
const CLAVE_EN_CURSO = 'salida_en_curso';
const CLAVE_AJUSTES = 'salida_ajustes';

/** Salidas con GPS guardadas, de la más nueva a la más vieja. */
export async function salidas() {
  const { todos } = await db();
  return (await todos('sesiones')).filter(s => s.fuente === 'gps')
    .sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
}

export async function guardarSalida(est, r, ahora = new Date()) {
  const { guardar, hoy } = await db();
  const hora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  const id = await guardar('sesiones', filaSalida(est, r, { fecha: hoy(), hora }));
  await borrarEnCurso();
  return id;
}

export async function borrarSalida(id) {
  const { borrar } = await db();
  return borrar('sesiones', Number(id));
}

export async function guardarEnCurso(est) {
  const { guardar } = await db();
  return guardar('config', { clave: CLAVE_EN_CURSO, valor: est, guardado: Date.now() });
}
export async function enCurso() {
  const { obtener } = await db();
  return (await obtener('config', CLAVE_EN_CURSO))?.valor ?? null;
}
export async function borrarEnCurso() {
  const { borrar } = await db();
  return borrar('config', CLAVE_EN_CURSO);
}

const AJUSTES_BASE = { modo: 'caminar', metaKm: 0, sonido: true, voz: true };
export async function ajustes() {
  const { obtener } = await db();
  return { ...AJUSTES_BASE, ...((await obtener('config', CLAVE_AJUSTES))?.valor ?? {}) };
}
export async function guardarAjustes(a) {
  const { guardar } = await db();
  return guardar('config', { clave: CLAVE_AJUSTES, valor: { ...AJUSTES_BASE, ...a } });
}
