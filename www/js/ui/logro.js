// Festejo de un logro nuevo (hito de peso, racha, insignia) o del cofre de la semana. Parámetro: id
import { obtener, todos } from '../db.js';
import { confeti } from './festejo.js';
import { pjHTML, hidratar } from './pj.js';
import { marcarVistos } from '../juego.js';
import { premiosGanados } from '../personaje-estado.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Nombre y frase de cada logro. Las imágenes están en img/insignias/<id>.webp */
export const LOGROS = {
  'hito-1kg': ['Primer kilo menos', 'El primero cuesta. Los que siguen, también, pero ya sabés cómo.'],
  'hito-5kg': ['5 kilos menos', 'Cinco kilos. Eso ya no es casualidad.'],
  'hito-10kg': ['10 kilos menos', 'Diez kilos. Te tengo que comprar ropa nueva.'],
  'hito-15kg': ['15 kilos menos', 'Quince. Ya no te reconoce ni la balanza.'],
  'hito-20kg': ['20 kilos menos', 'Veinte kilos. Sos otra persona, literal.'],
  'hito-meta': ['Meta puesta', 'Ya sabés a dónde vas. Ahora, a caminar.'],
  'hito-llegada': ['¡Llegaste a tu meta!', 'Ahora viene lo difícil: quedarte acá.'],
  'hito-mantener': ['Un mes manteniendo', 'Un mes firme. Esto ya es tuyo.'],
  'racha-3': ['3 días seguidos', 'Tres días al hilo. Mirá vos.'],
  'racha-7': ['Una semana seguida', 'Siete días sin fallar. Ni yo me lo creía.'],
  'racha-14': ['Dos semanas seguidas', 'Catorce días. Esto ya es costumbre, no suerte.'],
  'racha-30': ['Un mes seguido', 'Treinta días. Sos de otro planeta.'],
  'logro-primera-comida': ['Primera comida anotada', 'Arrancamos. El primer paso ya está.'],
  'logro-primera-foto': ['Primera foto', 'Le sacaste foto al plato. Bien moderno.'],
  'logro-primer-entreno': ['Primer entrenamiento', 'Por fin te moviste. Que no sea el último.'],
  'logro-agua100': ['100 litros de agua', 'Cien litros. Sos un tanque australiano.'],
  'logro-primera-semana': ['Una semana anotando', 'Siete días con datos. Ahora sí hay con qué trabajar.'],
  'logro-30-dias': ['30 días anotando', 'Un mes entero. Esto no lo hace cualquiera.'],
  'logro-racha30': ['Racha de 30', 'Treinta seguidos. Respeto.'],
  cofre: ['¡Cofre de la semana!', 'Cumpliste los retos de la semana. Hay premio nuevo para el cuarto.'],
};

export async function montar(c, params = new URLSearchParams()) {
  const id = params.get('id') ?? '';
  const perfil = await obtener('perfil', 'main');
  const [titulo, frase] = LOGROS[id] ?? (id.startsWith('reto-') ? ['Reto cumplido', 'Uno más. Seguí así.'] : ['¡Logro nuevo!', 'Bien ahí.']);
  const logros = await todos('logros');
  const premio = id === 'cofre' || /^(hito-\d|hito-llegada|racha-)/.test(id) ? premiosGanados(logros).at(-1) : null;
  const imagen = id === 'cofre' ? 'cofre-abierto' : id;

  c.innerHTML = `
    <section class="logro">
      <img class="efecto efecto--confeti logro__confeti" src="img/efectos/confeti.webp" alt="">
      <div class="logro__pj">${pjHTML('con-un-trofeo', { titulo: `${perfil?.gato?.nombre || 'Tu personaje'} con un trofeo` })}</div>
      <img class="logro__insignia" src="img/insignias/${esc(imagen)}.webp" alt="" width="128" height="128">
      <h1 tabindex="-1">${esc(titulo)}</h1>
      <p class="logro__frase">${esc(frase)}</p>
      ${premio ? `<p class="logro__premio"><img src="img/escena/${premio.id}.webp" alt="" width="56" height="56"> Premio nuevo para tu cuarto</p>` : ''}
      <a class="btn" href="#/hoy" data-seguir>Seguir</a>
    </section>`;
  hidratar(c);
  c.querySelector('h1').focus({ preventScroll: true });
  setTimeout(() => confeti(c.querySelector('.logro__insignia'), { cantidad: 36, alcance: 1.4 }), 300);
  // Los demás logros nuevos de hoy quedan vistos: se festeja uno por vez para no cansar
  c.querySelector('[data-seguir]').addEventListener('click', () => marcarVistos(logros.filter(l => !l.visto).map(l => l.id)));
  await marcarVistos([id]);
}
