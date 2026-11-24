// Fase 8 — Barra de IMC: 4 tramos del mismo ancho (OMS), con una marca para hoy y otra para la meta.
// El color nunca va solo: cada tramo tiene su nombre debajo y el valor está escrito.
import { IMC_TRAMOS, categoriaImc } from '../objetivo.js';

const CORTES = [15, 18.5, 25, 30, 40];
const es = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 1 });

/** Posición de 0 a 100 dentro de la barra (cada tramo ocupa un cuarto). */
export function posicionImc(v) {
  const x = Math.min(CORTES.at(-1), Math.max(CORTES[0], v));
  const j = CORTES.findIndex((c, n) => x < CORTES[n + 1]);
  const k = j < 0 ? 3 : j;   // 40 o más: al final del último tramo
  const tramo = (x - CORTES[k]) / (CORTES[k + 1] - CORTES[k]);
  return Math.round((k + tramo) * 25 * 10) / 10;
}

export function htmlBarraImc(valor, { meta = null } = {}) {
  const cat = categoriaImc(valor);
  const etiqueta = `IMC ${es(valor)}, ${cat.nombre.toLowerCase()}${meta ? `. Con tu meta: ${es(meta)}, ${categoriaImc(meta).nombre.toLowerCase()}` : ''}.`;
  return `<div class="imc" role="img" aria-label="${etiqueta}">
      <div class="imc__cabecera"><span>Tu IMC</span><b>${es(valor)}</b><span class="imc__cat imc__cat--${cat.id}">${cat.nombre}</span></div>
      <div class="imc__pista">
        ${IMC_TRAMOS.map(t => `<span class="imc__tramo imc__tramo--${t.id}"></span>`).join('')}
        ${meta ? `<span class="imc__marca imc__marca--meta" style="left:${posicionImc(meta)}%">${Math.abs(posicionImc(meta) - posicionImc(valor)) >= 12 ? '<small>Meta</small>' : ''}</span>` : ''}
        <span class="imc__marca" style="left:${posicionImc(valor)}%"><small>Hoy</small></span>
      </div>
      <div class="imc__nombres" aria-hidden="true">${IMC_TRAMOS.map(t => `<span>${t.nombre}</span>`).join('')}</div>
    </div>`;
}
