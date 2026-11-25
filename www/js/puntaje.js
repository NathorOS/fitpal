// Fase 5 — Puntaje nutricional (0–100) de una comida y del día, con consejos simples.
// Es orientativo: premia proteína, fibra, porciones razonables y grasas moderadas. Nunca reta.

const lim = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

/**
 * Puntaje de una comida a partir de sus totales y la meta del día.
 * Partes: proteína 35 · fibra 20 · tamaño de la porción 25 · grasas 20.
 */
export function puntajeComida({ kcal, prot = 0, grasa = 0, fibra = 0 }, metaDia = 2000) {
  if (!(kcal > 0)) return null;
  const porComida = metaDia / 3;
  const protDens = (prot * 100) / kcal;            // g de proteína cada 100 kcal
  const fibraDens = (fibra * 100) / kcal;          // g de fibra cada 100 kcal
  const pctGrasa = (grasa * 9) / kcal;             // parte de las kcal que viene de grasas
  const pProt = 35 * lim(protDens / 6);
  const pFibra = 20 * lim(fibraDens / 1.5);
  const exceso = kcal / porComida;
  const pTam = 25 * (exceso <= 1.2 ? 1 : lim(1 - (exceso - 1.2) / 1.3));
  const pGrasa = 20 * (pctGrasa <= 0.35 ? 1 : lim(1 - (pctGrasa - 0.35) / 0.25));
  return Math.round(pProt + pFibra + pTam + pGrasa);
}

export function etiquetaPuntaje(p) {
  if (p == null) return '';
  if (p >= 80) return 'Excelente';
  if (p >= 60) return 'Bueno';
  if (p >= 40) return 'Regular';
  return 'Se puede mejorar';
}

/** Hasta 2 consejos concretos y amables para la próxima comida. */
export function consejosComida({ kcal, prot = 0, grasa = 0, fibra = 0 }, metaDia = 2000) {
  const out = [];
  if (!(kcal > 0)) return out;
  if ((prot * 100) / kcal < 4) out.push('Sumale una fuente de proteína: huevo, pollo, carne magra, atún, legumbres o queso.');
  if ((fibra * 100) / kcal < 0.8) out.push('Agregá verduras o una fruta: suman fibra y te dejan más satisfecho.');
  if (kcal > (metaDia / 3) * 1.6) out.push('Fue una comida grande. Repartila en dos momentos la próxima vez si te queda cómodo.');
  if ((grasa * 9) / kcal > 0.5) out.push('Tenía bastante grasa: probá al horno o a la plancha en vez de frito.');
  if (!out.length) out.push('¡Buena combinación! Repetila cuando quieras.');
  return out.slice(0, 2);
}

/**
 * Puntaje del día (0–100): cerca de la meta 40 · proteína 25 · agua 15 · movimiento 15 · fibra 5.
 * (Misma idea que calculos.puntajeDia, con la meta de agua y de movimiento personalizadas.)
 */
export function puntajeDelDia(d) {
  if (!(d.kcal > 0)) return null;
  return Math.round(misionesDelDia(d).reduce((a, m) => a + m.peso * m.avance, 0));
}

/**
 * Las partes del puntaje del día como misiones (avance 0–1). Se ven en Hoy con su tilde.
 * "Cerca de tu meta" se cumple tanto por arriba como por abajo: nunca premia comer de menos.
 */
export function misionesDelDia({ kcal = 0, kcalMeta, prot = 0, protMeta, aguaMl = 0, aguaMeta = 2000, minutosActividad = 0, pasos = 0, fibra = 0 }) {
  const m = (id, nombre, peso, avance, umbral = 1) => ({ id, nombre, peso, avance, hecha: avance >= umbral });
  return [
    m('meta', 'Quedar cerca de tu meta', 40, kcalMeta && kcal > 0 ? lim(1 - Math.abs(kcal - kcalMeta) / kcalMeta) : 0, 0.9),
    m('prot', 'Llegar a tu proteína', 25, protMeta ? lim(prot / protMeta) : 0, 0.9),
    m('agua', 'Tomar tu agua', 15, lim(aguaMl / aguaMeta)),
    m('mov', 'Moverte 30 min u 8000 pasos', 15, Math.max(lim(minutosActividad / 30), lim(pasos / 8000))),
    m('fibra', 'Comer 25 g de fibra', 5, lim(fibra / 25)),
  ];
}
