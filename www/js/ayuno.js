// Fase 5 — Ayuno intermitente. Funciones puras arriba, base de datos abajo.
// Un ayuno: { id, inicio: ISO, fin: ISO | null, meta_h }. Solo puede haber uno en curso.

export const PROTOCOLOS = [
  { horas: 12, nombre: '12:12', sub: 'Para empezar' },
  { horas: 14, nombre: '14:10', sub: 'El más elegido', recomendado: true },
  { horas: 16, nombre: '16:8', sub: 'Clásico' },
  { horas: 18, nombre: '18:6', sub: 'Si ya tenés experiencia' },
];
export const META_MAXIMA_H = 18;   // no proponemos ayunos más largos

/** Horas transcurridas (con decimales) entre inicio y fin (o ahora). */
export function horasDe(ayuno, ahora = new Date()) {
  const fin = ayuno.fin ? new Date(ayuno.fin) : ahora;
  return Math.max(0, (fin - new Date(ayuno.inicio)) / 3600000);
}

/** "13:05:09" */
export function reloj(horas) {
  const s = Math.floor(horas * 3600);
  const z = n => String(n).padStart(2, '0');
  return `${z(Math.floor(s / 3600))}:${z(Math.floor((s % 3600) / 60))}:${z(s % 60)}`;
}

/** Progreso 0..1 y si se cumplió la meta. */
export function progresoAyuno(ayuno, ahora = new Date()) {
  const h = horasDe(ayuno, ahora);
  return { horas: h, pct: Math.min(1, h / ayuno.meta_h), cumplido: h >= ayuno.meta_h };
}

/**
 * Valida el inicio elegido: no en el futuro y no más de 24 h atrás
 * (para poder decir "empecé anoche" sin cargar cualquier cosa).
 */
export function validarInicio(inicio, ahora = new Date()) {
  const t = new Date(inicio);
  if (Number.isNaN(t.getTime())) return 'Elegí una hora válida.';
  if (t > ahora) return 'El ayuno no puede empezar en el futuro.';
  if (ahora - t > 24 * 3600000) return 'Podés empezarlo hasta 24 horas atrás.';
  return null;
}

/** Fecha y hora de la última comida anotada (o null). */
export function ultimaComida(comidas) {
  const ord = [...comidas].sort((a, b) => `${b.fecha}T${b.hora}`.localeCompare(`${a.fecha}T${a.hora}`));
  return ord.length ? new Date(`${ord[0].fecha}T${ord[0].hora}`) : null;
}

// ---------------------------------------------------------------------------
const db = () => import('./db.js');

export async function ayunoEnCurso() {
  const { todos } = await db();
  return (await todos('ayuno')).find(a => !a.fin) ?? null;
}
export async function ayunos() {
  const { todos } = await db();
  return (await todos('ayuno')).sort((a, b) => b.inicio.localeCompare(a.inicio));
}
export async function empezarAyuno({ inicio, meta_h }) {
  const { guardar } = await db();
  if (await ayunoEnCurso()) throw new Error('Ya hay un ayuno en curso');
  return guardar('ayuno', { inicio: new Date(inicio).toISOString(), fin: null, meta_h: Math.min(META_MAXIMA_H, Number(meta_h)) });
}
export async function editarAyuno(id, cambios) {
  const { obtener, guardar } = await db();
  const a = await obtener('ayuno', Number(id));
  if (!a) return;
  return guardar('ayuno', { ...a, ...cambios });
}
export async function terminarAyuno(id, fin = new Date()) {
  return editarAyuno(id, { fin: new Date(fin).toISOString() });
}
export async function borrarAyuno(id) {
  const { borrar } = await db();
  return borrar('ayuno', Number(id));
}
export async function metaAyunoPreferida() {
  const { obtener } = await db();
  return (await obtener('config', 'ayuno_meta'))?.valor ?? 14;
}
export async function guardarMetaAyuno(h) {
  const { guardar } = await db();
  return guardar('config', { clave: 'ayuno_meta', valor: Number(h) });
}
