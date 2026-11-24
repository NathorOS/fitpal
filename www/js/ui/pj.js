// El personaje en pantalla. pjHTML() devuelve un lugar vacío (se puede usar dentro de un template string,
// como el viejo gatoSVG) y hidratar() lo llena con la imagen con la camiseta del equipo ya pintada.
// app.js hidrata solo todo lo que aparece en la página.
import { prepararImagen, prepararFondo } from '../personaje.js';
import { archivoPersonaje } from '../personaje-estado.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Nombres viejos de estados (del gato que había antes), por si algún lugar todavía los usa
const DE_GATO = { normal: 'contento', feliz: 'contento', saluda: 'saludando', siesta: 'fiaca', festeja: 'festejando' };

const actual = { equipo: 'verde', etapa: 'e3', limpieza: 50 };
export function fijarPersonaje(datos) { Object.assign(actual, Object.fromEntries(Object.entries(datos).filter(([, v]) => v != null))); }
export const personajeActual = () => ({ ...actual });

/**
 * Lugar para el personaje. pose: 'contento' | 'fiaca' | … (o los estados del gato viejo).
 * opts: { titulo, etapa, equipo, limpieza, clase }
 */
export function pjHTML(pose = 'contento', { titulo = 'Tu personaje', etapa, equipo, limpieza, clase = '' } = {}) {
  const archivo = archivoPersonaje({ etapa: etapa ?? actual.etapa, pose: DE_GATO[pose] ?? pose, limpieza: limpieza ?? actual.limpieza });
  return `<span class="pj ${clase}" role="img" aria-label="${esc(titulo)}" data-pj="${archivo}"${equipo ? ` data-equipo="${esc(equipo)}"` : ''}></span>`;
}

// Cache: archivo + equipo → URL de la imagen ya pintada (se pinta una sola vez por sesión)
const cache = new Map();
export function urlPersonaje(archivo, equipo = actual.equipo) {
  const clave = `${archivo}|${equipo}`;
  if (!cache.has(clave)) {
    cache.set(clave, (async () => {
      const url = `img/personaje/${archivo}.webp`;
      if (!equipo || equipo === 'verde') return url;                 // sin pintar: la imagen tal cual
      const canvas = await prepararImagen(url, { equipo });
      const blob = await new Promise(ok => canvas.toBlob(ok, 'image/webp', 0.9));
      return blob ? URL.createObjectURL(blob) : canvas.toDataURL();
    })().catch(() => `img/personaje/${archivo}.webp`));
  }
  return cache.get(clave);
}

/** Llena los lugares vacíos. Si cambia el archivo de un lugar ya lleno, hace un fundido. */
export async function hidratar(raiz = document) {
  const lugares = [...raiz.querySelectorAll('.pj[data-pj]')].filter(el => el.dataset.listo !== `${el.dataset.pj}|${el.dataset.equipo ?? actual.equipo}`);
  await Promise.all(lugares.map(async el => {
    const equipo = el.dataset.equipo ?? actual.equipo;
    const marca = `${el.dataset.pj}|${equipo}`;
    el.dataset.listo = marca;
    const src = await urlPersonaje(el.dataset.pj, equipo);
    if (el.dataset.listo !== marca) return;                          // cambió mientras cargaba
    const img = new Image();
    img.alt = ''; img.decoding = 'async'; img.src = src;
    try { await img.decode(); } catch { /* se muestra igual */ }
    const vieja = el.querySelector('img');
    el.append(img);
    if (vieja) { img.classList.add('pj__nueva'); setTimeout(() => vieja.remove(), 450); }
  }));
}

/** Fondo (cuarto, balcón…) con la bandera pintada del equipo. Devuelve una URL (cacheada). */
export function urlFondo(url, equipo = actual.equipo) {
  const clave = `fondo|${url}|${equipo}`;
  if (!cache.has(clave)) {
    cache.set(clave, (async () => {
      if (!equipo || equipo === 'verde') return url;
      const canvas = await prepararFondo(url, { equipo });
      const blob = await new Promise(ok => canvas.toBlob(ok, 'image/webp', 0.85));
      return blob ? URL.createObjectURL(blob) : url;
    })().catch(() => url));
  }
  return cache.get(clave);
}

/** Precarga las imágenes de un equipo (por ejemplo, al elegirlo en el onboarding). */
export const precargar = (archivos, equipo) => Promise.all(archivos.map(a => urlPersonaje(a, equipo)));
