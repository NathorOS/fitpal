// Fase 8 — Escena ilustrada de Hoy (dibujo propio): lomas, cielo y detalles que cambian con la hora.
// Es decorativa (aria-hidden). momento: 'manana' | 'tarde' | 'noche'.

export function momentoDelDia(hora = new Date().getHours()) {
  if (hora >= 20 || hora < 6) return 'noche';
  if (hora >= 17) return 'tarde';
  return 'manana';
}

const PALETAS = {
  manana: { cielo1: '#D8F3E6', cielo2: '#BDE9D5', astro: '#FFD66B', halo: '#FFF2C2', loma1: '#A3DEC4', loma2: '#86D1B0', loma3: '#6CC39D', nube: '#ffffff', flor: '#F4A259', tallo: '#4FA582' },
  tarde:  { cielo1: '#FCE3C8', cielo2: '#D3EEDC', astro: '#F6A65A', halo: '#FDDDB6', loma1: '#A9DABF', loma2: '#8CCCAD', loma3: '#71BE9A', nube: '#FFF6EC', flor: '#E8798A', tallo: '#549C79' },
  noche:  { cielo1: '#173D35', cielo2: '#235448', astro: '#F3EBC9', halo: '#2E6456', loma1: '#2B6152', loma2: '#2F6B5A', loma3: '#347563', nube: '#3A7564', flor: '#F3EBC9', tallo: '#4C8D7A' },
};

export function escenaSVG(momento = momentoDelDia()) {
  const p = PALETAS[momento] ?? PALETAS.manana;
  const noche = momento === 'noche';
  const estrellas = noche ? [[40, 40, 1.6], [92, 74, 1.2], [150, 30, 1.4], [222, 58, 1.1], [262, 22, 1.5], [318, 92, 1.2], [360, 50, 1.6], [18, 110, 1.1]]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#F3EBC9" opacity=".85"/>`).join('') : '';
  const nube = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})" fill="${p.nube}" opacity="${noche ? 0.35 : 0.9}">
      <ellipse cx="0" cy="10" rx="34" ry="12"/><circle cx="-12" cy="2" r="13"/><circle cx="8" cy="-2" r="17"/></g>`;
  const flor = (x, y) => `<g transform="translate(${x} ${y})"><path d="M0 0v-12" stroke="${p.tallo}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="0" cy="-14" r="4.5" fill="${p.flor}"/><circle cx="0" cy="-14" r="1.8" fill="#FFF1DE"/></g>`;
  const pasto = (x, y) => `<path d="M${x} ${y} q2 -9 4 0 q2 -12 4 0 q2 -8 4 0" fill="none" stroke="${p.tallo}" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>`;
  return `<svg class="escena" viewBox="0 0 400 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="esc-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.cielo1}"/><stop offset="1" stop-color="${p.cielo2}"/></linearGradient></defs>
    <rect width="400" height="400" fill="url(#esc-cielo)"/>
    ${estrellas}
    <circle cx="336" cy="74" r="40" fill="${p.halo}" opacity="${noche ? 0.5 : 0.6}"/>
    <circle cx="336" cy="74" r="24" fill="${p.astro}"/>
    ${noche ? `<circle cx="346" cy="66" r="21" fill="${p.cielo1}"/>` : ''}
    ${nube(70, 92, 1)}${nube(250, 128, 0.75)}
    <path d="M0 262 C70 226 140 236 210 258 S330 236 400 250 V400 H0Z" fill="${p.loma1}"/>
    <g transform="translate(330 252)"><rect x="-3" y="-6" width="6" height="22" rx="3" fill="#8A5A3B" opacity=".8"/><circle cx="0" cy="-18" r="17" fill="${p.loma3}"/><circle cx="-10" cy="-8" r="11" fill="${p.loma3}"/><circle cx="11" cy="-9" r="12" fill="${p.loma3}"/></g>
    <path d="M0 300 C90 276 170 300 250 292 S360 270 400 284 V400 H0Z" fill="${p.loma2}"/>
    <path d="M0 338 C100 322 300 322 400 338 V400 H0Z" fill="${p.loma3}"/>
    ${flor(46, 312)}${flor(62, 318)}${flor(356, 306)}${pasto(96, 300)}${pasto(300, 296)}${pasto(20, 336)}${pasto(372, 334)}
  </svg>`;
}
