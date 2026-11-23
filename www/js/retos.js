// Fase 5 — Retos diarios y semanales. Se calculan a partir de lo anotado: no hay que "aceptarlos".
// Sin castigos: un reto no cumplido simplemente vuelve a empezar.
import { racha, fechaLocal } from './estadisticas.js';

/**
 * datos (ya leídos): { hoy, semana: [fechas lun..dom], comidas, agua, sesiones, pesos, pasos, metaKcal(fecha), aguaMeta, ayunos }
 * Devuelve { diarios: [...], semanales: [...] } con { id, emoji, titulo, desc, valor, meta, hecho }.
 */
export function calcularRetos(d) {
  const delDia = (filas, f) => filas.filter(x => x.fecha === f);
  const sumaDia = (filas, f, campo) => delDia(filas, f).reduce((a, x) => a + (Number(x[campo]) || 0), 0);
  const enSemana = f => d.semana.includes(f);

  const comidasHoy = delDia(d.comidas, d.hoy).length;
  const kcalHoy = sumaDia(d.comidas, d.hoy, 'kcal');
  const meta = d.metaKcal(d.hoy);
  const aguaHoy = sumaDia(d.agua, d.hoy, 'ml');
  const minHoy = sumaDia(d.sesiones, d.hoy, 'minutos');
  const pasosHoy = d.pasos.find(p => p.fecha === d.hoy)?.pasos ?? 0;
  const enMeta = f => {
    const k = sumaDia(d.comidas, f, 'kcal');
    const m = d.metaKcal(f);
    return k > 0 && m > 0 && Math.abs(k - m) <= m * 0.1;
  };

  const diarios = [
    reto('anotar3', '📝', 'Anotá 3 comidas', 'Desayuno, almuerzo, merienda o cena: las que hagas.', comidasHoy, 3),
    reto('agua', '💧', 'Llegá a tu meta de agua', `${(d.aguaMeta / 1000).toLocaleString('es-AR')} litros en el día.`, aguaHoy, d.aguaMeta, 'ml'),
    reto('moverse', '🏃', 'Movete 30 minutos', 'Cualquier actividad cuenta, o 8.000 pasos.', Math.max(minHoy, Math.round((pasosHoy / 8000) * 30)), 30, 'min'),
    reto('meta', '🎯', 'Cerrá el día cerca de tu meta', 'Entre 10 % por debajo y 10 % por encima.', enMeta(d.hoy) ? 1 : 0, 1, null, meta ? `${Math.round(kcalHoy).toLocaleString('es-AR')} de ${Math.round(meta).toLocaleString('es-AR')} kcal` : null),
  ];

  const diasSemana = d.semana.filter(f => f <= d.hoy);
  const diasConComida = new Set(d.comidas.filter(c => enSemana(c.fecha)).map(c => c.fecha)).size;
  const diasAgua = diasSemana.filter(f => sumaDia(d.agua, f, 'ml') >= d.aguaMeta).length;
  const actividades = d.sesiones.filter(s => enSemana(s.fecha)).length;
  const pesajes = d.pesos.filter(p => enSemana(p.fecha)).length;
  const diasEnMeta = diasSemana.filter(enMeta).length;
  const ayunosOk = d.ayunos.filter(a => a.fin && enSemana(fechaLocal(new Date(a.fin))) &&
    (new Date(a.fin) - new Date(a.inicio)) / 3600000 >= a.meta_h).length;

  const semanales = [
    reto('racha7', '🔥', 'Anotá 7 días seguidos', 'Tu racha actual cuenta.', Math.min(7, racha([...new Set(d.comidas.map(c => c.fecha))], d.ahora)), 7),
    reto('dias5', '📅', 'Anotá comidas 5 días esta semana', 'De lunes a domingo.', diasConComida, 5),
    reto('enmeta3', '🎯', '3 días cerca de tu meta', 'Entre 10 % por debajo y 10 % por encima.', diasEnMeta, 3),
    reto('agua5', '💧', 'Meta de agua 5 días', 'Esta semana.', diasAgua, 5),
    reto('act3', '🏃', '3 actividades en la semana', 'Caminata, gimnasio, deporte…', actividades, 3),
    reto('peso2', '⚖️', 'Pesate 2 veces', 'Para ver la tendencia real.', pesajes, 2),
    reto('ayuno3', '⏳', 'Completá 3 ayunos', 'Solo si ayunás: es opcional.', ayunosOk, 3),
  ];
  return { diarios, semanales };
}

function reto(id, emoji, titulo, desc, valor, meta, unidad = null, detalle = null) {
  return { id, emoji, titulo, desc, valor: Math.min(valor, meta), meta, unidad, detalle, hecho: valor >= meta };
}

/** Lunes a domingo de la semana de `fecha` (Date), como YYYY-MM-DD. */
export function semanaDe(fecha) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const dow = (d.getDay() + 6) % 7;               // 0 = lunes
  d.setDate(d.getDate() - dow);
  const z = n => String(n).padStart(2, '0');
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    return `${x.getFullYear()}-${z(x.getMonth() + 1)}-${z(x.getDate())}`;
  });
}
