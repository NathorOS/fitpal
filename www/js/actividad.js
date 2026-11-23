// Fase 3 — Agua, peso, pasos y actividad física. Funciones puras arriba, base de datos abajo.

// METs aproximados (Compendium of Physical Activities, valores redondeados).
export const ACTIVIDADES = [
  { id: 'caminar', nombre: 'Caminar', emoji: '🚶', met: 3.5 },
  { id: 'caminar-rapido', nombre: 'Caminata rápida', emoji: '🚶‍♀️', met: 4.3 },
  { id: 'correr', nombre: 'Correr', emoji: '🏃', met: 8.3 },
  { id: 'bici', nombre: 'Bici', emoji: '🚴', met: 7 },
  { id: 'spinning', nombre: 'Spinning', emoji: '🚲', met: 8.5 },
  { id: 'gimnasio', nombre: 'Pesas o gimnasio', emoji: '🏋️', met: 5 },
  { id: 'funcional', nombre: 'Funcional o crossfit', emoji: '🤸', met: 8 },
  { id: 'natacion', nombre: 'Natación', emoji: '🏊', met: 6 },
  { id: 'futbol', nombre: 'Fútbol', emoji: '⚽', met: 7 },
  { id: 'padel', nombre: 'Pádel o tenis', emoji: '🎾', met: 6 },
  { id: 'basquet', nombre: 'Básquet', emoji: '🏀', met: 6.5 },
  { id: 'voley', nombre: 'Vóley', emoji: '🏐', met: 4 },
  { id: 'hockey', nombre: 'Hockey', emoji: '🏑', met: 7.8 },
  { id: 'boxeo', nombre: 'Boxeo', emoji: '🥊', met: 7.8 },
  { id: 'baile', nombre: 'Baile o zumba', emoji: '💃', met: 5.5 },
  { id: 'yoga', nombre: 'Yoga o estiramiento', emoji: '🧘', met: 2.5 },
  { id: 'pilates', nombre: 'Pilates', emoji: '🧘‍♀️', met: 3 },
  { id: 'escaleras', nombre: 'Subir escaleras', emoji: '🪜', met: 8 },
  { id: 'casa', nombre: 'Limpieza o jardín', emoji: '🧹', met: 3.3 },
];

/**
 * Kcal EXTRA de una actividad: (MET − 1) × kg × horas. Se resta 1 MET porque el gasto en reposo
 * ya está dentro de tu meta diaria.
 */
export function kcalActividad(met, kg, minutos) {
  if (!(met > 1 && kg > 0 && minutos > 0)) return 0;
  return Math.round((met - 1) * kg * (minutos / 60));
}

// Pasos que ya se asumen dentro del nivel de actividad del perfil.
export const PASOS_BASE = 5000;

/** Kcal extra por pasos por encima de la base: ~0,04 kcal por paso para 70 kg. */
export function kcalPasos(pasos, kg) {
  const extra = Math.max(0, Number(pasos) - PASOS_BASE);
  return Math.round(extra * 0.04 * (kg / 70));
}

/**
 * Qué parte de lo quemado se suma al presupuesto. Si elegiste un nivel "bastante" o "mucho",
 * tu meta ya cuenta con que entrenás, así que sumamos la mitad para no contar dos veces.
 */
export function factorActividad(nivel) {
  return nivel === 'moderado' || nivel === 'alto' ? 0.5 : 1;
}

/** Kcal que se suman a la meta del día. */
export function kcalExtraDelDia({ actividades = [], pasos = 0, kg, nivel }) {
  const quemadas = actividades.reduce((a, x) => a + (x.kcal || 0), 0) + kcalPasos(pasos, kg);
  return { quemadas, suma: Math.round(quemadas * factorActividad(nivel)) };
}

/** Meta de agua: 35 ml por kg, entre 2 y 3,5 litros, redondeada a vasos de 250 ml. */
export function metaAgua(kg) {
  const ml = Math.min(3500, Math.max(2000, (Number(kg) || 70) * 35));
  return Math.round(ml / 250) * 250;
}

// ---------------------------------------------------------------------------
// Base de datos
// ---------------------------------------------------------------------------
const db = () => import('./db.js');

export async function aguaDelDia(fecha) {
  const { porIndice } = await db();
  return (await porIndice('agua', 'fecha', fecha)).reduce((a, x) => a + x.ml, 0);
}
export async function sumarAgua(fecha, ml = 250) {
  const { guardar } = await db();
  const d = new Date();
  return guardar('agua', { fecha, ml, hora: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` });
}
/** Saca el último vaso del día (para corregir un toque de más). */
export async function quitarAgua(fecha) {
  const { porIndice, borrar } = await db();
  const ult = (await porIndice('agua', 'fecha', fecha)).sort((a, b) => b.id - a.id)[0];
  if (ult) await borrar('agua', ult.id);
}

export async function guardarPeso(fecha, kg) {
  const { guardar } = await db();
  return guardar('peso', { fecha, kg: Math.round(Number(kg) * 10) / 10 });
}
export async function pesos() {
  const { todos } = await db();
  return (await todos('peso')).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function pasosDelDia(fecha) {
  const { obtener } = await db();
  return (await obtener('pasos', fecha))?.pasos ?? 0;
}
export async function guardarPasos(fecha, pasos) {
  const { guardar, borrar } = await db();
  const n = Math.max(0, Math.round(Number(pasos) || 0));
  return n ? guardar('pasos', { fecha, pasos: n }) : borrar('pasos', fecha);
}

export async function actividadesDelDia(fecha) {
  const { porIndice } = await db();
  // Incluye los entrenamientos guiados de la Fase 4.
  return (await porIndice('sesiones', 'fecha', fecha)).filter(s => s.tipo === 'actividad' || s.tipo === 'entrenamiento');
}
export async function guardarActividad({ id, fecha, hora, actividad, minutos, kg }) {
  const { guardar } = await db();
  const a = ACTIVIDADES.find(x => x.id === actividad);
  if (!a) throw new Error('Actividad desconocida');
  const fila = { tipo: 'actividad', fecha, hora, actividad, nombre: a.nombre, emoji: a.emoji, minutos: Number(minutos), kcal: kcalActividad(a.met, kg, minutos) };
  if (id) fila.id = Number(id);
  return guardar('sesiones', fila);
}
export async function borrarActividad(id) {
  const { borrar } = await db();
  return borrar('sesiones', Number(id));
}
