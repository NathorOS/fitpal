// Mapa propio y liviano: baldosas de OpenStreetMap + la ruta dibujada en SVG encima.
// Sin librerías ni claves. Sin internet, el recorrido se ve igual sobre un fondo liso.
// Política de uso de OpenStreetMap: se muestra el crédito y se piden pocas baldosas (las que se ven).

const TAM = 256;
const URL_BALDOSA = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

/** Latitud y longitud → píxeles del "mundo" en el zoom z. */
export function aPixel(lat, lon, z) {
  const n = TAM * 2 ** z;
  const s = Math.sin((Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180);
  return [((lon + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n];
}

/** Zoom más grande en el que entra toda la ruta en un cuadro de ancho × alto (con margen). */
export function zoomQueEntra(ruta, ancho, alto, { min = 3, max = 18, margen = 32 } = {}) {
  if (ruta.length < 2) return max;
  for (let z = max; z > min; z--) {
    const px = ruta.map(([la, lo]) => aPixel(la, lo, z));
    const xs = px.map(p => p[0]), ys = px.map(p => p[1]);
    if (Math.max(...xs) - Math.min(...xs) <= ancho - margen * 2 && Math.max(...ys) - Math.min(...ys) <= alto - margen * 2) return z;
  }
  return min;
}

/**
 * Crea el mapa dentro de `el`. Devuelve { mostrar, destruir }.
 * mostrar({ ruta, centro, zoom, monedas, fantasma }) — centro: [lat, lon] o null para encuadrar la ruta.
 */
export function crearMapa(el, { conBaldosas = true } = {}) {
  el.classList.add('mapa');
  el.innerHTML = `<div class="mapa__baldosas" aria-hidden="true"></div>
    <svg class="mapa__capa" aria-hidden="true"><polyline class="mapa__estela"/><polyline class="mapa__ruta"/><g class="mapa__monedas"></g>
      <g class="mapa__fantasma"></g><g class="mapa__yo"></g></svg>
    <a class="mapa__credito" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>`;
  const capaB = el.querySelector('.mapa__baldosas');
  const svg = el.querySelector('svg');
  const baldosas = new Map();
  let ultimo = null;

  function mostrar({ ruta = [], centro = null, zoom = 17, monedas = [], fantasma = null, yo = true } = {}) {
    const ancho = el.clientWidth || 300, alto = el.clientHeight || 300;
    ultimo = { ruta, centro, zoom, monedas, fantasma, yo };
    let z = zoom;
    let c = centro;
    if (!c) {
      if (!ruta.length) return;
      z = Math.min(zoom, zoomQueEntra(ruta, ancho, alto));
      const px = ruta.map(([la, lo]) => aPixel(la, lo, z));
      const xs = px.map(p => p[0]), ys = px.map(p => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      c = { px: [cx, cy] };
    }
    const [cx, cy] = c.px ?? aPixel(c[0], c[1], z);
    const ox = cx - ancho / 2, oy = cy - alto / 2;      // esquina superior izquierda, en píxeles del mundo
    const aLocal = ([la, lo]) => { const [x, y] = aPixel(la, lo, z); return [x - ox, y - oy]; };

    // Baldosas visibles
    if (conBaldosas) {
      const n = 2 ** z;
      const quedan = new Set();
      for (let tx = Math.floor(ox / TAM); tx <= Math.floor((ox + ancho) / TAM); tx++) {
        for (let ty = Math.floor(oy / TAM); ty <= Math.floor((oy + alto) / TAM); ty++) {
          if (ty < 0 || ty >= n) continue;
          const clave = `${z}/${((tx % n) + n) % n}/${ty}`;
          quedan.add(clave);
          let img = baldosas.get(clave);
          if (!img) {
            img = new Image(TAM, TAM);
            img.alt = '';
            img.decoding = 'async';
            img.onerror = () => { img.hidden = true; };     // sin internet: queda el fondo liso
            img.src = URL_BALDOSA(z, ((tx % n) + n) % n, ty);
            baldosas.set(clave, img);
            capaB.append(img);
          }
          img.style.transform = `translate(${Math.round(tx * TAM - ox)}px, ${Math.round(ty * TAM - oy)}px)`;
        }
      }
      for (const [k, img] of baldosas) if (!quedan.has(k)) { img.remove(); baldosas.delete(k); }
    }

    // Ruta, monedas, fantasma y vos
    svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
    const pts = ruta.map(p => aLocal(p).map(v => v.toFixed(1)).join(',')).join(' ');
    svg.querySelector('.mapa__ruta').setAttribute('points', pts);
    svg.querySelector('.mapa__estela').setAttribute('points', pts);
    svg.querySelector('.mapa__monedas').innerHTML = monedas.map(p => {
      const [x, y] = aLocal(p);
      return `<circle class="mapa__moneda" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"/>`;
    }).join('');
    svg.querySelector('.mapa__fantasma').innerHTML = fantasma
      ? (([x, y]) => `<text class="mapa__fantasma-txt" x="${x.toFixed(1)}" y="${y.toFixed(1)}">👻</text>`)(aLocal(fantasma)) : '';
    const fin = ruta.at(-1);
    svg.querySelector('.mapa__yo').innerHTML = yo && fin
      ? (([x, y]) => `<circle class="mapa__yo-halo" cx="${x}" cy="${y}" r="16"/><circle class="mapa__yo-punto" cx="${x}" cy="${y}" r="8"/>`)(aLocal(fin)) : '';
  }

  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => ultimo && mostrar(ultimo)) : null;
  ro?.observe(el);
  return { mostrar, destruir: () => { ro?.disconnect(); baldosas.clear(); el.replaceChildren(); } };
}

/** Punto de la ruta a `metros` desde el inicio (para dibujar monedas y el fantasma sobre tu recorrido). */
export function puntoEnRuta(ruta, metros, distancia) {
  if (!ruta.length || metros < 0) return null;
  let acum = 0;
  for (let i = 1; i < ruta.length; i++) {
    const a = { lat: ruta[i - 1][0], lon: ruta[i - 1][1] }, b = { lat: ruta[i][0], lon: ruta[i][1] };
    const d = distancia(a, b);
    if (acum + d >= metros) {
      const f = d ? (metros - acum) / d : 0;
      return [a.lat + (b.lat - a.lat) * f, a.lon + (b.lon - a.lon) * f];
    }
    acum += d;
  }
  return null;
}
