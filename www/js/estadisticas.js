// Fase 3 — Estadísticas (gratis, desde el primer día). Funciones puras: reciben los datos ya leídos.
import { suavizarPesos } from './calculos.js';

const z = n => String(n).padStart(2, '0');
export const fechaLocal = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;

/** Las últimas n fechas terminando en `hasta` (incluida), de la más vieja a la más nueva. */
export function ultimosDias(n, hasta = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate() - i);
    out.push(fechaLocal(d));
  }
  return out;
}

/** Agrupa filas con .fecha en { fecha: suma de campo }. */
export function sumarPorDia(filas, campo) {
  const out = {};
  for (const f of filas) out[f.fecha] = (out[f.fecha] ?? 0) + (Number(f[campo]) || 0);
  return out;
}

/** Promedio solo de los días que tienen dato (un día sin anotar no cuenta como 0). */
export function promedioDiasConDato(dias, porDia) {
  const con = dias.filter(d => porDia[d] > 0);
  if (!con.length) return { promedio: null, dias: 0 };
  return { promedio: con.reduce((a, d) => a + porDia[d], 0) / con.length, dias: con.length };
}

/** Días seguidos con al menos una comida, contando desde hoy (o desde ayer si hoy todavía no hay). */
export function racha(fechasConComida, hoy = new Date()) {
  const set = new Set(fechasConComida);
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (!set.has(fechaLocal(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(fechaLocal(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/**
 * Serie de peso para el gráfico: pesos reales + tendencia suavizada, recortada al rango.
 * La tendencia se calcula con TODO el historial para que no arranque de cero en cada rango.
 */
export function seriePeso(pesos, desde) {
  const s = suavizarPesos([...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha)));
  const enRango = s.filter(p => p.fecha >= desde);
  const cambio = enRango.length >= 2 ? +(enRango.at(-1).suavizado - enRango[0].suavizado).toFixed(1) : null;
  return { puntos: enRango, cambio };
}

/** Escala lineal simple para los gráficos SVG. */
export function escala([d0, d1], [r0, r1]) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return v => r0 + (v - d0) * k;
}

/** Límites "lindos" para un eje (redondeados al paso). */
export function limites(valores, paso, margen = 0) {
  const v = valores.filter(Number.isFinite);
  if (!v.length) return [0, paso];
  const lo = Math.floor((Math.min(...v) - margen) / paso) * paso;
  const hi = Math.ceil((Math.max(...v) + margen) / paso) * paso;
  return lo === hi ? [lo - paso, hi + paso] : [lo, hi];
}
