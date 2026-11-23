// El gatito de Nathor Fit, dibujado en SVG (diseño propio).
// gatoSVG(estado) devuelve el SVG como texto. Estados: normal, feliz, saluda, siesta, festeja.
// Nunca castiga: no hay estado "con hambre" ni "triste".

const C = {
  pelo: '#F4A259', sombra: '#D9792B', borde: '#C9692A', crema: '#FFF1DE',
  rosa: '#E8798A', mejilla: '#F7A6A0', ojo: '#3B2A1E', collar: '#0F8F6A', blanco: '#ffffff',
};

export const ESTADOS = ['normal', 'feliz', 'saluda', 'siesta', 'festeja'];

let uid = 0;

function ojos(estado) {
  const linea = d => `<path d="${d}" fill="none" stroke="${C.ojo}" stroke-width="4" stroke-linecap="round"/>`;
  if (estado === 'feliz' || estado === 'festeja')
    return linea('M70 90 q9 -11 18 0') + linea('M112 90 q9 -11 18 0');
  if (estado === 'siesta')
    return linea('M70 88 q9 7 18 0') + linea('M112 88 q9 7 18 0');
  // abiertos, con brillo (parpadean)
  const ojo = (x) => `<g class="gt-parpado" style="transform-origin:${x}px 87px">
      <ellipse cx="${x}" cy="87" rx="7.5" ry="8.5" fill="${C.ojo}"/>
      <circle cx="${x + 2.5}" cy="84" r="2.6" fill="${C.blanco}"/></g>`;
  return ojo(79) + ojo(121);
}

function boca(estado) {
  if (estado === 'festeja')
    return `<path d="M91 104 q9 12 18 0 z" fill="${C.ojo}"/><path d="M95 108 q5 4 10 0" fill="${C.rosa}"/>`;
  if (estado === 'siesta')
    return `<path d="M96 105 q4 3 8 0" fill="none" stroke="${C.ojo}" stroke-width="2.5" stroke-linecap="round"/>`;
  return `<path d="M100 102 q-5 7 -11 3 M100 102 q5 7 11 3" fill="none" stroke="${C.ojo}" stroke-width="2.5" stroke-linecap="round"/>`;
}

function brazos(estado) {
  const pata = (cx, cy, rot = 0, cls = '') =>
    `<g class="${cls}" style="transform-origin:${cx}px ${cy + 12}px"><ellipse cx="${cx}" cy="${cy}" rx="10" ry="15" transform="rotate(${rot} ${cx} ${cy})" fill="${C.pelo}" stroke="${C.borde}" stroke-width="2.5"/></g>`;
  if (estado === 'saluda') return pata(82, 150) + pata(146, 112, 35, 'gt-saludo');
  if (estado === 'festeja') return pata(54, 112, -35, 'gt-arriba') + pata(146, 112, 35, 'gt-arriba');
  if (estado === 'siesta') return pata(84, 168, 75) + pata(116, 168, -75);
  return pata(82, 150) + pata(118, 150);
}

function extras(estado, id) {
  if (estado === 'siesta')
    return `<g class="gt-zzz" fill="${C.collar}" font-family="system-ui,sans-serif" font-weight="800">
      <text x="150" y="52" font-size="18">z</text><text x="164" y="36" font-size="14">z</text><text x="175" y="22" font-size="11">z</text></g>`;
  if (estado === 'festeja')
    return `<g class="gt-confeti">
      <rect x="28" y="30" width="8" height="8" rx="2" fill="${C.collar}" transform="rotate(20 32 34)"/>
      <rect x="166" y="40" width="8" height="8" rx="2" fill="${C.rosa}" transform="rotate(-25 170 44)"/>
      <circle cx="40" cy="70" r="4" fill="#F2C14E"/><circle cx="160" cy="76" r="4" fill="${C.collar}"/>
      <rect x="150" y="14" width="6" height="10" rx="2" fill="#F2C14E" transform="rotate(30 153 19)"/></g>`;
  return '';
}

/** Devuelve el SVG del gatito. opciones: { titulo } para accesibilidad. */
export function gatoSVG(estado = 'normal', { titulo = 'Tu gatito' } = {}) {
  if (!ESTADOS.includes(estado)) estado = 'normal';
  const id = `gt${++uid}`;
  const dormido = estado === 'siesta';
  return `<svg class="gato gato-${estado}" viewBox="0 0 200 200" role="img" aria-labelledby="${id}-t" xmlns="http://www.w3.org/2000/svg">
  <title id="${id}-t">${titulo}</title>
  <style>
    .gato .gt-respira{transform-origin:100px 190px;animation:gt-respira ${dormido ? 3.2 : 2.4}s ease-in-out infinite}
    .gato .gt-cola{transform-origin:148px 168px;animation:gt-cola 2.8s ease-in-out infinite}
    .gato .gt-parpado{animation:gt-parpado 4.5s infinite}
    .gato .gt-saludo{animation:gt-saludo .9s ease-in-out infinite}
    .gato .gt-arriba{animation:gt-arriba .7s ease-in-out infinite alternate}
    .gato .gt-zzz{animation:gt-zzz 2.6s ease-in-out infinite}
    .gato .gt-confeti{animation:gt-confeti 1.4s ease-in-out infinite alternate}
    @keyframes gt-respira{50%{transform:scale(1.015,1.03)}}
    @keyframes gt-cola{50%{transform:rotate(9deg)}}
    @keyframes gt-parpado{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
    @keyframes gt-saludo{50%{transform:rotate(-18deg)}}
    @keyframes gt-arriba{to{transform:translateY(-5px)}}
    @keyframes gt-zzz{0%{opacity:0;transform:translateY(6px)}40%{opacity:1}100%{opacity:0;transform:translateY(-8px)}}
    @keyframes gt-confeti{to{transform:translateY(5px)}}
    @media (prefers-reduced-motion:reduce){.gato *{animation:none!important}}
  </style>
  <ellipse cx="100" cy="192" rx="58" ry="6" fill="#000" opacity=".08"/>
  <path class="gt-cola" d="M148 168 C186 164 192 124 168 108" fill="none" stroke="${C.borde}" stroke-width="18" stroke-linecap="round"/>
  <path class="gt-cola" d="M148 168 C186 164 192 124 168 108" fill="none" stroke="${C.pelo}" stroke-width="13" stroke-linecap="round"/>
  <g class="gt-respira">
    <ellipse cx="100" cy="152" rx="52" ry="40" fill="${C.pelo}" stroke="${C.borde}" stroke-width="3"/>
    <ellipse cx="100" cy="160" rx="30" ry="25" fill="${C.crema}"/>
    <ellipse cx="80" cy="189" rx="15" ry="8" fill="${C.crema}" stroke="${C.borde}" stroke-width="2.5"/>
    <ellipse cx="120" cy="189" rx="15" ry="8" fill="${C.crema}" stroke="${C.borde}" stroke-width="2.5"/>
    <g ${dormido ? 'transform="rotate(-8 100 110)"' : ''}>
      <path d="M56 66 L50 22 L90 46 Z" fill="${C.pelo}" stroke="${C.borde}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M144 66 L150 22 L110 46 Z" fill="${C.pelo}" stroke="${C.borde}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M60 56 L57 34 L78 47 Z" fill="${C.mejilla}"/>
      <path d="M140 56 L143 34 L122 47 Z" fill="${C.mejilla}"/>
      <ellipse cx="100" cy="88" rx="56" ry="47" fill="${C.pelo}" stroke="${C.borde}" stroke-width="3"/>
      <path d="M90 44 v11 M100 42 v13 M110 44 v11" stroke="${C.sombra}" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="100" cy="106" rx="22" ry="14" fill="${C.crema}"/>
      <ellipse cx="66" cy="102" rx="9" ry="5" fill="${C.mejilla}" opacity=".75"/>
      <ellipse cx="134" cy="102" rx="9" ry="5" fill="${C.mejilla}" opacity=".75"/>
      ${ojos(estado)}
      <path d="M95 96 h10 l-5 6 z" fill="${C.rosa}" stroke="${C.rosa}" stroke-width="2" stroke-linejoin="round"/>
      ${boca(estado)}
      <path d="M48 98 l16 3 M48 108 l16 -1 M152 98 l-16 3 M152 108 l-16 -1" stroke="${C.borde}" stroke-width="1.8" stroke-linecap="round" opacity=".6"/>
    </g>
    <path d="M64 126 q36 16 72 0" fill="none" stroke="${C.collar}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="100" cy="136" r="7" fill="${C.collar}"/>
    <path d="M97 138 q1 -6 6 -6 q0 6 -6 6 z" fill="${C.blanco}"/>
    ${brazos(estado)}
  </g>
  ${extras(estado, id)}
</svg>`;
}
