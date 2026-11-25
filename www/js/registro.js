// Fase 2 — Registro de comidas: búsqueda, cantidades, totales y guardado.
// Las funciones puras se prueban en tests/registro.test.js; las de base de datos usan db.js.
import { ALIMENTOS_BASE } from './datos/alimentos.js';

export const MOMENTOS = [
  { id: 'desayuno', nombre: 'Desayuno', emoji: '☕', icono: 'desayuno' },
  { id: 'almuerzo', nombre: 'Almuerzo', emoji: '🍽️', icono: 'almuerzo' },
  { id: 'merienda', nombre: 'Merienda', emoji: '🧉', icono: 'merienda' },
  { id: 'cena', nombre: 'Cena', emoji: '🌙', icono: 'cena' },
  { id: 'colacion', nombre: 'Colación', emoji: '🍎', icono: 'snack' },
];

/** Momento del día según la hora (0–23). */
export function momentoPorHora(h) {
  if (h >= 5 && h < 11) return 'desayuno';
  if (h >= 11 && h < 15) return 'almuerzo';
  if (h >= 15 && h < 19) return 'merienda';
  if (h >= 19) return 'cena';
  return 'colacion';
}

/** minúsculas, sin tildes ni diéresis (ñ queda como n). */
export function normalizar(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/**
 * Busca en una lista de alimentos. Todas las palabras tienen que aparecer (en el nombre o en
 * los sinónimos). Ordena: empieza igual > alguna palabra empieza igual > contiene.
 */
// Palabras que no ayudan a buscar ("tostada CON manteca", "milanesa DE pollo"). "sin" no va: cambia el sentido.
const VACIAS = new Set(['de', 'del', 'con', 'la', 'el', 'los', 'las', 'y', 'a', 'al', 'en', 'un', 'una', 'unos', 'unas']);
// Singular aproximado: "tostadas" → "tostada", "flanes" → "flan" (solo palabras largas, para no romper "mate", "te").
const singular = p => (p.length > 4 ? p.replace(/(es|s)$/, '') : p);

export function buscar(texto, lista, limite = 40) {
  const todas = normalizar(texto).split(/\s+/).filter(Boolean);
  const utiles = todas.filter(p => !VACIAS.has(p));
  const palabras = (utiles.length ? utiles : todas).map(singular);
  if (!palabras.length) return [];
  const res = [];
  for (const a of lista) {
    const nombre = normalizar(a.nombre);
    const todo = `${nombre} ${normalizar(a.sinonimos)}`;
    if (!palabras.every(p => todo.includes(p))) continue;
    const q = palabras.join(' ');
    let puntaje = 0;
    if (nombre.startsWith(q)) puntaje += 4;
    if (nombre.split(/\s+/).some(w => w.startsWith(palabras[0]))) puntaje += 2;
    if (nombre.includes(q)) puntaje += 1;
    if (a.propio) puntaje += 0.5;
    res.push([puntaje, a]);
  }
  return res
    .sort((x, y) => y[0] - x[0] || x[1].nombre.length - y[1].nombre.length)
    .slice(0, limite)
    .map(r => r[1]);
}

const r1 = n => Math.round(n * 10) / 10;

/**
 * Calcula un ítem a partir del alimento y la cantidad.
 * unidad: 'porcion' (cantidad = cuántas porciones, porcionIdx = cuál) o 'g' (cantidad = gramos).
 */
export function calcularItem(alimento, { cantidad = 1, unidad = 'porcion', porcionIdx = 0 } = {}) {
  const porcion = alimento.porciones?.[porcionIdx] ?? alimento.porciones?.[0] ?? { nombre: 'porción', g: 100 };
  const g = unidad === 'g' ? cantidad : cantidad * porcion.g;
  const f = g / 100;
  const p = alimento.por100;
  return {
    alimentoId: alimento.id, nombre: alimento.nombre, emoji: alimento.emoji || '🍽️',
    cantidad, unidad, porcionIdx: unidad === 'g' ? null : porcionIdx,
    porcion: unidad === 'g' ? null : porcion.nombre,
    g: r1(g),
    kcal: Math.round(p.kcal * f), prot: r1(p.prot * f), carb: r1(p.carb * f),
    grasa: r1(p.grasa * f), fibra: r1((p.fibra ?? 0) * f),
  };
}

/** Ítem "rápido": solo calorías (y macros si se saben), sin alimento de la base. */
export function itemRapido({ nombre, kcal, prot = 0, carb = 0, grasa = 0 }) {
  return {
    alimentoId: null, nombre: String(nombre || '').trim() || 'Registro rápido', emoji: '⚡',
    cantidad: 1, unidad: 'rapido', porcionIdx: null, porcion: null, g: null,
    kcal: Math.round(Number(kcal) || 0), prot: r1(Number(prot) || 0), carb: r1(Number(carb) || 0),
    grasa: r1(Number(grasa) || 0), fibra: 0,
  };
}

/** Texto corto de la cantidad: "2 mila mediana", "1,5 unidad", "120 g". */
export function textoCantidad(it) {
  const n = Number(it.cantidad).toLocaleString('es-AR', { maximumFractionDigits: 1 });
  if (it.unidad === 'g') return `${n} g`;
  if (it.unidad === 'rapido') return 'rápido';
  return `${n} ${it.porcion}`;
}

/** Suma de nutrientes de una lista de ítems (o de comidas con .items). */
export function sumar(lista) {
  const t = { kcal: 0, prot: 0, carb: 0, grasa: 0, fibra: 0 };
  for (const x of lista) {
    const fuente = x.items ? sumar(x.items) : x;
    for (const k of Object.keys(t)) t[k] += Number(fuente[k]) || 0;
  }
  t.kcal = Math.round(t.kcal);
  for (const k of ['prot', 'carb', 'grasa', 'fibra']) t[k] = r1(t[k]);
  return t;
}

/** Alimento propio a partir de lo que carga el usuario POR PORCIÓN. */
export function armarAlimentoPropio({ nombre, porcion = 'porción', g = 100, kcal, prot = 0, carb = 0, grasa = 0 }) {
  const gramos = Number(g) > 0 ? Number(g) : 100;
  const f = 100 / gramos;
  return {
    nombre: String(nombre).trim(), emoji: '🍽️', propio: true, sinonimos: '',
    porciones: [{ nombre: String(porcion || 'porción').trim(), g: gramos }],
    por100: {
      kcal: r1(Number(kcal) * f), prot: r1(Number(prot) * f), carb: r1(Number(carb) * f),
      grasa: r1(Number(grasa) * f), fibra: 0,
    },
  };
}

/**
 * Lo que calculó la IA y no estaba en la base queda como alimento propio, para encontrarlo la próxima
 * vez. Devuelve los alimentos a crear (sin repetir nombres que ya existan, propios o de la base).
 */
export function alimentosAprendidos(items, existentes = []) {
  const nombres = new Set(existentes.map(a => normalizar(a.nombre)));
  const nuevos = [];
  for (const it of items ?? []) {
    if (it?.fuente !== 'ia' || !(Number(it.g) > 0) || !String(it.nombre ?? '').trim()) continue;
    const n = normalizar(it.nombre);
    if (nombres.has(n)) continue;
    nombres.add(n);
    nuevos.push({
      ...armarAlimentoPropio({ nombre: it.nombre, porcion: 'porción', g: it.g, kcal: it.kcal, prot: it.prot, carb: it.carb, grasa: it.grasa }),
      emoji: '✨', origen: 'ia',
    });
  }
  return nuevos;
}

// ---------------------------------------------------------------------------
// Con base de datos (navegador)
// ---------------------------------------------------------------------------
const db = () => import('./db.js');
const propioAId = a => ({ ...a, id: `p:${a.id}`, _clave: a.id });

export async function alimentosPropios() {
  const { todos } = await db();
  return (await todos('alimentos')).map(propioAId);
}

export async function todosLosAlimentos() {
  return [...(await alimentosPropios()), ...ALIMENTOS_BASE];
}

export async function obtenerAlimento(id) {
  if (!id) return null;
  if (id.startsWith('b:')) return ALIMENTOS_BASE.find(a => a.id === id) ?? null;
  const { obtener } = await db();
  const a = await obtener('alimentos', Number(id.slice(2)));
  return a ? propioAId(a) : null;
}

export async function guardarAlimentoPropio(datos) {
  const { guardar } = await db();
  const id = await guardar('alimentos', armarAlimentoPropio(datos));
  return `p:${id}`;
}

/** Guarda como alimentos propios lo que la IA calculó y no estaba en la base. Devuelve cuántos guardó. */
export async function aprenderDeIA(items) {
  const { guardar } = await db();
  const nuevos = alimentosAprendidos(items, [...ALIMENTOS_BASE, ...(await alimentosPropios())]);
  for (const a of nuevos) await guardar('alimentos', a);
  return nuevos.length;
}

export async function favoritos() {
  const { todos } = await db();
  return (await todos('favoritos')).map(f => f.id);
}

export async function alternarFavorito(alimentoId) {
  const { obtener, guardar, borrar } = await db();
  if (await obtener('favoritos', alimentoId)) { await borrar('favoritos', alimentoId); return false; }
  await guardar('favoritos', { id: alimentoId, desde: new Date().toISOString() });
  return true;
}

/** Comidas de un día, ordenadas por hora. */
export async function comidasDelDia(fecha) {
  const { porIndice } = await db();
  return (await porIndice('registro', 'fecha', fecha)).sort((a, b) => a.hora.localeCompare(b.hora));
}

export async function obtenerComida(id) {
  const { obtener } = await db();
  return obtener('registro', Number(id));
}

/** Guarda (o reemplaza, si trae id) una comida con sus ítems. */
export async function guardarComida({ id, fecha, hora, momento, items, foto = null }) {
  if (!items?.length) throw new Error('La comida no tiene alimentos');
  const { guardar } = await db();
  const total = sumar(items);
  const fila = { fecha, hora, momento, items, ...total, actualizado: new Date().toISOString() };
  // Miniatura de la foto (si se anotó con la cámara): data URL JPEG chica, solo para mostrar.
  if (typeof foto === 'string' && foto.startsWith('data:image/')) fila.foto = foto;
  if (id) fila.id = Number(id);
  return guardar('registro', fila);
}

export async function borrarComida(id) {
  const { borrar } = await db();
  return borrar('registro', Number(id));
}

/** Últimos alimentos usados, sin repetir (para la pestaña Recientes). */
export async function recientes(limite = 15) {
  const { todos } = await db();
  const comidas = (await todos('registro'))
    .sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
  const vistos = new Set();
  const ids = [];
  for (const c of comidas) for (const it of c.items) {
    if (!it.alimentoId || vistos.has(it.alimentoId)) continue;
    vistos.add(it.alimentoId); ids.push(it.alimentoId);
    if (ids.length >= limite) break;
  }
  return (await Promise.all(ids.map(obtenerAlimento))).filter(Boolean);
}
