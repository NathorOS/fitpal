// Fase 7 — Sugerencias para cerrar el día: qué comer con lo que te queda, cómo sumar proteína
// o, si te pasaste, una actividad opcional. Siempre como idea, nunca como obligación.
import { ALIMENTOS_BASE } from './datos/alimentos.js';
import { calcularItem } from './registro.js';
import { ACTIVIDADES, kcalActividad } from './actividad.js';

// Comidas "armadas" que sirven de idea (combinaciones de la base).
const IDEAS = [
  { nombre: 'Pechuga a la plancha con ensalada', items: [['pechuga', 1], ['ensalada-mixta', 1]] },
  { nombre: 'Merluza al horno con puré', items: [['merluza', 1], ['pure', 1]] },
  { nombre: 'Tortilla de papas con ensalada', items: [['tortilla-papa', 1], ['ensalada-mixta', 1]] },
  { nombre: 'Milanesa al horno con ensalada', items: [['mila-carne-horno', 1], ['ensalada-mixta', 1]] },
  { nombre: 'Yogur con banana y avena', items: [['yogur', 1], ['banana', 1], ['avena', 2]] },
  { nombre: 'Atún con arroz y tomate', items: [['atun', 1], ['arroz', 0.5], ['tomate', 1]] },
  { nombre: '2 huevos duros y una fruta', items: [['huevo', 2], ['manzana', 1]] },
  { nombre: 'Guiso de lentejas', items: [['guiso-lentejas', 1]] },
  { nombre: 'Tostadas con queso y jamón', items: [['pan-integral', 2], ['queso-barra', 1], ['jamon', 2]] },
  { nombre: 'Una fruta', items: [['mandarina', 1]] },
];

const base = id => ALIMENTOS_BASE.find(a => a.id === `b:${id}`);
const n = x => Number(x).toLocaleString('es-AR', { maximumFractionDigits: 0 });

export function totalIdea(idea) {
  const its = idea.items.map(([id, n]) => calcularItem(base(id), { cantidad: n }));
  return { kcal: its.reduce((a, x) => a + x.kcal, 0), prot: Math.round(its.reduce((a, x) => a + x.prot, 0)) };
}

/**
 * Hasta 2 sugerencias. datos: { quedan, protFalta, hora, kg, comidasHoy, puedeMoverse }
 * Cada una: { emoji, texto, accion?: { texto, href } }
 */
export function sugerencias({ quedan, protFalta = 0, hora, kg = 70, comidasHoy = 0 }) {
  const out = [];
  if (comidasHoy === 0 || hora < 11) return out;   // a la mañana, o sin nada anotado, no hay nada que sugerir

  if (quedan < -100) {
    // Te pasaste: una actividad OPCIONAL que lo compensa (sin culpa)
    const caminar = ACTIVIDADES.find(a => a.id === 'caminar');
    const porMin = kcalActividad(caminar.met, kg, 60) / 60;
    const min = Math.min(60, Math.max(15, Math.round(-quedan / porMin / 5) * 5));
    out.push({
      emoji: '🚶', texto: `Si tenés ganas, una caminata de ${min} minutos suma unas ${n(porMin * min)} kcal. Y si no, mañana seguimos: cuenta la semana.`,
      accion: { texto: 'Anotar caminata', href: '#/actividad' },
    });
    return out;
  }

  if (hora >= 17 && quedan >= 150) {
    // Una idea de comida que entre en lo que queda, priorizando la proteína
    const opciones = IDEAS.map(i => ({ ...i, ...totalIdea(i) }))
      .filter(i => i.kcal <= quedan && i.kcal >= Math.min(quedan * 0.4, quedan - 50))
      .sort((a, b) => (protFalta > 20 ? b.prot - a.prot : b.kcal - a.kcal));
    const idea = opciones[0] ?? IDEAS.map(i => ({ ...i, ...totalIdea(i) })).filter(i => i.kcal <= quedan).sort((a, b) => b.kcal - a.kcal)[0];
    if (idea) out.push({
      emoji: '🍽️', texto: `Te quedan ${n(quedan)} kcal. Una idea: ${idea.nombre.toLowerCase()} (~${n(idea.kcal)} kcal, ${idea.prot} g de proteína).`,
      accion: { texto: 'Buscar', href: `#/registrar?q=${encodeURIComponent(idea.nombre.split(' ')[0])}` },
    });
  }

  if (hora >= 15 && protFalta >= 30 && out.length < 2) {
    out.push({ emoji: '💪', texto: `Te faltan ${protFalta} g de proteína. Suman fácil: huevo, pollo, atún, yogur, queso o legumbres.` });
  }

  if (hora >= 18 && quedan > 0 && quedan < 150 && out.length < 2) {
    out.push({ emoji: '🎯', texto: `¡Casi en tu meta! Te quedan ${n(quedan)} kcal: alcanza para una fruta o un yogur si tenés hambre.` });
  }
  return out.slice(0, 2);
}
