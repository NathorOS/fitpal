// Fase 8 — Rueda de números: se desliza con el dedo, con la rueda del mouse o con las flechas.
// Para lectores de pantalla es un "spinbutton" (flechas arriba/abajo, Inicio/Fin, RePág/AvPág).
// Uso: const r = montarRueda(lugar, { valores, valor, etiqueta, texto, alCambiar }); r.valor()

const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Valores de una rueda de números enteros o con un paso fijo.
 * rango(35, 40) → [35, 36, …, 40] · rango(0, 9) → décimas
 */
export function rango(min, max, paso = 1) {
  const out = [];
  for (let v = min; v <= max + 1e-9; v += paso) out.push(Math.round(v * 100) / 100);
  return out;
}

/** El índice del valor más cercano (para valores que no están exactos en la lista). */
export function indiceCercano(valores, v) {
  let mejor = 0;
  valores.forEach((x, k) => { if (Math.abs(x - v) < Math.abs(valores[mejor] - v)) mejor = k; });
  return mejor;
}

export function montarRueda(lugar, { valores, valor, etiqueta, texto = v => String(v), alCambiar = () => {} }) {
  let i = indiceCercano(valores, valor ?? valores[0]);
  const el = document.createElement('div');
  el.className = 'rueda';
  el.tabIndex = 0;
  el.setAttribute('role', 'spinbutton');
  el.setAttribute('aria-label', etiqueta);
  el.setAttribute('aria-valuemin', String(valores[0]));
  el.setAttribute('aria-valuemax', String(valores.at(-1)));
  el.innerHTML = `<ol class="rueda__lista" aria-hidden="true">${valores.map((v, k) =>
    `<li data-k="${k}">${texto(v)}</li>`).join('')}</ol>`;
  lugar.replaceChildren(el);
  const items = el.querySelectorAll('li');
  const alto = () => items[0]?.offsetHeight || 44;

  function marcar(k, avisar = true) {
    k = Math.max(0, Math.min(valores.length - 1, k));
    if (items[i]) items[i].classList.remove('activo');
    i = k;
    items[i].classList.add('activo');
    el.setAttribute('aria-valuenow', String(valores[i]));
    el.setAttribute('aria-valuetext', texto(valores[i]));
    if (avisar) alCambiar(valores[i]);
  }
  // Mientras la rueda se mueve sola hacia un valor (flechas, toque), los pasos intermedios
  // del desplazamiento no cuentan: si no, varias flechas seguidas "pierden" pasos.
  let destino = null, reloj = 0;
  function ir(k, suave = true) {
    k = Math.max(0, Math.min(valores.length - 1, k));
    destino = k;
    clearTimeout(reloj);
    reloj = setTimeout(() => { destino = null; }, 600);
    el.scrollTo({ top: k * alto(), behavior: suave && !quieto() ? 'smooth' : 'auto' });
    marcar(k);
  }

  // Al deslizar: el valor que queda en la banda del medio es el elegido.
  let cuadro = 0;
  el.addEventListener('scroll', () => {
    cancelAnimationFrame(cuadro);
    cuadro = requestAnimationFrame(() => {
      const k = Math.round(el.scrollTop / alto());
      if (destino != null) { if (k === destino) destino = null; return; }
      if (k !== i) marcar(k);
    });
  }, { passive: true });

  el.addEventListener('keydown', e => {
    const salto = { ArrowUp: -1, ArrowDown: 1, PageUp: -10, PageDown: 10 }[e.key];
    if (salto) { e.preventDefault(); ir(i + salto); }
    if (e.key === 'Home') { e.preventDefault(); ir(0); }
    if (e.key === 'End') { e.preventDefault(); ir(valores.length - 1); }
  });
  el.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (li) ir(Number(li.dataset.k));
  });

  marcar(i, false);
  // Hay que esperar a que esté en pantalla para poder medir y desplazar.
  requestAnimationFrame(() => { el.scrollTop = i * alto(); });

  return {
    el,
    valor: () => valores[i],
    fijar: v => ir(indiceCercano(valores, v), false),
  };
}

/**
 * Dos ruedas (enteros + decimales) que funcionan como un solo número: 70 , 5 kg.
 * dec: 'decimas' (0–9) o 'medios' (0 y 5).
 */
export function montarRuedasDecimal(lugar, { min, max, valor, dec = 'decimas', etiqueta, unidad, alCambiar = () => {} }) {
  const enteros = rango(Math.floor(min), Math.floor(max));
  const decimales = dec === 'medios' ? [0, 5] : rango(0, 9);
  const v0 = valor ?? min;
  let e = Math.floor(v0 + 1e-9);
  let d = Math.round((v0 - e) * 10);
  if (dec === 'medios') d = d >= 3 ? 5 : 0;
  const total = () => Math.round((e + d / 10) * 10) / 10;
  lugar.innerHTML = `<div class="ruedas">
      <span class="ruedas__banda" aria-hidden="true"></span>
      <div class="ruedas__col" data-e></div>
      <span class="ruedas__coma" aria-hidden="true">,</span>
      <div class="ruedas__col ruedas__col--chica" data-d></div>
      <span class="ruedas__unidad">${unidad}</span>
    </div>`;
  const re = montarRueda(lugar.querySelector('[data-e]'), {
    valores: enteros, valor: e, etiqueta: `${etiqueta}: ${unidad} enteros`,
    alCambiar: v => { e = v; alCambiar(total()); },
  });
  const rd = montarRueda(lugar.querySelector('[data-d]'), {
    valores: decimales, valor: d, etiqueta: `${etiqueta}: décimas`,
    alCambiar: v => { d = v; alCambiar(total()); },
  });
  return { valor: total, fijar: v => { re.fijar(Math.floor(v)); rd.fijar(Math.round((v - Math.floor(v)) * 10)); } };
}

/** Una sola rueda de enteros con su unidad (p. ej. la altura en cm). */
export function montarRuedaEntera(lugar, { min, max, valor, etiqueta, unidad, alCambiar = () => {} }) {
  lugar.innerHTML = `<div class="ruedas">
      <span class="ruedas__banda" aria-hidden="true"></span>
      <div class="ruedas__col" data-e></div>
      <span class="ruedas__unidad">${unidad}</span>
    </div>`;
  return montarRueda(lugar.querySelector('[data-e]'), {
    valores: rango(min, max), valor: Math.round(valor ?? min), etiqueta: `${etiqueta} (${unidad})`, alCambiar,
  });
}
