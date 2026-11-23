// Fase 7 — Meta adaptativa: con tu peso real y lo que comiste, se estima cuánto gasta tu cuerpo
// y se PROPONE ajustar la meta (nunca se cambia sola). Mantiene los pisos y el ritmo máximo.
import { macrosObjetivo, MINIMO_KCAL, KCAL_POR_KG } from './calculos.js';
import { calcularPlan } from './objetivo.js';

export const VENTANA_DIAS = 28;      // se mira el último mes
export const CAMBIO_MINIMO = 50;     // menos que esto no vale la pena proponer
export const CAMBIO_MAXIMO = 150;    // de a poco: como mucho ±150 kcal por ajuste
export const DIAS_ENTRE_AJUSTES = 7;

const z = n => String(n).padStart(2, '0');
const fechaLocal = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
const masDias = (f, n) => { const d = new Date(f + 'T12:00'); d.setDate(d.getDate() + n); return fechaLocal(d); };

/**
 * Días de comida que cuentan para el cálculo: con al menos 2 comidas y 60 % de la meta.
 * Un día anotado a medias haría creer que comés menos de lo real y bajaría la meta sin motivo.
 */
export function diasCompletos(comidas, metaKcal) {
  const porDia = {};
  for (const c of comidas) {
    const d = (porDia[c.fecha] ??= { kcal: 0, n: 0 });
    d.kcal += Number(c.kcal) || 0; d.n++;
  }
  const out = {};
  for (const [f, d] of Object.entries(porDia)) if (d.n >= 2 && d.kcal >= metaKcal * 0.6) out[f] = d.kcal;
  return out;
}

/**
 * Propuesta de ajuste, o { listo: false, motivo } si todavía no corresponde.
 * datos: { perfil, pesos: [{fecha,kg}], comidas, metaActual: {fecha,kcal_objetivo,tdee}, hoy: 'YYYY-MM-DD' }
 */
export function proponerAjuste({ perfil, pesos, comidas, metaActual, hoy }) {
  if (!metaActual) return { listo: false, motivo: 'Sin meta todavía.' };
  if (masDias(metaActual.fecha, DIAS_ENTRE_AJUSTES) > hoy) return { listo: false, motivo: 'La meta se revisó hace menos de una semana.' };
  const desde = masDias(hoy, -VENTANA_DIAS);
  const ventanaPesos = pesos.filter(p => p.fecha >= desde && p.fecha <= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const kcalPorDia = diasCompletos(comidas.filter(c => c.fecha >= desde && c.fecha < hoy), metaActual.kcal_objetivo);
  const diasConPeso = new Set(ventanaPesos.map(p => p.fecha)).size;
  if (ventanaPesos.length < 2 || diasConPeso < 4) return { listo: false, motivo: 'Necesito que te peses al menos 4 veces en el mes.', faltanPesos: 4 - diasConPeso };

  // Tendencia: recta de mínimos cuadrados sobre los pesos reales (kg por día). Una media móvil
  // va atrasada y subestima lo que bajaste; la recta no.
  const t = p => (new Date(p.fecha + 'T12:00') - new Date(ventanaPesos[0].fecha + 'T12:00')) / 86400000;
  const xs = ventanaPesos.map(t), ys = ventanaPesos.map(p => p.kg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const pendiente = sxx ? xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx : 0;
  const dias = Math.round(xs.at(-1));
  const diasComida = Object.keys(kcalPorDia).length;
  if (dias < 14 || diasComida < 10) {
    return { listo: false, motivo: 'Necesito al menos 2 semanas de pesos y 10 días con las comidas completas.', diasComida, diasConPeso: dias };
  }
  const ingesta = Object.values(kcalPorDia).reduce((a, b) => a + b, 0) / diasComida;
  const real = ingesta - pendiente * KCAL_POR_KG;           // si bajás (pendiente < 0), gastás más de lo que comés
  const w = Math.min(0.8, dias / 35);                       // mezcla gradual con el cálculo inicial
  const tdee = Math.round(w * real + (1 - w) * metaActual.tdee);
  const confianza = +w.toFixed(2);
  const pesoHoy = Math.round((my + pendiente * (xs.at(-1) - mx)) * 10) / 10;
  const plan = calcularPlan({ ...perfil, peso_kg: pesoHoy }, new Date(hoy + 'T12:00'), tdee);
  let nueva = plan.kcal;
  const dif = nueva - metaActual.kcal_objetivo;
  if (Math.abs(dif) < CAMBIO_MINIMO) return { listo: false, motivo: 'Tu meta sigue bien: el cálculo da casi lo mismo.', tdee };
  if (Math.abs(dif) > CAMBIO_MAXIMO) nueva = metaActual.kcal_objetivo + Math.sign(dif) * CAMBIO_MAXIMO;
  // Los pisos de seguridad siempre mandan, también después del tope de ±150.
  nueva = Math.round(Math.max(nueva, MINIMO_KCAL[perfil.sexo] ?? MINIMO_KCAL.f));
  return {
    listo: true, tdee, confianza, pesoHoy,
    antes: metaActual.kcal_objetivo, despues: nueva,
    macros: macrosObjetivo(nueva, pesoHoy),
    limitadoPorPiso: plan.limitadoPorPiso,
    motivo: dif > 0
      ? 'Según tu peso real, tu cuerpo gasta más de lo que calculamos al principio.'
      : 'Según tu peso real, tu cuerpo gasta un poco menos de lo que calculamos al principio.',
  };
}

// ---------------------------------------------------------------------------
export async function revisarMeta(hoyStr) {
  const { obtener, todos, hoy } = await import('./db.js');
  const { metaVigente } = await import('./objetivo.js');
  const f = hoyStr ?? hoy();
  const [perfil, pesos, comidas, metaActual, pospuesto] = await Promise.all([
    obtener('perfil', 'main'), todos('peso'), todos('registro'), metaVigente(new Date(f + 'T12:00')), obtener('config', 'ajuste_pospuesto'),
  ]);
  if (pospuesto?.valor && masDias(pospuesto.valor, 3) > f) return { listo: false, motivo: 'Pospuesto.' };
  return proponerAjuste({ perfil, pesos, comidas, metaActual, hoy: f });
}

export async function aplicarAjuste(propuesta, hoyStr) {
  const { guardar, hoy } = await import('./db.js');
  const f = hoyStr ?? hoy();
  return guardar('metas', {
    fecha: f, kcal_objetivo: propuesta.despues, tdee: propuesta.tdee,
    prot: propuesta.macros.prot, carb: propuesta.macros.carb, grasa: propuesta.macros.grasa, adaptativa: true,
  });
}

export async function posponerAjuste(hoyStr) {
  const { guardar, hoy } = await import('./db.js');
  return guardar('config', { clave: 'ajuste_pospuesto', valor: hoyStr ?? hoy() });
}
