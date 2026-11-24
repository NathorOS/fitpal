// Fase 6 — IA con Gemini usando la clave PROPIA del usuario.
// La clave se guarda solo en este teléfono (IndexedDB, store config) y no se exporta en los respaldos.
// La IA estima; la app primero busca cada plato en su propia base y solo usa los números de la IA
// cuando no lo encuentra. Todo se confirma (y se puede corregir) antes de guardar.
import { ALIMENTOS_BASE } from './datos/alimentos.js';
import { buscar, normalizar, calcularItem } from './registro.js';

export const MODELOS = ['gemini-flash-latest', 'gemini-2.5-flash'];
const URL_API = m => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

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
  if (status === 429) return 'Llegaste al límite gratuito de Gemini por ahora. Probá en un rato o anotá a mano.';
  if (status >= 500) return 'Gemini no responde en este momento. Probá en un rato.';
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
  return borrar('config', 'gemini_clave');
}

/** Llama a Gemini probando los modelos en orden (si uno no existe, pasa al siguiente). */
export async function llamarGemini(pedido, clave) {
  if (!navigator.onLine) throw new Error('Sin conexión. La IA necesita internet; podés anotar a mano.');
  let ultimo = null;
  for (const m of MODELOS) {
    let r;
    try {
      r = await fetch(URL_API(m), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify(pedido),
      });
    } catch {
      throw new Error('No pude conectarme con Gemini. Revisá tu conexión.');
    }
    if (r.ok) return r.json();
    const cuerpo = await r.text();
    if (r.status === 404) { ultimo = cuerpo; continue; }
    throw new Error(mensajeError(r.status, cuerpo));
  }
  console.warn('Ningún modelo disponible', ultimo);
  throw new Error('El modelo de Gemini no está disponible. Avisame y lo actualizo.');
}

export async function analizar({ texto, imagenBase64, mime }) {
  const clave = await obtenerClave();
  if (!clave) throw Object.assign(new Error('Falta tu clave de Gemini. Cargala en Perfil.'), { sinClave: true });
  const res = leerRespuesta(await llamarGemini(armarPedido({ texto, imagenBase64, mime }), clave));
  const { alimentosPropios } = await import('./registro.js');
  const base = [...(await alimentosPropios()), ...ALIMENTOS_BASE];
  return { ...res, items: platosAItems(res.platos, base) };
}

/** Prueba la clave con un pedido mínimo de texto. */
export async function probarClave(clave) {
  const r = await llamarGemini(armarPedido({ texto: 'un huevo duro' }), clave);
  return leerRespuesta(r).platos.length > 0;
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
