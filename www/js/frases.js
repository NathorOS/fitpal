// Qué dice el personaje y cuándo. Reglas en docs/personaje/FRASES.md. Funciones puras.
import { FRASES } from './frases-banco.js';

export { FRASES };
export const LARGO_MAXIMO = 70;
/** Situaciones donde Cariñoso y Tranqui usan la versión suave. */
export const SENSIBLES = ['pasado', 'racha_cortada', 'subio'];
/** Frases que nombran una comida puntual: solo salen si se anotó esa comida. */
const SOLO_SI = { fernet: /fernet/i, pizza: /pizza|muzza/i };

/**
 * Situación al abrir Hoy (gana la primera que se cumpla).
 * d: { llegoMeta, diasSinEntrar, rachaNueva, rachaCortada, kcal, kcalMeta, comidasHoy, hora, actividadHoy,
 *      aguaMl, aguaMeta, limpieza, bajoPiso }
 * bajoPiso: el día cerró por debajo del mínimo de calorías → null (sin chicana: va el aviso serio).
 */
export function situacionAlAbrir(d) {
  if (d.bajoPiso) return null;
  if (d.llegoMeta) return 'meta';
  if (d.diasSinEntrar >= 3) return 'volvio';
  if (d.rachaNueva) return 'racha';
  if (d.rachaCortada && !d.comidasHoy) return 'racha_cortada';
  if (d.kcalMeta > 0 && d.kcal > d.kcalMeta) return 'pasado';
  if (d.hora >= 14 && !d.comidasHoy) return 'fiaca';
  if (d.hora >= 19 && !d.actividadHoy) return 'quieto';
  if (d.hora >= 21 || d.hora < 6) return 'noche';   // de madrugada también es de noche
  if (d.hora >= 16 && d.aguaMeta > 0 && d.aguaMl < d.aguaMeta / 2) return 'agua';
  if (d.kcalMeta > 0 && d.kcal >= d.kcalMeta * 0.85) return 'cerca';
  if (d.limpieza != null && d.limpieza < 34) return 'sucio';
  if (d.limpieza != null && d.limpieza >= 67 && d.comidasHoy) return 'limpio';
  return d.comidasHoy ? 'bien' : 'vacio';
}

/** ¿Lo que se anotó es "pesado"? (dulces, comida rápida, alcohol, o más de 600 kcal de una vez) */
const PESADO = /alfajor|torta|factura|helado|chocolate|golosina|galletit|dulce de leche|pizza|empanada|hamburgues|pancho|papas fritas|chorip|milanesa|fritura|frito|cerveza|fernet|vino|whisky|vodka|gaseosa|coca/i;
export function esPesado({ nombre = '', kcal = 0, categoria = '' }) {
  return kcal > 600 || ['dulces', 'rapidas', 'alcohol'].includes(categoria) || PESADO.test(nombre);
}

function completar(frase, v) {
  const t = frase.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? '').toString()).replace(/\s{2,}/g, ' ').trim();
  // Mayúscula al principio (también después de ¿ o ¡)
  return t.replace(/^([¿¡]?)(\p{Ll})/u, (_, a, b) => a + b.toUpperCase());
}

/**
 * Elige una frase de la situación, sin repetir las ya dichas hoy.
 * opts: { personalidad, yaDichas: [texto], vars: { n, hora, kg, dias, vasos, comida }, azar: () => number }
 * Devuelve { texto, original } o null.
 */
export function elegirFrase(situacion, { personalidad = 'directo', yaDichas = [], vars = {}, azar = Math.random } = {}) {
  const banco = FRASES[situacion];
  if (!banco) return null;
  const suave = SENSIBLES.includes(situacion) && ['carinoso', 'tranqui'].includes(personalidad) && banco.suave?.length;
  let lista = suave ? banco.suave : banco.picante;
  if (situacion === 'pesado') {
    const comida = String(vars.comida ?? '');
    lista = lista.filter(f => Object.entries(SOLO_SI).every(([k, re]) => !new RegExp(k, 'i').test(f) || re.test(comida)));
    if (!comida) lista = lista.filter(f => !f.includes('{comida}'));
  }
  const nuevas = lista.filter(f => !yaDichas.includes(f));
  const opciones = nuevas.length ? nuevas : lista;
  if (!opciones.length) return null;
  const original = opciones[Math.floor(azar() * opciones.length)];
  return { texto: completar(original, vars), original };
}
