// El entrenador o el chef en pantalla, con su globo de diálogo.
import { AYUDANTES, decir } from '../ayudantes.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Solo la imagen. */
export function imgAyudante(quien, pose, clase = '') {
  const a = AYUDANTES[quien];
  return `<img class="ayu__img ${clase}" src="img/ayudantes/${quien}-${pose}.webp" alt="${esc(a?.nombre ?? '')}" height="480" decoding="async">`;
}

/**
 * Ayudante con globo. situacion: una de SITUACIONES (pose y frase al azar) o { pose, texto } ya elegidos.
 * opts: { texto (pisa la frase), tam: 'chico'|'normal'|'grande', href, clase, id (del texto) }
 */
export function ayudanteHTML(quien, situacion, { texto, tam = 'normal', href, clase = '', id = '' } = {}) {
  const a = AYUDANTES[quien];
  const d = typeof situacion === 'string' ? decir(quien, situacion) : situacion;
  const etiqueta = href ? 'a' : 'div';
  return `<${etiqueta} class="ayu ayu--${quien} ayu--${tam} ${clase}"${href ? ` href="${esc(href)}"` : ''}>
    ${imgAyudante(quien, d.pose)}
    <div class="ayu__burbuja"><small class="ayu__nombre">${esc(a.rol)} · ${esc(a.nombre)}</small>
      <p class="ayu__texto"${id ? ` id="${esc(id)}"` : ''}>${esc(texto ?? d.texto)}</p>${href ? '<span class="ayu__ir" aria-hidden="true">›</span>' : ''}</div>
  </${etiqueta}>`;
}
