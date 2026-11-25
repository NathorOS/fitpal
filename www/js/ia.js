// Fase 6 — IA con Gemini usando la clave PROPIA del usuario.
// La clave se guarda solo en este teléfono (IndexedDB, store config) y no se exporta en los respaldos.
// La IA estima; la app primero busca cada plato en su propia base y solo usa los números de la IA
// cuando no lo encuentra. Todo se confirma (y se puede corregir) antes de guardar.
import { ALIMENTOS_BASE } from './datos/alimentos.js';
import { buscar, normalizar, calcularItem } from './registro.js';

// Si no se pudo leer la lista de modelos de la clave, se prueban estos en orden (si uno no existe, el siguiente).
export const MODELOS = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-2.5-flash-lite'];
// Subir este número cuando cambie la forma de elegir el modelo: los teléfonos que ya tenían uno guardado vuelven a elegir.
export const VERSION_ELECCION = 3;
const API = 'https://generativelanguage.googleapis.com/v1beta';
const URL_API = m => `${API}/models/${m}:generateContent`;
export const ESPERA_MS = 60000;      // tiempo máximo por pedido de análisis
export const ESPERA_PRUEBA_MS = 15000;

/**
 * Configuración de "pensamiento": los modelos nuevos piensan antes de contestar y eso los hace lentos
 * (con el pensamiento alto, una rutina tardaba más de 45 s). Para esto alcanza con lo mínimo:
 * 2.5 Flash se apaga, 2.5 Flash-Lite ya viene apagado y los 3.x (y los alias "latest") van en "low",
 * que todos los 3.x aceptan. Si un modelo no lo acepta, llamarGemini reintenta sin esta configuración.
 */
export function configPensar(modelo) {
  if (/2\.5-flash-lite/.test(modelo)) return null;
  if (/2\.5-flash/.test(modelo)) return { thinkingBudget: 0 };
  if (/gemini-([3-9]|\d\d)|latest/.test(modelo)) return { thinkingLevel: 'low' };
  return null;
}

/** "gemini-3.8-flash" → { version: 3.8, lite: false }; null si no es un flash estable (preview, exp, pro…). */
export function leerFlash(nombre) {
  const m = /^gemini-(\d+(?:\.\d+)?)-flash(-lite)?$/.exec(nombre);
  return m ? { version: Number(m[1]), lite: Boolean(m[2]) } : null;
}

/**
 * Ordena los modelos de la lista que devuelve Gemini para esa clave, del preferido al último recurso:
 * Flash estables de la 3 en adelante (el más nuevo primero), Flash-Lite (más cuota gratis), los alias
 * "latest" y al final 2.5 Flash (deprecado). Si uno no tiene cuota o está saturado, se usa el siguiente.
 */
export function ordenarModelos(nombres) {
  const lista = [...new Set(nombres.map(n => String(n).replace(/^models\//, '')))];
  const flash = lista.map(n => ({ n, ...leerFlash(n) })).filter(x => x.version);
  const desc = xs => xs.sort((a, b) => b.version - a.version).map(x => x.n);
  return [
    ...desc(flash.filter(x => !x.lite && x.version >= 3)),
    ...desc(flash.filter(x => x.lite)),
    ...['gemini-flash-latest', 'gemini-flash-lite-latest'].filter(m => lista.includes(m)),
    ...desc(flash.filter(x => !x.lite && x.version < 3)),
  ];
}
export const elegirModelo = nombres => ordenarModelos(nombres)[0] ?? null;

/**
 * Cuánto "descansa" un modelo después de un error, en ms: sin cuota del día (o cuota 0) hasta mañana,
 * límite por minuto 1 min, saturado 2 min, sin respuesta 10 min. null = el error no es del modelo.
 */
export function descansoPorError(status, cuerpo = '') {
  if (status === 429) return /PerDay|per day|limit: 0\b|"0"/i.test(cuerpo) ? 20 * 3600e3 : 60e3;
  if (status >= 500) return 120e3;
  if (status === 'tiempo') return 600e3;
  return null;
}

/** Mensaje de Google, corto, para el diagnóstico de Perfil. */
export function detalleGoogle(cuerpo = '') {
  try { return String(JSON.parse(cuerpo)?.error?.message ?? '').split('\n')[0].slice(0, 180); } catch { return String(cuerpo).slice(0, 120); }
}

/** fetch con tiempo límite: si Gemini no contesta, se corta con un mensaje claro (antes quedaba cargando). */
async function pedir(url, opciones, espera) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), espera);
  try {
    return await fetch(url, { ...opciones, signal: ctrl.signal });
  } catch (err) {
    if (err?.name === 'AbortError') throw Object.assign(new Error('Gemini tardó demasiado en contestar. Probá de nuevo: la próxima uso otro modelo.'), { tiempo: true });
    throw new Error('No pude conectarme con Gemini. Revisá tu conexión.');
  } finally {
    clearTimeout(t);
  }
}

const ESQUEMA = {
  type: 'OBJECT',
  properties: {
    es_comida: { type: 'BOOLEAN' },
    comentario: { type: 'STRING' },
    platos: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          nombre: { type: 'STRING' },
          gramos: { type: 'NUMBER' },
          kcal: { type: 'NUMBER' },
          proteinas: { type: 'NUMBER' },
          carbohidratos: { type: 'NUMBER' },
          grasas: { type: 'NUMBER' },
          fibra: { type: 'NUMBER' },
          confianza: { type: 'STRING', enum: ['alta', 'media', 'baja'] },
        },
        required: ['nombre', 'gramos', 'kcal'],
      },
    },
  },
  required: ['es_comida', 'platos'],
};

const INSTRUCCIONES = `Sos nutricionista y conocés la comida casera argentina y latinoamericana.
Separá cada componente por separado (por ejemplo: milanesa, puré, ensalada, pan, bebida), con su peso
estimado en gramos y los valores nutricionales TOTALES de esa cantidad (no por 100 g).
Usá nombres comunes en español rioplatense, cortos y sin marca (ej.: "Milanesa de carne frita", "Puré de papas").
No inventes lo que no se ve o no se dice. Si dudás, poné confianza "baja".
Si no es comida, es_comida = false y platos vacío. "comentario": una frase corta y amable, sin juzgar.`;

/** Arma el cuerpo del pedido a Gemini (foto en base64 o texto). */
export function armarPedido({ texto, imagenBase64, mime = 'image/jpeg' }) {
  const partes = [];
  if (imagenBase64) {
    partes.push({ text: `${INSTRUCCIONES}\nAnalizá la comida de esta foto.${texto ? ` Aclaración del usuario: «${texto}».` : ''}` });
    partes.push({ inlineData: { mimeType: mime, data: imagenBase64 } });
  } else {
    partes.push({ text: `${INSTRUCCIONES}\nEl usuario describe lo que comió: «${texto}». Interpretá las cantidades (ej.: "2 empanadas" ≈ 180 g; "un plato" ≈ 300 g).` });
  }
  return {
    contents: [{ role: 'user', parts: partes }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: ESQUEMA, temperature: 0.2 },
  };
}

/** Saca el JSON de la respuesta de Gemini y lo limpia. Lanza un Error con mensaje para el usuario. */
export function leerRespuesta(data) {
  const texto = data?.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
  let j;
  try { j = JSON.parse(texto); } catch { throw new Error('La IA respondió algo que no pude leer. Probá de nuevo.'); }
  const n = v => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);
  const platos = (Array.isArray(j.platos) ? j.platos : [])
    .filter(p => p && String(p.nombre ?? '').trim() && n(p.gramos) > 0)
    .slice(0, 12)
    .map(p => ({
      nombre: String(p.nombre).trim().slice(0, 60),
      gramos: Math.min(2000, Math.round(n(p.gramos))),
      kcal: Math.min(5000, Math.round(n(p.kcal))),
      prot: n(p.proteinas), carb: n(p.carbohidratos), grasa: n(p.grasas), fibra: n(p.fibra),
      confianza: ['alta', 'media', 'baja'].includes(p.confianza) ? p.confianza : 'media',
    }));
  return { esComida: j.es_comida !== false && platos.length > 0, comentario: String(j.comentario ?? '').slice(0, 200), platos };
}

/**
 * Busca un alimento de la base que corresponda al plato: el primer resultado de la búsqueda,
 * solo si al menos el 60 % de sus palabras importantes aparecen en el nombre que dio la IA.
 */
export function coincidenciaEnBase(nombre, base = ALIMENTOS_BASE) {
  const cand = buscar(nombre.split(/\s+/).slice(0, 2).join(' '), base, 12);
  const texto = normalizar(nombre);
  let mejor = null, puntaje = 0;
  for (const a of cand) {
    const palabras = normalizar(a.nombre).split(/\s+/).filter(w => w.length > 3);
    if (!palabras.length) continue;
    const ok = palabras.filter(w => texto.includes(w)).length / palabras.length;
    if (ok >= 0.6 && ok > puntaje) { mejor = a; puntaje = ok; }   // la mejor, no la primera
  }
  return mejor;
}

/** Convierte los platos de la IA en ítems del carrito: con la base si coincide, si no con lo que estimó la IA. */
export function platosAItems(platos, base = ALIMENTOS_BASE) {
  return platos.map(p => {
    const a = coincidenciaEnBase(p.nombre, base);
    if (a) return { ...calcularItem(a, { cantidad: p.gramos, unidad: 'g' }), fuente: 'base', confianza: p.confianza };
    const r1 = x => Math.round(x * 10) / 10;
    return {
      alimentoId: null, nombre: p.nombre, emoji: '✨', cantidad: 1, unidad: 'rapido', porcionIdx: null, porcion: null,
      g: p.gramos, kcal: p.kcal, prot: r1(p.prot), carb: r1(p.carb), grasa: r1(p.grasa), fibra: r1(p.fibra),
      fuente: 'ia', confianza: p.confianza,
    };
  });
}

/** Mensaje claro según el error HTTP de Gemini. */
export function mensajeError(status, cuerpo = '') {
  if (status === 400 && /API_KEY|api key/i.test(cuerpo)) return 'La clave de Gemini no es válida. Revisala en Perfil.';
  if (status === 401 || status === 403) return 'La clave de Gemini no tiene permiso. Revisala en Perfil.';
  if (status === 429) return 'Llegaste al límite gratuito de Gemini en todos los modelos que tenés. Probá en un rato o anotá a mano.';
  if (status >= 500) return 'Gemini está saturado en este momento. Probá en un rato.';
  return 'No pude analizarlo. Probá de nuevo o anotá a mano.';
}

// ---------------------------------------------------------------------------
const db = () => import('./db.js');

export async function obtenerClave() {
  const { obtener } = await db();
  return (await obtener('config', 'gemini_clave'))?.valor ?? null;
}
export async function guardarClave(clave) {
  const { guardar } = await db();
  return guardar('config', { clave: 'gemini_clave', valor: String(clave).trim() });
}
export async function borrarClave() {
  const { borrar } = await db();
  await borrar('config', 'gemini_modelo');
  await borrar('config', 'gemini_descanso');
  return borrar('config', 'gemini_clave');
}

/** Modelos de esta clave, en orden. Si no hay o se eligieron con una versión vieja de la app, se vuelven a pedir. */
export async function modelosGuardados(clave) {
  const { obtener } = await db();
  const g = await obtener('config', 'gemini_modelo');
  if (g?.lista?.length && g.version === VERSION_ELECCION) return g.lista;
  if (!clave) return [];
  try { return await elegirConClave(clave); } catch (err) { console.warn('No pude elegir el modelo', err); return []; }
}

async function leerDescansos() {
  const { obtener } = await db();
  return (await obtener('config', 'gemini_descanso'))?.valor ?? {};
}
async function descansar(modelo, ms) {
  const { guardar } = await db();
  const d = await leerDescansos();
  d[modelo] = Date.now() + ms;
  await guardar('config', { clave: 'gemini_descanso', valor: d });
}

/**
 * Llama a Gemini probando los modelos de la clave en orden: si uno no existe, no tiene cuota o está saturado,
 * lo deja descansar un rato y pasa al siguiente (hasta 4). Corta si un pedido tarda más de `espera` ms.
 * Devuelve la respuesta con `modelo` (el que contestó) y `saltados` ([{ modelo, status }]).
 */
export async function llamarGemini(pedido, clave, { espera = ESPERA_MS } = {}) {
  if (!navigator.onLine) throw new Error('Sin conexión. La IA necesita internet; podés anotar a mano.');
  const propios = await modelosGuardados(clave).catch(() => []);
  const todos = [...new Set([...propios, ...(propios.length ? [] : MODELOS)])];
  const descansos = await leerDescansos().catch(() => ({}));
  const ahora = Date.now();
  // Primero los que no están descansando; si todos descansan, se prueban igual.
  const modelos = [...todos.filter(m => !(descansos[m] > ahora)), ...todos.filter(m => descansos[m] > ahora)].slice(0, 4);
  const saltados = [];
  let ultimo = null;
  const enviar = (m, cuerpo) => pedir(URL_API(m), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
    body: JSON.stringify(cuerpo),
  }, espera);
  for (const m of modelos) {
    const pensar = configPensar(m);
    let r;
    try {
      r = await enviar(m, pensar ? { ...pedido, generationConfig: { ...pedido.generationConfig, thinkingConfig: pensar } } : pedido);
      // Si el modelo no acepta esa configuración de pensamiento, se reintenta sin ella
      if (r.status === 400 && pensar) {
        const txt = await r.text();
        if (!/thinking/i.test(txt)) throw Object.assign(new Error(mensajeError(400, txt)), { detalle: `${m} · HTTP 400 · ${detalleGoogle(txt)}` });
        r = await enviar(m, pedido);
      }
    } catch (err) {
      if (err.tiempo) { await descansar(m, descansoPorError('tiempo')).catch(() => {}); err.detalle = `${m} · sin respuesta en ${espera / 1000} s`; }
      throw err;
    }
    if (r.ok) return { ...(await r.json()), modelo: m, saltados };
    const txt = await r.text();
    const descanso = r.status === 404 ? 24 * 3600e3 : descansoPorError(r.status, txt);
    ultimo = { status: r.status, txt, modelo: m };
    if (descanso == null) throw Object.assign(new Error(mensajeError(r.status, txt)), { detalle: `${m} · HTTP ${r.status} · ${detalleGoogle(txt)}`, status: r.status });
    saltados.push({ modelo: m, status: r.status });
    console.warn(`Gemini ${m}: HTTP ${r.status}, pruebo otro modelo`, detalleGoogle(txt));
    await descansar(m, descanso).catch(() => {});
  }
  const resumen = saltados.map(x => `${x.modelo} (${x.status})`).join(', ');
  if (!ultimo || ultimo.status === 404) throw Object.assign(new Error('El modelo de Gemini no está disponible. Avisame y lo actualizo.'), { detalle: resumen });
  throw Object.assign(new Error(mensajeError(ultimo.status, ultimo.txt)), { detalle: `${resumen} · ${detalleGoogle(ultimo.txt)}`, status: ultimo.status });
}

export async function analizar({ texto, imagenBase64, mime }) {
  const clave = await obtenerClave();
  if (!clave) throw Object.assign(new Error('Falta tu clave de Gemini. Cargala en Perfil.'), { sinClave: true });
  const res = leerRespuesta(await llamarGemini(armarPedido({ texto, imagenBase64, mime }), clave));
  const { alimentosPropios } = await import('./registro.js');
  const base = [...(await alimentosPropios()), ...ALIMENTOS_BASE];
  return { ...res, items: platosAItems(res.platos, base) };
}

/**
 * Prueba la clave pidiéndole a Gemini la lista de modelos: es instantáneo y no gasta cuota
 * (antes se pedía un análisis entero y con los modelos que "piensan" quedaba cargando).
 * Devuelve el modelo elegido y lo guarda para los próximos pedidos.
 */
async function elegirConClave(clave) {
  const r = await pedir(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': clave } }, ESPERA_PRUEBA_MS);
  if (!r.ok) throw new Error(mensajeError(r.status, await r.text()));
  const datos = await r.json();
  const lista = ordenarModelos((datos.models ?? [])
    .filter(m => (m.supportedGenerationMethods ?? ['generateContent']).includes('generateContent'))
    .map(m => m.name));
  if (!lista.length) throw new Error('Tu clave funciona, pero no encontré un modelo de Gemini disponible. Avisame y lo reviso.');
  const { guardar } = await db();
  await guardar('config', { clave: 'gemini_modelo', valor: lista[0], lista, version: VERSION_ELECCION });
  return lista;
}

export async function probarClave(clave) {
  if (!navigator.onLine) throw new Error('Sin conexión. Conectate a internet para probar la clave.');
  return (await elegirConClave(clave))[0];
}

/**
 * Prueba de verdad (botón "Probar" de Perfil): vuelve a elegir el modelo y le pide una respuesta mínima,
 * midiendo cuánto tarda. Devuelve { modelo, segundos }.
 */
export async function medirIA(clave) {
  if (!navigator.onLine) throw new Error('Sin conexión. Conectate a internet para probar la clave.');
  await elegirConClave(clave);
  const t0 = performance.now();
  const r = await llamarGemini({
    contents: [{ role: 'user', parts: [{ text: 'Respondé solo con la palabra: listo' }] }],
    generationConfig: { temperature: 0 },
  }, clave, { espera: 30000 });
  return { modelo: r.modelo, saltados: r.saltados, segundos: Math.round((performance.now() - t0) / 100) / 10 };
}

/** Achica una foto a ~800 px y la devuelve en base64 JPEG (sin el prefijo data:). */
export async function prepararFoto(archivo, lado = 800) {
  const bmp = await createImageBitmap(archivo);
  const k = Math.min(1, lado / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * k); canvas.height = Math.round(bmp.height * k);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.82);
  // Miniatura cuadrada (recorte central) para mostrar en la lista de comidas: ~5–10 KB.
  const MINI = 160, l = Math.min(bmp.width, bmp.height);
  const cm = document.createElement('canvas');
  cm.width = cm.height = MINI;
  cm.getContext('2d').drawImage(bmp, (bmp.width - l) / 2, (bmp.height - l) / 2, l, l, 0, 0, MINI, MINI);
  return { base64: url.split(',')[1], url, mini: cm.toDataURL('image/jpeg', 0.7) };
}
