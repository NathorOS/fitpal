// Personaje (rediseño): las imágenes vienen de Gemini con fondo magenta y camiseta verde chillón.
// Acá se recorta el fondo y se pinta la camiseta con los colores del equipo elegido.
// Funciones puras sobre los píxeles (RGBA, Uint8ClampedArray) para poder probarlas en Node.

/** Equipos: base + dibujo. Colores sin escudos ni marcas. */
export const EQUIPOS = {
  river:      { nombre: 'River',            base: [244, 243, 238], dibujo: { tipo: 'banda-diagonal', color: [214, 36, 46] } },
  boca:       { nombre: 'Boca',             base: [24, 56, 140],   dibujo: { tipo: 'franja', color: [246, 196, 0] } },
  racing:     { nombre: 'Racing',           base: [244, 243, 238], dibujo: { tipo: 'bastones', color: [104, 180, 228], n: 5 } },
  independiente: { nombre: 'Independiente', base: [196, 28, 36],  dibujo: null },
  sanlorenzo: { nombre: 'San Lorenzo',      base: [30, 46, 110],   dibujo: { tipo: 'bastones', color: [180, 24, 40], n: 5 } },
  seleccion:  { nombre: 'Selección',        base: [244, 243, 238], dibujo: { tipo: 'bastones', color: [117, 170, 219], n: 5 } },
  verde:      { nombre: 'Verde',            base: null,            dibujo: null },   // la original de Gemini
};
export const EQUIPOS_AZAR = ['river', 'boca', 'racing', 'independiente', 'sanlorenzo', 'seleccion'];

/** Tono (0–360), saturación y brillo (0–1). */
export function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx / 255];
}

/** ¿Cuánto tiene de magenta de fondo? (rojo y azul altos, verde bajo) */
export const magenta = (r, g, b) => Math.min(r, b) - g;

/**
 * Saca el fondo magenta (también la sombra violeta bajo los pies) y quita el tinte magenta de los bordes.
 * Modifica `px` (RGBA) en el lugar.
 */
export function recortarFondo(px) {
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const m = magenta(r, g, b);
    if (m <= 30) continue;
    const alfa = Math.max(0, Math.min(1, 1 - (m - 30) / 90));
    if (alfa === 0) { px[i + 3] = 0; continue; }
    // Borde: se le quita el magenta que quedó mezclado (queda el color del contorno)
    const exceso = Math.max(0, Math.min(r, b) - g);
    px[i] = r - exceso; px[i + 2] = b - exceso;
    px[i + 3] = Math.round(px[i + 3] * alfa);
  }
  return px;
}

/** ¿Es un píxel de la camiseta verde? */
export function esCamiseta(r, g, b) {
  const [h, s, v] = hsv(r, g, b);
  return h >= 72 && h <= 165 && s >= 0.3 && v >= 0.12;
}

/**
 * Pinta la camiseta: conserva las sombras y arrugas (el brillo del verde) y aplica los colores del equipo.
 * px: RGBA · ancho/alto de la imagen.
 */
export function pintarCamiseta(px, ancho, alto, equipo) {
  const e = EQUIPOS[equipo] ?? EQUIPOS.verde;
  if (!e.base) return px;
  // Caja de la camiseta, para ubicar franjas y bandas. Se usan los percentiles 2 y 98 (no el mínimo
  // y el máximo): así un píxel verde suelto (migas, reflejos) no agranda la caja.
  const mascara = new Uint8Array(ancho * alto);
  const porX = new Uint32Array(ancho), porY = new Uint32Array(alto);
  let n = 0;
  for (let y = 0, k = 0; y < alto; y++) for (let x = 0; x < ancho; x++, k++) {
    const i = k * 4;
    if (px[i + 3] && esCamiseta(px[i], px[i + 1], px[i + 2])) { mascara[k] = 1; porX[x]++; porY[y]++; n++; }
  }
  if (n < 50) return px;
  const percentil = (hist, p) => { let acc = 0; for (let j = 0; j < hist.length; j++) { acc += hist[j]; if (acc >= n * p) return j; } return hist.length - 1; };
  const x0 = percentil(porX, 0.02), x1 = percentil(porX, 0.98), y0 = percentil(porY, 0.02), y1 = percentil(porY, 0.98);
  if (x1 <= x0 || y1 <= y0) return px;
  const w = x1 - x0, h = y1 - y0, REF = 0.93;
  const d = e.dibujo;
  // Banda diagonal: del hombro izquierdo (visto de frente) a la cadera derecha
  const ax = x0 + 0.12 * w, ay = y0, bx = x0 + 0.98 * w, by = y0 + h;
  const largo = Math.hypot(bx - ax, by - ay);
  const colorEn = (x, y) => {
    if (!d) return e.base;
    if (d.tipo === 'banda-diagonal') {
      const dist = Math.abs((by - ay) * x - (bx - ax) * y + bx * ay - by * ax) / largo;
      return dist < 0.11 * w ? d.color : e.base;
    }
    if (d.tipo === 'franja') { const t = (y - y0) / h; return t > 0.3 && t < 0.47 ? d.color : e.base; }
    if (d.tipo === 'bastones') return Math.floor(((x - x0) / w) * (d.n * 2 - 1)) % 2 === 1 ? d.color : e.base;
    return e.base;
  };
  for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) {
    const k = y * ancho + x;
    if (!mascara[k]) continue;
    const i = k * 4;
    const v = Math.max(px[i], px[i + 1], px[i + 2]) / 255;
    const sombra = Math.min(1.04, v / REF);
    const c = colorEn(x, y);
    px[i] = Math.min(255, c[0] * sombra); px[i + 1] = Math.min(255, c[1] * sombra); px[i + 2] = Math.min(255, c[2] * sombra);
  }
  return px;
}

// ---------------------------------------------------------------------------
// En el navegador: carga una imagen y devuelve un canvas recortado y pintado.
export async function prepararImagen(url, { equipo = 'river' } = {}) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const datos = g.getImageData(0, 0, c.width, c.height);
  recortarFondo(datos.data);
  pintarCamiseta(datos.data, c.width, c.height, equipo);
  g.putImageData(datos, 0, 0);
  return c;
}
