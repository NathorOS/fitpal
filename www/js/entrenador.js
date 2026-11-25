// Entrenador con IA: arma la rutina del día, propone qué cocinar, analiza cómo venís y charla.
// Usa Gemini con la clave propia (ia.js). Lo que manda es un RESUMEN de tus datos, nunca la clave ni fotos viejas.
// Las reglas de salud no dependen de la IA: la rutina solo puede usar ejercicios de la app (con series y tiempos
// acotados) y las recetas se revisan en el carrito antes de anotarse. El plan de calorías no lo toca.
import { EJERCICIOS, GRUPOS } from './datos/ejercicios.js';
import { EQUIPO_PERMITE } from './entrenamiento.js';
import { ultimosDias, sumarPorDia, fechaLocal, racha } from './estadisticas.js';
import { edadDesde, MINIMO_KCAL } from './calculos.js';
import { metaAgua } from './actividad.js';

const r0 = n => Math.round(Number(n) || 0);
const r1 = n => Math.round((Number(n) || 0) * 10) / 10;
const entre = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));
const corto = (s, n) => String(s ?? '').trim().slice(0, n);

// ---------------------------------------------------------------------------
// Resumen de los datos (lo único que viaja a Gemini)
// ---------------------------------------------------------------------------

/**
 * Junta lo que hace falta para aconsejar. `d` es lo que devuelve leerDatos() (juego.js),
 * `nivel` el nivel de entrenamiento guardado. Función pura.
 */
export function resumir(d, { ahora = new Date(), nivel = null } = {}) {
  const p = d.perfil ?? {};
  const hoy = fechaLocal(ahora);
  const dias14 = ultimosDias(14, ahora);
  const dias7 = dias14.slice(7);
  const kcal = sumarPorDia(d.comidas, 'kcal');
  const prot = sumarPorDia(d.comidas, 'prot');
  const agua = sumarPorDia(d.agua, 'ml');
  const minutos = sumarPorDia(d.sesiones, 'minutos');
  const pasos = Object.fromEntries(d.pasos.map(x => [x.fecha, x.pasos]));
  const meta = d.metas.filter(m => m.fecha <= hoy).at(-1) ?? d.metas[0] ?? null;
  const kg = d.pesos.at(-1)?.kg ?? p.peso_kg ?? null;
  const hace30 = fechaLocal(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 30));
  const peso30 = [...d.pesos].reverse().find(x => x.fecha <= hace30) ?? d.pesos[0] ?? null;
  const prom = (dias, porDia) => {
    const con = dias.filter(f => porDia[f] > 0);
    return con.length ? r0(con.reduce((a, f) => a + porDia[f], 0) / con.length) : null;
  };
  const comidasHoy = d.comidas.filter(c => c.fecha === hoy);
  return {
    hoy,
    hora: ahora.getHours(),
    perfil: {
      nombre: corto(p.nombre, 40) || null,
      edad: p.nacimiento ? edadDesde(p.nacimiento, ahora) : null,
      sexo: p.sexo === 'm' ? 'hombre' : p.sexo === 'f' ? 'mujer' : null,
      altura_cm: p.altura_cm ?? null,
      objetivo: p.objetivo ?? 'bajar',
      peso_meta: p.objetivo === 'bajar' ? p.peso_meta ?? null : null,
      ritmo_kg_semana: p.ritmo_kg_sem ?? null,
      actividad: p.actividad ?? null,
      equipo: p.equipo ?? 'ninguno',
      nivel_entreno: nivel,
    },
    personaje: { nombre: corto(p.gato?.nombre, 30) || 'el Gordo', personalidad: p.gato?.personalidad ?? 'directo' },
    peso: { actual: kg, hace_30_dias: peso30 && peso30.kg !== kg ? peso30.kg : null, inicial: d.pesos[0]?.kg ?? null },
    meta: meta ? { kcal: meta.kcal_objetivo, prot: meta.prot, carb: meta.carb, grasa: meta.grasa } : null,
    piso_kcal: MINIMO_KCAL[p.sexo] ?? MINIMO_KCAL.f,
    hoy_lleva: {
      kcal: r0(kcal[hoy]), prot: r0(prot[hoy]), agua_ml: r0(agua[hoy]), agua_meta_ml: metaAgua(kg),
      pasos: pasos[hoy] ?? 0, pasos_meta: p.meta_pasos ?? null, minutos_actividad: r0(minutos[hoy]),
      comidas: comidasHoy.flatMap(c => (c.items ?? []).map(i => i.nombre)).slice(0, 15),
    },
    semana: {
      dias_anotados: dias7.filter(f => kcal[f] > 0).length,
      kcal_promedio: prom(dias7, kcal),
      prot_promedio: prom(dias7, prot),
      agua_promedio_ml: prom(dias7, agua),
      pasos_promedio: prom(dias7, pasos),
      minutos_actividad: r0(dias7.reduce((a, f) => a + (minutos[f] ?? 0), 0)),
    },
    dias: dias14.map(f => ({ fecha: f, kcal: r0(kcal[f]), prot: r0(prot[f]), agua_ml: r0(agua[f]), pasos: pasos[f] ?? 0, min_actividad: r0(minutos[f]) })),
    entrenos: d.sesiones.filter(s => s.tipo === 'entrenamiento')
      .sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6)
      .map(s => ({ fecha: s.fecha, nombre: s.nombre, minutos: s.minutos })),
    racha: racha([...new Set(d.comidas.map(c => c.fecha))], ahora),
  };
}

const VOZ = {
  carinoso: 'cariñoso y compinche, pero sin vueltas',
  directo: 'directo, seco y al hueso',
  divertido: 'chistoso, exagerado, de cargada',
  tranqui: 'tranquilo, pausado, sin presionar',
};

/** Instrucciones de sistema comunes: quién es el entrenador, la voz y las reglas que no se negocian. */
export function instrucciones(r) {
  const pj = r.personaje;
  return `Sos ${pj.nombre}, el entrenador personal de una app de salud de uso personal. Sos un gordo argentino de barrio
que también está bajando de peso junto al usuario. Hablás en español rioplatense (voseo), con humor crudo y ${VOZ[pj.personalidad] ?? VOZ.directo}.
Podés cargarlo y retarlo, pero nunca humillarlo por su cuerpo.
Conocés nutrición y entrenamiento. Usás SOLO los datos del resumen; si falta algo, decilo en vez de inventar.
Reglas que no se negocian:
- Nunca recomiendes comer menos de ${r.piso_kcal} kcal por día ni bajar más del 1 % del peso por semana.
- No cambies el plan de calorías: si creés que hay que ajustarlo, sugerí revisarlo en la app.
- Nada de dietas extremas, ayunos de más de 18 horas, medicamentos, suplementos con dosis ni diagnósticos.
- Si menciona dolor, mareos, lesiones o algo médico: que pare y consulte a un profesional.
- Frases cortas, concretas y accionables. Números redondos.
Hoy es ${r.hoy}, son las ${r.hora} h.

RESUMEN DE DATOS (JSON):
${JSON.stringify(r)}`;
}

// ---------------------------------------------------------------------------
// Rutina del día
// ---------------------------------------------------------------------------
export const ANIMOS = { energia: 'con energía', normal: 'normal', cansado: 'cansado', dolor: 'con algún dolor o molestia' };
export const FOCOS = { libre: 'que decida el entrenador', completo: 'cuerpo completo', piernas: 'piernas y glúteos', superior: 'tren superior', cardio: 'cardio', movilidad: 'movilidad y estiramiento' };

const ESQ_RUTINA = {
  type: 'OBJECT',
  properties: {
    nombre: { type: 'STRING' },
    porque: { type: 'STRING' },
    ejercicios: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' }, series: { type: 'NUMBER' }, reps: { type: 'NUMBER' }, segundos: { type: 'NUMBER' }, descanso: { type: 'NUMBER' },
        },
        required: ['id', 'series'],
      },
    },
    consejo: { type: 'STRING' },
  },
  required: ['nombre', 'ejercicios'],
};

/** Ejercicios que se pueden usar con ese equipo. */
export const ejerciciosPara = equipo => EJERCICIOS.filter(e => (EQUIPO_PERMITE[equipo] ?? EQUIPO_PERMITE.ninguno).includes(e.equipo));

export function pedidoRutina(r, { animo = 'normal', minutos = 30, foco = 'libre' } = {}) {
  const lista = ejerciciosPara(r.perfil.equipo).map(e => `${e.id} | ${e.nombre} | ${GRUPOS[e.grupo]} | ${e.tipo === 'tiempo' ? 'por tiempo' : 'repeticiones'}`).join('\n');
  return {
    systemInstruction: { parts: [{ text: instrucciones(r) }] },
    contents: [{ role: 'user', parts: [{ text: `Armame la rutina de hoy.
Cómo me siento: ${ANIMOS[animo] ?? ANIMOS.normal}. Tiempo disponible: ${minutos} minutos. Foco: ${FOCOS[foco] ?? FOCOS.libre}.
Tené en cuenta lo que entrené en los últimos días (no repitas el mismo grupo dos días seguidos), mi nivel y mi peso
(si tengo sobrepeso, nada de saltos de alto impacto al principio). Si estoy cansado o con dolor: algo suave o movilidad.
Usá SOLO ejercicios de esta lista, con su id exacto (id | nombre | grupo | tipo):
${lista}
Entre 4 y 7 ejercicios. Para "repeticiones" poné reps; para "por tiempo" poné segundos. Descanso en segundos.
"porque": una o dos frases de por qué esta rutina hoy. "consejo": una frase para durante el entrenamiento.` }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: ESQ_RUTINA, temperature: 0.6 },
  };
}

/**
 * Convierte lo que propuso la IA en una rutina que la app puede reproducir (mismo formato que rutinasPara).
 * Descarta ejercicios que no existen o que no van con el equipo, y acota series, repeticiones y tiempos.
 * Devuelve null si no queda una rutina usable.
 */
export function validarRutina(j, equipo = 'ninguno') {
  const permitidos = new Map(ejerciciosPara(equipo).map(e => [e.id, e]));
  const vistos = new Set();
  const ejercicios = [];
  for (const x of Array.isArray(j?.ejercicios) ? j.ejercicios : []) {
    const e = permitidos.get(String(x?.id ?? '').trim());
    if (!e || vistos.has(e.id)) continue;
    vistos.add(e.id);
    const maquina = e.grupo === 'cardio' && e.equipo === 'gimnasio';
    const series = maquina ? 1 : r0(entre(x.series, 1, 5));
    const objetivo = e.tipo === 'tiempo'
      ? { seg: maquina ? r0(entre(x.segundos || 600, 300, 1800)) : r0(entre(x.segundos || 30, 15, 90)) }
      : { reps: r0(entre(x.reps || 10, 4, 25)) };
    ejercicios.push({ id: e.id, series, objetivo, descanso: r0(entre(x.descanso || 60, 15, 150)) });
    if (ejercicios.length === 8) break;
  }
  if (ejercicios.length < 2) return null;
  const grupos = ejercicios.map(x => permitidos.get(x.id).grupo);
  const cardio = grupos.filter(g => g === 'cardio').length / grupos.length;
  const movilidad = grupos.filter(g => g === 'movilidad').length / grupos.length;
  return {
    id: 'ia', nombre: corto(j.nombre, 50) || 'Rutina del entrenador', emoji: '✨', icono: 'entrenar',
    met: movilidad > 0.5 ? 2.5 : cardio > 0.5 ? 6 : 4.5,
    porque: corto(j.porque, 300), consejo: corto(j.consejo, 200), equipo, ejercicios,
  };
}

// ---------------------------------------------------------------------------
// Qué cocino
// ---------------------------------------------------------------------------
const ESQ_RECETAS = {
  type: 'OBJECT',
  properties: {
    comentario: { type: 'STRING' },
    recetas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          nombre: { type: 'STRING' }, minutos: { type: 'NUMBER' },
          ingredientes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { nombre: { type: 'STRING' }, gramos: { type: 'NUMBER' } }, required: ['nombre', 'gramos'] } },
          pasos: { type: 'ARRAY', items: { type: 'STRING' } },
          kcal: { type: 'NUMBER' }, proteinas: { type: 'NUMBER' }, carbohidratos: { type: 'NUMBER' }, grasas: { type: 'NUMBER' },
        },
        required: ['nombre', 'ingredientes', 'pasos', 'kcal'],
      },
    },
  },
  required: ['recetas'],
};

export function pedidoRecetas(r, { texto = '', imagenBase64 = null, mime = 'image/jpeg' } = {}) {
  const quedan = r.meta ? r0(r.meta.kcal - r.hoy_lleva.kcal) : null;
  const protFalta = r.meta ? r0(r.meta.prot - r.hoy_lleva.prot) : null;
  const partes = [{ text: `Decime qué puedo cocinar ahora.
${texto ? `Lo que tengo o lo que quiero: «${texto}».` : 'No te dije qué tengo: proponé cosas comunes de una casa argentina.'}
${imagenBase64 ? 'En la foto está lo que tengo (heladera, alacena o la mesada). Usá sobre todo eso.' : ''}
${quedan != null ? `Me quedan ${quedan} kcal y me faltan ${protFalta} g de proteína para hoy.` : ''}
Proponé 3 recetas caseras, fáciles y baratas, de una porción para una persona, que entren en lo que me queda
(si me quedan muy pocas, algo liviano y con proteína; nunca me digas que no coma).
Ingredientes con gramos. Pasos cortos (máximo 6). Valores nutricionales TOTALES de la porción.
"comentario": una frase tuya sobre cómo vengo hoy.` }];
  if (imagenBase64) partes.push({ inlineData: { mimeType: mime, data: imagenBase64 } });
  return {
    systemInstruction: { parts: [{ text: instrucciones(r) }] },
    contents: [{ role: 'user', parts: partes }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: ESQ_RECETAS, temperature: 0.7 },
  };
}

export function validarRecetas(j) {
  const recetas = (Array.isArray(j?.recetas) ? j.recetas : []).map(x => {
    const ingredientes = (Array.isArray(x?.ingredientes) ? x.ingredientes : [])
      .filter(i => corto(i?.nombre, 40) && Number(i.gramos) > 0).slice(0, 12)
      .map(i => ({ nombre: corto(i.nombre, 40), gramos: r0(entre(i.gramos, 1, 1500)) }));
    return {
      nombre: corto(x?.nombre, 60),
      minutos: x?.minutos ? r0(entre(x.minutos, 1, 180)) : null,
      ingredientes,
      pasos: (Array.isArray(x?.pasos) ? x.pasos : []).map(p => corto(p, 220)).filter(Boolean).slice(0, 8),
      kcal: r0(entre(x?.kcal, 0, 3000)), prot: r1(entre(x?.proteinas, 0, 300)), carb: r1(entre(x?.carbohidratos, 0, 400)), grasa: r1(entre(x?.grasas, 0, 300)),
    };
  }).filter(x => x.nombre && x.ingredientes.length && x.kcal > 0).slice(0, 4);
  return { comentario: corto(j?.comentario, 240), recetas };
}

/** Una receta como ítem del carrito de "Agregar comida" (igual que lo que calcula la foto con IA). */
export function recetaAItem(x) {
  return {
    alimentoId: null, nombre: x.nombre, emoji: '✨', cantidad: 1, unidad: 'rapido', porcionIdx: null, porcion: null,
    g: x.ingredientes.reduce((a, i) => a + i.gramos, 0), kcal: x.kcal, prot: x.prot, carb: x.carb, grasa: x.grasa, fibra: 0,
    fuente: 'ia', confianza: 'media',
  };
}

// ---------------------------------------------------------------------------
// Cómo vengo
// ---------------------------------------------------------------------------
const ESQ_ANALISIS = {
  type: 'OBJECT',
  properties: {
    titulo: { type: 'STRING' }, resumen: { type: 'STRING' },
    bien: { type: 'ARRAY', items: { type: 'STRING' } },
    mejorar: { type: 'ARRAY', items: { type: 'STRING' } },
    plan: { type: 'ARRAY', items: { type: 'OBJECT', properties: { titulo: { type: 'STRING' }, texto: { type: 'STRING' } }, required: ['titulo', 'texto'] } },
  },
  required: ['titulo', 'resumen', 'plan'],
};

export function pedidoAnalisis(r) {
  return {
    systemInstruction: { parts: [{ text: instrucciones(r) }] },
    contents: [{ role: 'user', parts: [{ text: `Analizá cómo vengo con los datos de las últimas dos semanas.
"titulo": una frase corta tuya que lo resuma. "resumen": 2 o 3 frases con números concretos (promedios, peso).
"bien": hasta 3 cosas que estoy haciendo bien. "mejorar": hasta 3 cosas que fallan.
"plan": exactamente 3 acciones concretas para esta semana (qué, cuánto y cuándo).
Si casi no hay datos, decímelo y pedime que anote más.` }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: ESQ_ANALISIS, temperature: 0.5 },
  };
}

export function validarAnalisis(j) {
  const lista = (v, n) => (Array.isArray(v) ? v : []).map(s => corto(s, 220)).filter(Boolean).slice(0, n);
  return {
    titulo: corto(j?.titulo, 100) || 'Cómo venís',
    resumen: corto(j?.resumen, 600),
    bien: lista(j?.bien, 3),
    mejorar: lista(j?.mejorar, 3),
    plan: (Array.isArray(j?.plan) ? j.plan : []).filter(p => p?.titulo && p?.texto).slice(0, 3)
      .map(p => ({ titulo: corto(p.titulo, 70), texto: corto(p.texto, 260) })),
  };
}

// ---------------------------------------------------------------------------
// Consejo del día (Hoy) y charla
// ---------------------------------------------------------------------------
export function pedidoConsejo(r) {
  return {
    systemInstruction: { parts: [{ text: instrucciones(r) }] },
    contents: [{ role: 'user', parts: [{ text: `Dame UN consejo para hoy, mirando cómo vengo (ayer, la semana y lo que llevo hoy).
Una o dos frases, máximo 160 caracteres, con algo concreto para hacer hoy. Sin saludar.` }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { consejo: { type: 'STRING' } }, required: ['consejo'] }, temperature: 0.8 },
  };
}

export const MAX_CHAT = 20;

/** historial: [{ rol: 'yo' | 'pj', texto }] (lo último al final). */
export function pedidoChat(r, historial, mensaje) {
  const previos = historial.slice(-(MAX_CHAT - 1)).map(m => ({ role: m.rol === 'yo' ? 'user' : 'model', parts: [{ text: m.texto }] }));
  return {
    systemInstruction: { parts: [{ text: `${instrucciones(r)}\nEstás chateando: contestá corto (máximo 120 palabras), sin títulos ni markdown.` }] },
    contents: [...previos, { role: 'user', parts: [{ text: corto(mensaje, 1000) }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
  };
}

/** Texto plano de una respuesta de Gemini. */
export function textoDe(data) {
  const t = data?.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('').trim() ?? '';
  if (!t) throw new Error('La IA no contestó nada. Probá de nuevo.');
  return t;
}

/** JSON de una respuesta de Gemini. */
export function jsonDe(data) {
  try { return JSON.parse(textoDe(data)); } catch { throw new Error('La IA respondió algo que no pude leer. Probá de nuevo.'); }
}

// ---------------------------------------------------------------------------
// Con base de datos (solo en el navegador)
// ---------------------------------------------------------------------------
const db = () => import('./db.js');

async function contexto() {
  const [{ leerDatos }, { obtener }] = await Promise.all([import('./juego.js'), db()]);
  const d = await leerDatos();
  const nivel = (await obtener('config', 'nivel_entreno'))?.valor ?? null;
  return resumir(d, { nivel });
}

async function llamar(pedido) {
  const { obtenerClave, llamarGemini } = await import('./ia.js');
  const clave = await obtenerClave();
  if (!clave) throw Object.assign(new Error('Falta tu clave de Gemini. Cargala en Perfil.'), { sinClave: true });
  return llamarGemini(pedido, clave);
}

async function leerConfig(clave) { const { obtener } = await db(); return (await obtener('config', clave))?.valor ?? null; }
async function guardarConfig(clave, valor) { const { guardar } = await db(); return guardar('config', { clave, valor }); }

export async function crearRutina(opciones) {
  const r = await contexto();
  const rutina = validarRutina(jsonDe(await llamar(pedidoRutina(r, opciones))), r.perfil.equipo);
  if (!rutina) throw new Error('La IA armó una rutina que no pude usar. Probá de nuevo.');
  rutina.nivel = r.perfil.nivel_entreno ?? 'principiante';
  rutina.fecha = r.hoy;
  await guardarConfig('coach_rutina', rutina);
  return rutina;
}
export const rutinaGuardada = () => leerConfig('coach_rutina');

export async function proponerRecetas(opciones) {
  const r = await contexto();
  const res = validarRecetas(jsonDe(await llamar(pedidoRecetas(r, opciones))));
  if (!res.recetas.length) throw new Error('No me salió ninguna receta. Contame qué tenés y probamos de nuevo.');
  return res;
}

/** Análisis de cómo venís: uno por día (se guarda); `forzar` pide uno nuevo. */
export async function analizarProgreso({ forzar = false } = {}) {
  const guardado = await leerConfig('coach_analisis');
  const r = await contexto();
  if (!forzar && guardado?.fecha === r.hoy) return guardado.datos;
  const datos = validarAnalisis(jsonDe(await llamar(pedidoAnalisis(r))));
  await guardarConfig('coach_analisis', { fecha: r.hoy, datos });
  return datos;
}
export async function analisisGuardado() {
  const g = await leerConfig('coach_analisis');
  return g?.datos ? { ...g.datos, fecha: g.fecha } : null;
}

/**
 * Consejo del día para Hoy: se pide una sola vez por día y se guarda (cuida la cuota gratuita).
 * Sin clave o sin internet devuelve null sin error.
 */
export async function consejoDelDia({ forzar = false } = {}) {
  const { obtenerClave } = await import('./ia.js');
  const guardado = await leerConfig('coach_consejo');
  const hoy = (await db()).hoy();
  if (!forzar && guardado?.fecha === hoy) return guardado.texto;
  if (!(await obtenerClave()) || !navigator.onLine) return null;
  const r = await contexto();
  const texto = corto(jsonDe(await llamar(pedidoConsejo(r))).consejo, 220);
  if (!texto) return null;
  await guardarConfig('coach_consejo', { fecha: hoy, texto });
  return texto;
}
export async function consejoGuardado() {
  const g = await leerConfig('coach_consejo');
  return g?.fecha === (await db()).hoy() ? g.texto : null;
}

export async function chat() { return (await leerConfig('coach_chat')) ?? []; }
export async function borrarChat() { return guardarConfig('coach_chat', []); }
export async function enviarMensaje(mensaje) {
  const historial = await chat();
  const r = await contexto();
  const respuesta = corto(textoDe(await llamar(pedidoChat(r, historial, mensaje))), 2000);
  const nuevo = [...historial, { rol: 'yo', texto: corto(mensaje, 1000) }, { rol: 'pj', texto: respuesta }].slice(-MAX_CHAT * 2);
  await guardarConfig('coach_chat', nuevo);
  return nuevo;
}
