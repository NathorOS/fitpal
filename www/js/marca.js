// Fase 8 — Marca de Nathor Fit: la cara del gatito (para el ícono y el logo). Dibujo propio.
// Misma geometría que gato.js (cabeza centrada en 100,88), pero sola y con ojos contentos.

const C = { pelo: '#F4A259', sombra: '#D9792B', borde: '#C9692A', crema: '#FFF1DE', rosa: '#E8798A', mejilla: '#F7A6A0', ojo: '#3B2A1E' };

/** Grupo SVG de la cara (coordenadas 0–200). */
export function caraGato({ trazo = 3 } = {}) {
  return `<g stroke-linejoin="round">
    <path d="M56 66 L50 22 L90 46 Z" fill="${C.pelo}" stroke="${C.borde}" stroke-width="${trazo}"/>
    <path d="M144 66 L150 22 L110 46 Z" fill="${C.pelo}" stroke="${C.borde}" stroke-width="${trazo}"/>
    <path d="M60 56 L57 34 L78 47 Z" fill="${C.mejilla}"/>
    <path d="M140 56 L143 34 L122 47 Z" fill="${C.mejilla}"/>
    <ellipse cx="100" cy="88" rx="56" ry="47" fill="${C.pelo}" stroke="${C.borde}" stroke-width="${trazo}"/>
    <path d="M90 44 v11 M100 42 v13 M110 44 v11" stroke="${C.sombra}" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="100" cy="106" rx="22" ry="14" fill="${C.crema}"/>
    <ellipse cx="66" cy="102" rx="9" ry="5" fill="${C.mejilla}" opacity=".8"/>
    <ellipse cx="134" cy="102" rx="9" ry="5" fill="${C.mejilla}" opacity=".8"/>
    <path d="M70 90 q9 -11 18 0 M112 90 q9 -11 18 0" fill="none" stroke="${C.ojo}" stroke-width="5" stroke-linecap="round"/>
    <path d="M95 96 h10 l-5 6 z" fill="${C.rosa}" stroke="${C.rosa}" stroke-width="2"/>
    <path d="M100 102 q-5 7 -11 3 M100 102 q5 7 11 3" fill="none" stroke="${C.ojo}" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}

/**
 * Ícono de la app: fondo verde lleno (sin transparencia, como piden las tiendas) y la cara del gatito.
 * maskable: la cara entra en el círculo seguro (80 %) para Android.
 */
export function iconoSVG({ maskable = false, redondeado = false } = {}) {
  const k = maskable ? 2.05 : 2.45;
  const tx = 256 - 100 * k, ty = 262 - 80 * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" ${redondeado ? 'rx="112"' : ''} fill="#0F8F6A"/>
  <circle cx="256" cy="${maskable ? 262 : 268}" r="${maskable ? 168 : 196}" fill="#14A57B"/>
  <g transform="translate(${tx} ${ty}) scale(${k})">${caraGato()}</g>
</svg>`;
}

/** Logo para pantallas: cara + nombre (el nombre va en HTML con la fuente de la app). */
export function logoHTML() {
  return `<div class="logo"><img src="img/marca/icon-192.png" alt="" width="40" height="40"><span>Nathor <b>Fit</b></span></div>`;
}
