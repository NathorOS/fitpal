// Fase 4 — Entrenamiento: rutinas por equipo y nivel, progresión simple y guardado de sesiones.
import { EJERCICIOS } from './datos/ejercicios.js';
import { kcalActividad } from './actividad.js';

export const NIVELES = {
  principiante: { nombre: 'Principiante', series: 2, reps: 10, seg: 30, descanso: 60 },
  intermedio: { nombre: 'Intermedio', series: 3, reps: 12, seg: 45, descanso: 75 },
};

// Qué ejercicios puede usar cada equipo (el de gimnasio también usa mancuernas y peso corporal).
export const EQUIPO_PERMITE = {
  ninguno: ['ninguno'],
  mancuernas: ['ninguno', 'mancuernas'],
  gimnasio: ['ninguno', 'mancuernas', 'gimnasio'],
};

// Plantillas: listas de ejercicios por equipo. El nivel define series, repeticiones y descanso.
// En principiante algunos ejercicios se cambian por su versión más fácil.
const PLANTILLAS = {
  ninguno: [
    { id: 'casa-a', nombre: 'Cuerpo completo A', emoji: '🏠', met: 4, ejercicios: ['sentadilla', 'flexiones', 'puente', 'perro-pajaro', 'plancha'] },
    { id: 'casa-b', nombre: 'Cuerpo completo B', emoji: '🏠', met: 4, ejercicios: ['zancada-atras', 'fondos-silla', 'superman', 'sentadilla-sumo', 'plancha-lateral'] },
    { id: 'cardio', nombre: 'Cardio y abdomen', emoji: '🔥', met: 6, ejercicios: ['caminar-lugar', 'saltos-tijera', 'rodillas-arriba', 'escaladores', 'crunch', 'bicho-muerto'] },
    { id: 'movilidad', nombre: 'Movilidad', emoji: '🧘', met: 2.5, ejercicios: ['gato-vaca', 'circulos-cadera', 'rotacion-toracica', 'isquios', 'estiramiento-cadera'] },
  ],
  mancuernas: [
    { id: 'manc-a', nombre: 'Fuerza A', emoji: '🏋️', met: 5, ejercicios: ['goblet', 'press-piso', 'remo-una', 'rumano-manc', 'plancha'] },
    { id: 'manc-b', nombre: 'Fuerza B', emoji: '🏋️', met: 5, ejercicios: ['zancada-manc', 'press-hombros', 'curl', 'triceps-cabeza', 'puente-manc', 'giro-ruso'] },
  ],
  gimnasio: [
    { id: 'gym-a', nombre: 'Gimnasio A', emoji: '🏟️', met: 5, ejercicios: ['prensa', 'press-banca', 'jalon', 'curl-femoral', 'plancha'] },
    { id: 'gym-b', nombre: 'Gimnasio B', emoji: '🏟️', met: 5, ejercicios: ['hip-thrust', 'press-inclinado', 'remo-polea', 'extension-cuad', 'laterales', 'triceps-polea'] },
    { id: 'gym-cardio', nombre: 'Cardio en máquinas', emoji: '🚴', met: 6.5, ejercicios: ['cinta', 'bici-fija', 'eliptico'], minutosCada: 10 },
  ],
};

// Versión más fácil para principiantes.
const MAS_FACIL = { flexiones: 'flexiones-rodillas', sentadilla: 'sentadilla-silla', 'zancada-atras': 'escalon', burpee: 'caminar-lugar' };

export const ejercicio = id => EJERCICIOS.find(e => e.id === id);

/** Rutinas disponibles para un equipo y nivel, ya con series, objetivo y descanso. */
export function rutinasPara(equipo = 'ninguno', nivel = 'principiante') {
  const n = NIVELES[nivel] ?? NIVELES.principiante;
  const listas = [...(PLANTILLAS[equipo] ?? []), ...(equipo === 'ninguno' ? [] : PLANTILLAS.ninguno)];
  return listas.map(p => ({
    ...p,
    nivel,
    ejercicios: p.ejercicios.map(id => {
      const real = nivel === 'principiante' && MAS_FACIL[id] ? MAS_FACIL[id] : id;
      const e = ejercicio(real);
      const largo = p.minutosCada ? p.minutosCada * 60 : null;
      return {
        id: e.id,
        series: largo || p.id === 'movilidad' ? 1 : n.series,
        objetivo: e.tipo === 'tiempo' ? { seg: largo ?? (p.id === 'movilidad' ? 60 : n.seg) } : { reps: n.reps },
        descanso: p.id === 'movilidad' ? 15 : largo ? 30 : n.descanso,
      };
    }),
  }));
}

/** Minutos estimados: ~3 s por repetición, el tiempo de los isométricos y los descansos. */
export function minutosEstimados(rutina) {
  let s = 0;
  for (const x of rutina.ejercicios) {
    const trabajo = x.objetivo.seg ?? x.objetivo.reps * 3;
    s += x.series * trabajo + Math.max(0, x.series - 1) * x.descanso + x.descanso;
  }
  return Math.max(5, Math.round(s / 60));
}

/**
 * Progresión simple. Con la última vez que hiciste ese ejercicio:
 * - si completaste todas las series → con peso: +2,5 kg (gimnasio) o +1 kg (mancuernas);
 *   sin peso: +2 repeticiones (hasta 20) o +5 segundos (hasta 90);
 * - si no → repetís lo mismo.
 */
export function sugerir(ej, objetivo, ultima) {
  const e = typeof ej === 'string' ? ejercicio(ej) : ej;
  const base = { reps: objetivo.reps ?? null, seg: objetivo.seg ?? null, kg: null, subio: false };
  if (!ultima?.series?.length) return base;
  const kgPrev = Math.max(0, ...ultima.series.map(s => s.kg ?? 0)) || null;
  if (e.tipo === 'tiempo') {
    const hizo = Math.min(...ultima.series.map(s => s.seg ?? 0));
    const meta = Math.max(objetivo.seg, ultima.objetivo?.seg ?? 0);
    return hizo >= meta ? { ...base, seg: Math.min(90, meta + 5), subio: meta < 90 } : { ...base, seg: meta };
  }
  const meta = Math.max(objetivo.reps, ultima.objetivo?.reps ?? 0);
  const cumplio = ultima.series.every(s => (s.reps ?? 0) >= meta);
  if (e.usaPeso && kgPrev) {
    const paso = e.equipo === 'gimnasio' ? 2.5 : 1;
    return cumplio ? { ...base, reps: objetivo.reps, kg: kgPrev + paso, subio: true } : { ...base, reps: meta, kg: kgPrev };
  }
  return cumplio ? { ...base, reps: Math.min(20, meta + 2), subio: meta < 20 } : { ...base, reps: meta };
}

/** Kcal de una sesión: (MET − 1) × kg × horas, como las demás actividades. */
export function kcalSesion(rutina, minutos, kg) {
  return kcalActividad(rutina.met, kg, minutos);
}

// ---------------------------------------------------------------------------
const db = () => import('./db.js');

export async function sesionesEntreno() {
  const { todos } = await db();
  return (await todos('sesiones')).filter(s => s.tipo === 'entrenamiento')
    .sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
}

/** Lo último que hiciste de cada ejercicio: { id: { series, objetivo } }. */
export async function ultimasMarcas() {
  const out = {};
  for (const s of await sesionesEntreno()) {
    for (const e of s.ejercicios ?? []) if (!out[e.id] && e.series?.length) out[e.id] = e;
  }
  return out;
}

export async function guardarSesion(s) {
  const { guardar } = await db();
  return guardar('sesiones', { tipo: 'entrenamiento', ...s });
}

export async function nivelPreferido(perfil) {
  const { obtener } = await db();
  const guardado = (await obtener('config', 'nivel_entreno'))?.valor;
  if (guardado) return guardado;
  return ['moderado', 'alto'].includes(perfil?.actividad) ? 'intermedio' : 'principiante';
}
export async function guardarNivel(nivel) {
  const { guardar } = await db();
  return guardar('config', { clave: 'nivel_entreno', valor: nivel });
}
