// Cómo se ve el personaje: etapa (cuerpo), pose del día y limpieza. Funciones puras: reciben los datos ya
// leídos. Las reglas están explicadas en docs/personaje/ENCARGO-PERSONAJE.md (§2 y §6).
import { fechaLocal, ultimosDias, racha } from './estadisticas.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const imc = (kg, cm) => (kg > 0 && cm > 0 ? kg / (cm / 100) ** 2 : null);

// ---------------------------------------------------------------------------
// Etapa
// ---------------------------------------------------------------------------
export const CORTES = { e3: 0.34, e5: 0.75 };
export const HISTERESIS = 0.08;

/** Posición de arranque (0 = lo más gordo, 1 = en la meta) según el IMC inicial. Nunca más de 0,5. */
export function pInicial(pesoKg, alturaCm) {
  const i = imc(Number(pesoKg), Number(alturaCm));
  return i == null ? 0 : clamp((35 - i) / 10, 0, 0.5);
}

/** Posición actual entre 0 y 1. */
export function posicion({ pInicial: p0 = 0, pesoInicial, pesoActual, pesoMeta }) {
  const tramo = pesoInicial - pesoMeta;
  const avance = tramo > 0 ? clamp((pesoInicial - pesoActual) / tramo, 0, 1) : 0;
  return p0 + (1 - p0) * avance;
}

/**
 * Etapa del cuerpo: 'e1' | 'e3' | 'e5'.
 * etapaAnterior evita que titile: para volver a una etapa más gorda hay que bajar 0,08 del corte.
 */
export function etapaDe({ objetivo, pInicial: p0, pesoInicial, pesoActual, pesoMeta, alturaCm, etapaAnterior = null }) {
  if (objetivo === 'mantener' || !(pesoMeta > 0)) {
    if ((imc(pesoActual, alturaCm) ?? 0) >= 35) return 'e1';
    if (!(pesoMeta > 0)) return 'e5';
    return Math.abs(pesoActual - pesoMeta) <= 2 ? 'e5' : 'e3';
  }
  const p = posicion({ pInicial: p0, pesoInicial, pesoActual, pesoMeta });
  let etapa = p >= CORTES.e5 ? 'e5' : p >= CORTES.e3 ? 'e3' : 'e1';
  // Histéresis: solo para retroceder
  const orden = ['e1', 'e3', 'e5'];
  if (etapaAnterior && orden.indexOf(etapa) < orden.indexOf(etapaAnterior)) {
    const corte = etapaAnterior === 'e5' ? CORTES.e5 : CORTES.e3;
    if (p > corte - HISTERESIS) etapa = etapaAnterior;
  }
  return etapa;
}

/** Peso de tendencia (media móvil exponencial, igual que el gráfico). pesos: [{fecha, kg}] */
export function pesoTendencia(pesos, alpha = 0.2) {
  let s = null;
  for (const p of [...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha))) s = s === null ? p.kg : alpha * p.kg + (1 - alpha) * s;
  return s;
}

// ---------------------------------------------------------------------------
// Pose del día
// ---------------------------------------------------------------------------
export const POSES = ['contento', 'fiaca', 'empachado', 'entrenando', 'festejando'];
export const POSES_EXTRA = ['durmiendo', 'tomando-agua', 'pesandose', 'saludando', 'con-un-trofeo', 'triste', 'bailando'];
/** Las poses extra existen solo en etapa 3: en e1 y e5 se usa la normal más parecida. */
export const POSE_CERCANA = {
  durmiendo: 'fiaca', 'tomando-agua': 'contento', pesandose: 'contento', saludando: 'contento',
  'con-un-trofeo': 'festejando', triste: 'fiaca', bailando: 'festejando',
};
/** Hasta tener su dibujo durmiendo: en e1 con los ojos cerrados (no sentado con el celular). Hoy le suma las "Z". */
const DURMIENDO_SIN_DIBUJO = { e1: 'ojos-cerrados', e5: 'contento' };

/**
 * d: { hora, comidasHoy, kcal, kcalMeta, actividadHoy (bool), festejo (bool), ayunoEnCurso (bool), rachaCortada (bool) }
 * Orden: festejando › empachado › entrenando › fiaca › contento (+ durmiendo y triste).
 */
export function poseDelDia(d) {
  if (d.festejo) return 'festejando';
  if (d.kcalMeta > 0 && d.kcal > d.kcalMeta * 1.15) return 'empachado';
  if (d.actividadHoy) return 'entrenando';
  if (d.ayunoEnCurso && (d.hora >= 22 || d.hora < 7)) return 'durmiendo';
  if (d.rachaCortada && !d.comidasHoy) return 'triste';
  if (d.hora >= 14 && !d.comidasHoy) return 'fiaca';
  return 'contento';
}

// ---------------------------------------------------------------------------
// Limpieza (0–100)
// ---------------------------------------------------------------------------
export const LIMPIEZA_INICIAL = 50;

/** Puntos de un día: 50 por anotar comidas, 25 por el agua y 25 por moverse. */
export const puntosDelDia = ({ comidas, agua, actividad }) => (comidas ? 50 : 0) + (agua ? 25 : 0) + (actividad ? 25 : 0);

/**
 * Limpieza de hoy recorriendo el historial día por día desde el primer día con datos (máximo 60 días atrás).
 * porDia(fecha) → { comidas, agua, actividad } (bool). Sube como mucho 10 y baja como mucho 15 por día.
 */
export function limpieza(porDia, { hoy = new Date(), desde = null, dias = 60 } = {}) {
  const fechas = ultimosDias(dias, hoy).filter(f => !desde || f >= desde);
  let valor = LIMPIEZA_INICIAL;
  const historia = [];
  for (const f of fechas) {
    historia.push(puntosDelDia(porDia(f)));
    const ult = historia.slice(-7);
    // Promedio ponderado: el día más reciente pesa más (1..7)
    const suma = ult.reduce((a, p, i) => a + p * (i + 1), 0);
    const pesos = (ult.length * (ult.length + 1)) / 2;
    const objetivo = suma / pesos;
    valor = clamp(valor + clamp(objetivo - valor, -15, 10), 0, 100);
  }
  return Math.round(valor);
}

export const nivelLimpieza = l => (l < 34 ? 'desastre' : l < 67 ? 'normal' : 'ordenado');

// ---------------------------------------------------------------------------
// Archivos
// ---------------------------------------------------------------------------
const CON_LIMPIO = ['contento', 'entrenando', 'festejando'];

/** Nombre del archivo del personaje (sin carpeta ni extensión). */
export function archivoPersonaje({ etapa = 'e3', pose = 'contento', limpieza: l = LIMPIEZA_INICIAL }) {
  let p = pose;
  if (p === 'durmiendo' && DURMIENDO_SIN_DIBUJO[etapa]) return `${etapa}-${DURMIENDO_SIN_DIBUJO[etapa]}`;
  if (POSES_EXTRA.includes(p) && etapa !== 'e3') p = POSE_CERCANA[p];
  if (!POSES.includes(p) && !POSES_EXTRA.includes(p)) p = 'contento';
  const limpio = l >= 67 && etapa !== 'e1' && CON_LIMPIO.includes(p);
  return `${etapa}-${p}${limpio ? '-limpio' : ''}`;
}

/** Cuarto según limpieza y hora. El cuarto normal no tiene versión de noche. */
export function archivoCuarto(l, noche) {
  const n = nivelLimpieza(l);
  return noche && n !== 'normal' ? `cuarto-${n}-noche` : `cuarto-${n}`;
}

/** Objetos sueltos del cuarto (máximo 4), elegidos de forma fija por día para que no cambien al recargar. */
export function objetosDelCuarto(l, semilla = 0) {
  const n = nivelLimpieza(l);
  const grupos = {
    desastre: ['vicio-cerveza', 'vicio-pizza', 'vicio-cenicero', 'vicio-papas', 'vicio-fernet', 'vicio-gaseosa', 'vicio-choripan'],
    normal: ['sano-mate', 'vicio-alfajores', 'sano-banana', 'sano-agua'],
    ordenado: ['sano-agua', 'sano-ensalada', 'sano-mancuerna', 'sano-zapatillas', 'sano-manzana', 'sano-toalla'],
  }[n];
  const cuantos = n === 'normal' ? 2 : 3;
  const out = [];
  for (let i = 0; out.length < cuantos; i++) out.push(grupos[(semilla + i * 3) % grupos.length]);
  return [...new Set(out)];
}

// ---------------------------------------------------------------------------
// Juego: racha, hitos, premios y cofre
// ---------------------------------------------------------------------------
export const RACHAS = [3, 7, 14, 30];
/** Insignia de racha que corresponde (o null). */
export const insigniaRacha = n => [...RACHAS].reverse().find(r => n >= r) ?? null;

export const HITOS_KG = [1, 5, 10, 15, 20];

/**
 * Logros que corresponden con los datos de hoy. Devuelve ids (los mismos nombres que las imágenes de insignias).
 * d: { pesoInicial, pesoTend, pesoMeta, mejorPeso, rachaActual, retosHechos: [ids], comidas, sesiones, fotos, aguaTotalMl, diasConComida }
 */
export function logrosQueCorresponden(d) {
  const ids = [];
  const bajado = d.pesoInicial && d.pesoTend ? d.pesoInicial - d.pesoTend : 0;
  for (const k of HITOS_KG) if (bajado >= k) ids.push(`hito-${k}kg`);
  if (d.pesoMeta > 0) ids.push('hito-meta');                                     // se puso una meta
  if (d.pesoMeta && d.pesoTend && d.pesoInicial > d.pesoMeta && d.pesoTend <= d.pesoMeta) ids.push('hito-llegada');
  if (d.objetivo === 'mantener' && d.diasConComida >= 30) ids.push('hito-mantener');
  for (const r of RACHAS) if (d.rachaActual >= r) ids.push(`racha-${r}`);
  for (const id of d.retosHechos ?? []) ids.push(`reto-${id}`);
  if (d.comidas > 0) ids.push('logro-primera-comida');
  if (d.fotos > 0) ids.push('logro-primera-foto');
  if (d.sesiones > 0) ids.push('logro-primer-entreno');
  if (d.aguaTotalMl >= 100000) ids.push('logro-agua100');
  if (d.diasConComida >= 7) ids.push('logro-primera-semana');
  if (d.diasConComida >= 30) ids.push('logro-30-dias');
  if (d.rachaActual >= 30) ids.push('logro-racha30');
  return ids;
}

/** Premios del cuarto, en el orden en que se desbloquean. Cada uno tiene su lugar fijo (x, y en %, ancho en %). */
export const PREMIOS = [
  { id: 'premio-planta', x: 4, y: 52, w: 12 },
  { id: 'premio-poster', x: 70, y: 12, w: 14 },
  { id: 'premio-mate-oro', x: 84, y: 64, w: 9 },
  { id: 'premio-zapatillas', x: 6, y: 80, w: 12 },
  { id: 'premio-trofeos', x: 80, y: 38, w: 14 },
  { id: 'premio-balanza', x: 22, y: 82, w: 11 },
  { id: 'premio-rack', x: 0, y: 30, w: 16 },
  { id: 'premio-bici', x: 84, y: 70, w: 16 },
  { id: 'premio-cinta', x: 66, y: 74, w: 18 },
];

/**
 * Cuántos premios ganó: uno por cada hito de peso o de racha conseguido, y uno por cada cofre abierto.
 * Nunca se pierden: se cuentan desde los logros guardados.
 */
export function premiosGanados(logros) {
  const n = logros.filter(l => /^(hito-\d+kg|hito-llegada|racha-)/.test(l.id) || l.id.startsWith('cofre-')).length;
  return PREMIOS.slice(0, Math.min(PREMIOS.length, n));
}

/** El cofre de la semana: se abre el domingo (o después) si se cumplieron 4 retos semanales o más. */
export const cofreDisponible = ({ retosSemanalesHechos, esDomingo }) => esDomingo && retosSemanalesHechos >= 4;

/** ¿Se cortó la racha? (ayer no anotó nada, pero antes de ayer sí) */
export function rachaCortada(fechasConComida, hoy = new Date()) {
  const set = new Set(fechasConComida);
  const d = n => fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - n));
  return !set.has(d(1)) && set.has(d(2));
}

export { racha };
