// Fase 1 — lógica del perfil y la meta calórica (sin interfaz).
// La usan el onboarding y la pestaña Perfil. Las funciones puras se prueban en tests/.
import { pInicial } from './personaje-estado.js';
import { FACTORES, KCAL_POR_KG, MINIMO_KCAL, edadDesde, bmr, tdeeInicial, metaKcal, macrosObjetivo } from './calculos.js';

export const EDAD_MINIMA = 18;          // pendiente de confirmar (el plan original decía 14)
export const EDAD_MAXIMA = 100;
export const ALTURA = { min: 120, max: 230 };   // cm
export const PESO = { min: 35, max: 300 };      // kg
export const IMC_META_MINIMO = 18.5;            // no se permite una meta con bajo peso
export const RITMOS = [0.25, 0.5, 0.75, 1];     // kg por semana
export const OBJETIVOS = ['bajar', 'mantener'];
export const EQUIPOS = ['ninguno', 'mancuernas', 'gimnasio'];

const redondear1 = n => Math.round(n * 10) / 10;
const es = n => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });   // 50,4 y no 50.4

export function imc(kg, cm) {
  const m = cm / 100;
  return redondear1(kg / (m * m));
}

// Categorías de la OMS. Es una referencia general: no distingue músculo de grasa.
export const IMC_TRAMOS = [
  { id: 'bajo', nombre: 'Bajo peso', hasta: 18.5 },
  { id: 'normal', nombre: 'Saludable', hasta: 25 },
  { id: 'sobre', nombre: 'Sobrepeso', hasta: 30 },
  { id: 'alto', nombre: 'Obesidad', hasta: Infinity },
];
export function categoriaImc(valor) {
  return IMC_TRAMOS.find(t => valor < t.hasta) ?? IMC_TRAMOS.at(-1);
}

// Pasos por día sugeridos según cuánto te movés hoy (una meta alcanzable, no 10.000 de entrada).
export const PASOS_POR_NIVEL = { sedentario: 6000, ligero: 7500, moderado: 9000, alto: 10000 };
export const metaPasos = actividad => PASOS_POR_NIVEL[actividad] ?? 7000;

// Peso más bajo permitido como meta para esa altura (IMC 18,5).
export function pesoMetaMinimo(cm) {
  const m = cm / 100;
  return Math.ceil(IMC_META_MINIMO * m * m * 10) / 10;
}

/**
 * Revisa los datos antes de guardar. Devuelve { ok, errores } donde errores es
 * { campo: 'mensaje' }. Los mensajes son neutros, sin culpa.
 * p: { objetivo, sexo, nacimiento, altura_cm, peso_kg, peso_meta, actividad, ritmo_kg_sem, equipo }
 */
export function validarPerfil(p, hoy = new Date()) {
  const e = {};
  if (!OBJETIVOS.includes(p.objetivo)) e.objetivo = 'Elegí un objetivo.';
  if (p.sexo !== 'm' && p.sexo !== 'f') e.sexo = 'Elegí una opción.';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.nacimiento ?? '')) {
    e.nacimiento = 'Ingresá tu fecha de nacimiento.';
  } else {
    const edad = edadDesde(p.nacimiento, hoy);
    if (edad < EDAD_MINIMA) e.nacimiento = `Nathor Fit es para mayores de ${EDAD_MINIMA} años.`;
    else if (edad > EDAD_MAXIMA) e.nacimiento = 'Revisá la fecha de nacimiento.';
  }

  const cm = Number(p.altura_cm), kg = Number(p.peso_kg), meta = Number(p.peso_meta);
  if (!(cm >= ALTURA.min && cm <= ALTURA.max)) e.altura_cm = `La altura tiene que estar entre ${ALTURA.min} y ${ALTURA.max} cm.`;
  if (!(kg >= PESO.min && kg <= PESO.max)) e.peso_kg = `El peso tiene que estar entre ${PESO.min} y ${PESO.max} kg.`;

  if (p.objetivo === 'bajar' && !e.altura_cm && !e.peso_kg) {
    if (!(meta >= PESO.min && meta <= PESO.max)) e.peso_meta = 'Ingresá un peso meta.';
    else if (meta >= kg) e.peso_meta = 'Para bajar, la meta tiene que ser menor que tu peso actual.';
    else if (meta < pesoMetaMinimo(cm)) e.peso_meta = `Para tu altura, la meta saludable mínima es ${es(pesoMetaMinimo(cm))} kg.`;
    if (!RITMOS.includes(Number(p.ritmo_kg_sem))) e.ritmo_kg_sem = 'Elegí un ritmo semanal.';
  }

  if (!(p.actividad in FACTORES)) e.actividad = 'Elegí tu nivel de actividad.';
  if (p.equipo != null && !EQUIPOS.includes(p.equipo)) e.equipo = 'Elegí con qué entrenás.';

  return { ok: Object.keys(e).length === 0, errores: e };
}

/**
 * Calcula el plan a partir del perfil y el peso actual. Pura: no toca la base.
 * Devuelve calorías, macros, si actuaron los pisos de seguridad y la fecha estimada.
 */
export function calcularPlan(p, hoy = new Date(), tdee = null) {
  const kg = Number(p.peso_kg), cm = Number(p.altura_cm);
  const datos = { sexo: p.sexo, kg, cm, edad: edadDesde(p.nacimiento, hoy), actividad: p.actividad };
  const base = Math.round(bmr(datos));
  const gasto = Math.round(tdee ?? tdeeInicial(datos));

  const bajar = p.objetivo === 'bajar';
  const ritmoPedido = bajar ? Number(p.ritmo_kg_sem) : 0;
  const ritmoMax = kg * 0.01;
  const kcal = bajar ? metaKcal(datos, ritmoPedido, gasto) : gasto;
  const piso = MINIMO_KCAL[p.sexo];

  // Ritmo real con las calorías finales (si actuó el piso, es más lento que el pedido).
  const ritmoReal = bajar ? Math.max(0, ((gasto - kcal) * 7) / KCAL_POR_KG) : 0;
  const aBajar = bajar ? kg - Number(p.peso_meta) : 0;
  const semanas = bajar && ritmoReal > 0 ? Math.ceil(aBajar / ritmoReal) : null;
  let fechaEstimada = null;
  if (semanas) {
    const f = new Date(hoy);
    f.setDate(f.getDate() + semanas * 7);
    fechaEstimada = f;
  }

  return {
    edad: datos.edad,
    bmr: base,
    tdee: gasto,
    kcal,
    macros: macrosObjetivo(kcal, kg),
    ritmoPedido,
    ritmoReal: Math.round(ritmoReal * 100) / 100,
    limitadoPorRitmo: bajar && ritmoPedido > ritmoMax,
    limitadoPorPiso: bajar && gasto - (Math.min(ritmoPedido, ritmoMax) * KCAL_POR_KG) / 7 < piso,
    semanas,
    fechaEstimada,
    imcActual: imc(kg, cm),
    imcMeta: bajar ? imc(Number(p.peso_meta), cm) : null,
  };
}

// --- Con base de datos (solo en el navegador) ---

/**
 * Valida, guarda el perfil, el peso de hoy y la meta de hoy. Lanza error si no valida.
 * Al editar los datos desde el perfil, registrarPeso es false: el peso se usa para calcular
 * pero no se anota como una pesada nueva.
 */
export async function guardarPerfil(datos, hoy = new Date(), { registrarPeso = true } = {}) {
  const { guardar, hoy: fechaHoy } = await import('./db.js');
  const v = validarPerfil(datos, hoy);
  if (!v.ok) {
    const err = new Error('Datos inválidos');
    err.errores = v.errores;
    throw err;
  }
  const plan = calcularPlan(datos, hoy);
  const fecha = fechaHoy(hoy);
  const { peso_kg, ...resto } = datos;
  // Se conservan los campos que no vienen en `datos` (p. ej. preferencias guardadas por otras pantallas),
  // menos la marca de perfil provisional de la Fase 0.
  const { provisional, ...anterior } = (await (await import('./db.js')).obtener('perfil', 'main')) ?? {};
  await guardar('perfil', {
    ...anterior, id: 'main', ...resto,
    altura_cm: Number(datos.altura_cm),
    peso_meta: datos.objetivo === 'bajar' ? Number(datos.peso_meta) : null,
    ritmo_kg_sem: datos.objetivo === 'bajar' ? Number(datos.ritmo_kg_sem) : 0,
    // Con qué cuerpo arranca el personaje: se fija una sola vez, la primera vez que se guarda el perfil
    peso_inicial: anterior.peso_inicial ?? Number(peso_kg),
    p_inicial: anterior.p_inicial ?? pInicial(Number(peso_kg), Number(datos.altura_cm)),
    actualizado: new Date().toISOString(),
  });
  if (registrarPeso) await guardar('peso', { fecha, kg: Number(peso_kg) });
  await guardar('metas', {
    fecha, kcal_objetivo: plan.kcal, tdee: plan.tdee,
    prot: plan.macros.prot, carb: plan.macros.carb, grasa: plan.macros.grasa,
  });
  return plan;
}

/** Último peso registrado (o null). */
export async function pesoActual() {
  const { todos } = await import('./db.js');
  const pesos = await todos('peso');           // la clave es la fecha: ya vienen ordenados
  return pesos.at(-1)?.kg ?? null;
}

/** Meta vigente: la más reciente con fecha <= hoy. */
export async function metaVigente(hoy = new Date()) {
  const { todos, hoy: fechaHoy } = await import('./db.js');
  const f = fechaHoy(hoy);
  const metas = (await todos('metas')).filter(m => m.fecha <= f);
  return metas.at(-1) ?? null;
}
