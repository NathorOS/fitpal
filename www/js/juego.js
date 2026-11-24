// Junta los datos guardados y calcula todo lo del personaje y el juego: etapa, pose, limpieza, retos y logros.
// La lógica está en personaje-estado.js, retos.js y frases.js (puras y con tests); acá solo se lee y se guarda.
import { todos, obtener, guardar, hoy as fechaHoy } from './db.js';
import { calcularRetos, semanaDe } from './retos.js';
import { metaAgua, kcalExtraDelDia } from './actividad.js';
import { fechaLocal } from './estadisticas.js';
import {
  pInicial, etapaDe, pesoTendencia, poseDelDia, limpieza, logrosQueCorresponden, rachaCortada, racha,
  premiosGanados, cofreDisponible,
} from './personaje-estado.js';
import { situacionAlAbrir } from './frases.js';
import { MINIMO_KCAL } from './calculos.js';

const esActividad = s => s.tipo === 'actividad' || s.tipo === 'entrenamiento';

/** Lee todo lo que hace falta de una vez. */
export async function leerDatos() {
  const [perfil, comidas, agua, sesiones, pesos, pasos, metas, ayunos, logros, config] = await Promise.all([
    obtener('perfil', 'main'), todos('registro'), todos('agua'), todos('sesiones'), todos('peso'),
    todos('pasos'), todos('metas'), todos('ayuno'), todos('logros').catch(() => []), todos('config'),
  ]);
  return {
    perfil, comidas, agua, sesiones: sesiones.filter(esActividad), pesos: [...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    pasos, metas: [...metas].sort((a, b) => a.fecha.localeCompare(b.fecha)), ayunos, logros, config,
  };
}

/** Meta de calorías de un día: la base vigente más lo que suma la actividad de ese día (igual que Hoy). */
export function metaKcalDe(d) {
  const kg = d.pesos.at(-1)?.kg ?? 70;
  return f => {
    const base = (d.metas.filter(m => m.fecha <= f).at(-1) ?? d.metas[0])?.kcal_objetivo ?? 0;
    const extra = kcalExtraDelDia({
      actividades: d.sesiones.filter(s => s.fecha === f), pasos: d.pasos.find(p => p.fecha === f)?.pasos ?? 0, kg, nivel: d.perfil?.actividad,
    });
    return base ? base + extra.suma : 0;
  };
}

export function retosDe(d, ahora = new Date()) {
  const kg = d.pesos.at(-1)?.kg ?? 70;
  return calcularRetos({
    hoy: fechaLocal(ahora), ahora, semana: semanaDe(ahora), aguaMeta: metaAgua(kg), metaKcal: metaKcalDe(d),
    comidas: d.comidas, agua: d.agua, sesiones: d.sesiones, pasos: d.pasos, pesos: d.pesos, ayunos: d.ayunos,
  });
}

/** Etapa, limpieza y equipo: lo que necesita cualquier pantalla para dibujar al personaje. */
export function personajeDe(d, ahora = new Date()) {
  const p = d.perfil ?? {};
  const pesoInicial = p.peso_inicial ?? d.pesos[0]?.kg ?? null;
  const tend = pesoTendencia(d.pesos) ?? pesoInicial;
  const anterior = d.config.find(c => c.clave === 'etapa')?.valor ?? null;
  const etapa = pesoInicial ? etapaDe({
    objetivo: p.objetivo, pInicial: p.p_inicial ?? pInicial(pesoInicial, p.altura_cm), pesoInicial, pesoActual: tend,
    pesoMeta: p.peso_meta, alturaCm: p.altura_cm, etapaAnterior: anterior,
  }) : 'e3';

  const kg = d.pesos.at(-1)?.kg ?? 70;
  const aguaMeta = metaAgua(kg);
  const conComida = new Set(d.comidas.map(c => c.fecha));
  const aguaPorDia = {};
  for (const a of d.agua) aguaPorDia[a.fecha] = (aguaPorDia[a.fecha] ?? 0) + a.ml;
  const conActividad = new Set(d.sesiones.map(s => s.fecha));
  const metaPasos = p.meta_pasos || 8000;
  for (const x of d.pasos) if (x.pasos >= metaPasos) conActividad.add(x.fecha);
  const primerDia = [...conComida].sort()[0] ?? null;
  const l = limpieza(f => ({ comidas: conComida.has(f), agua: (aguaPorDia[f] ?? 0) >= aguaMeta, actividad: conActividad.has(f) }),
    { hoy: ahora, desde: primerDia });
  return { etapa, limpieza: primerDia ? l : 50, equipo: p.equipo_futbol || 'verde', pesoInicial, tend };
}

/** Todo lo de Hoy: personaje, pose, situación para la frase y retos. */
export function estadoDeHoy(d, ahora = new Date()) {
  const hoy = fechaLocal(ahora);
  const pj = personajeDe(d, ahora);
  const metaKcal = metaKcalDe(d)(hoy);
  const delDia = d.comidas.filter(c => c.fecha === hoy);
  const kcal = delDia.reduce((a, c) => a + (c.kcal || 0), 0);
  const aguaMl = d.agua.filter(a => a.fecha === hoy).reduce((a, x) => a + x.ml, 0);
  const pasosHoy = d.pasos.find(x => x.fecha === hoy)?.pasos ?? 0;
  const actividadHoy = d.sesiones.some(s => s.fecha === hoy) || pasosHoy >= (d.perfil?.meta_pasos || 8000);
  const fechas = [...new Set(d.comidas.map(c => c.fecha))];
  const laRacha = racha(fechas, ahora);
  const cortada = rachaCortada(fechas, ahora);
  const retos = retosDe(d, ahora);
  const logrosHoy = d.logros.filter(x => x.fecha === hoy);
  // Festeja si hoy cumplió todos los retos del día o ganó un hito o una racha
  const festejo = retos.diarios.every(r => r.hecho) || logrosHoy.some(x => /^(hito-\d|hito-llegada|racha-)/.test(x.id));
  const ultimoUso = d.config.find(c => c.clave === 'ultimo_uso')?.valor;
  const diasSinEntrar = ultimoUso ? Math.round((new Date(hoy + 'T12:00') - new Date(ultimoUso + 'T12:00')) / 86400000) : 0;
  const minimo = MINIMO_KCAL[d.perfil?.sexo] ?? 1200;
  const hora = ahora.getHours();
  const pose = poseDelDia({
    hora, comidasHoy: delDia.length, kcal, kcalMeta: metaKcal, actividadHoy, festejo,
    ayunoEnCurso: d.ayunos.some(a => !a.fin), rachaCortada: cortada,
  });
  const situacion = situacionAlAbrir({
    llegoMeta: logrosHoy.some(x => x.id === 'hito-llegada'), diasSinEntrar,
    rachaNueva: logrosHoy.some(x => x.id.startsWith('racha-')), rachaCortada: cortada,
    kcal, kcalMeta: metaKcal, comidasHoy: delDia.length, hora, actividadHoy, aguaMl, aguaMeta: metaAgua(d.pesos.at(-1)?.kg ?? 70),
    limpieza: pj.limpieza, bajoPiso: hora >= 21 && delDia.length > 0 && kcal < minimo,
  });
  const semanalesHechos = retos.semanales.filter(r => r.hecho).length;
  const cofreAbierto = d.logros.some(x => x.id === `cofre-${semanaDe(ahora)[0]}`);
  return {
    ...pj, pose, situacion, racha: laRacha, rachaCortada: cortada, diasSinEntrar, retos, kcal, metaKcal, aguaMl,
    premios: premiosGanados(d.logros),
    cofre: !cofreAbierto && cofreDisponible({ retosSemanalesHechos: semanalesHechos, esDomingo: ahora.getDay() === 0 }),
  };
}

/** Guarda los logros nuevos (nunca se borran) y devuelve los que se ganaron recién. */
export async function sincronizarLogros(d, ahora = new Date()) {
  const pj = personajeDe(d, ahora);
  const retos = retosDe(d, ahora);
  const ids = logrosQueCorresponden({
    pesoInicial: pj.pesoInicial, pesoTend: pj.tend, pesoMeta: d.perfil?.peso_meta, objetivo: d.perfil?.objetivo,
    rachaActual: racha([...new Set(d.comidas.map(c => c.fecha))], ahora),
    retosHechos: [...retos.diarios, ...retos.semanales].filter(r => r.hecho).map(r => r.id),
    comidas: d.comidas.length, fotos: d.comidas.filter(c => c.foto).length, sesiones: d.sesiones.length,
    aguaTotalMl: d.agua.reduce((a, x) => a + x.ml, 0), diasConComida: new Set(d.comidas.map(c => c.fecha)).size,
  });
  const ya = new Set(d.logros.map(x => x.id));
  const nuevos = ids.filter(id => !ya.has(id)).map(id => ({ id, fecha: fechaLocal(ahora), visto: false }));
  for (const l of nuevos) await guardar('logros', l);
  d.logros.push(...nuevos);
  await guardar('config', { clave: 'etapa', valor: pj.etapa });
  return nuevos;
}

export async function abrirCofre(ahora = new Date()) {
  const l = { id: `cofre-${semanaDe(ahora)[0]}`, fecha: fechaHoy(ahora), visto: true };
  await guardar('logros', l);
  return l;
}

export async function marcarUso(ahora = new Date()) {
  await guardar('config', { clave: 'ultimo_uso', valor: fechaHoy(ahora) });
}

export async function marcarVistos(ids) {
  const todosL = await todos('logros');
  for (const l of todosL) if (ids.includes(l.id) && !l.visto) await guardar('logros', { ...l, visto: true });
}
