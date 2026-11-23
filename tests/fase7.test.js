import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proponerAjuste, diasCompletos, CAMBIO_MAXIMO } from '../www/js/adaptativo.js';
import { sugerencias, totalIdea } from '../www/js/sugerencias.js';

const z = n => String(n).padStart(2, '0');
const f = d => { const x = new Date(2026, 10, 30); x.setDate(x.getDate() - d); return `${x.getFullYear()}-${z(x.getMonth() + 1)}-${z(x.getDate())}`; };
const HOY = f(0);
const perfil = { objetivo: 'bajar', sexo: 'f', nacimiento: '1996-05-10', altura_cm: 165, peso_meta: 68, actividad: 'sedentario', ritmo_kg_sem: 0.5 };
const metaActual = { fecha: f(28), kcal_objetivo: 1274, tdee: 1824 };

// 21 días: 3 comidas por día que suman `kcal`, y pesos que bajan `porSemana` kg por semana.
function historia({ kcal, porSemana, dias = 21 }) {
  const comidas = [], pesos = [];
  for (let d = dias; d >= 1; d--) {
    for (let k = 0; k < 3; k++) comidas.push({ fecha: f(d), kcal: kcal / 3 });
    pesos.push({ fecha: f(d), kg: 80 - (porSemana / 7) * (dias - d) });
  }
  return { comidas, pesos };
}

test('si todavía no hay datos suficientes, no propone nada', () => {
  const r = proponerAjuste({ perfil, pesos: [{ fecha: f(2), kg: 80 }], comidas: [], metaActual, hoy: HOY });
  assert.equal(r.listo, false);
  assert.match(r.motivo, /pes/);
  const reciente = proponerAjuste({ perfil, pesos: [], comidas: [], metaActual: { ...metaActual, fecha: f(3) }, hoy: HOY });
  assert.match(reciente.motivo, /menos de una semana/);
});

test('si bajás más rápido de lo esperado comiendo la meta, propone SUBIR (de a poco)', () => {
  // Comiendo 1274 y bajando 1 kg/semana ⇒ gasta bastante más que 1824
  const { comidas, pesos } = historia({ kcal: 1274, porSemana: 1 });
  const r = proponerAjuste({ perfil, pesos, comidas, metaActual, hoy: HOY });
  assert.equal(r.listo, true);
  assert.ok(r.despues > r.antes);
  assert.ok(r.despues - r.antes <= CAMBIO_MAXIMO);
  assert.ok(r.macros.prot > 0);
});

test('si no bajás comiendo la meta, propone bajar, pero nunca por debajo del piso', () => {
  const { comidas, pesos } = historia({ kcal: 1274, porSemana: 0 });
  const r = proponerAjuste({ perfil, pesos, comidas, metaActual, hoy: HOY });
  if (r.listo) {
    assert.ok(r.despues >= 1200, `bajó a ${r.despues}`);
    assert.ok(r.antes - r.despues <= CAMBIO_MAXIMO);
  } else {
    assert.match(r.motivo, /casi lo mismo/);   // ya está en el piso: 1274 → 1200 da < 50 o igual
  }
});

test('los días anotados a medias no cuentan', () => {
  const d = diasCompletos([
    { fecha: 'a', kcal: 400 }, { fecha: 'a', kcal: 500 },   // 900 ≥ 60 % de 1274 y 2 comidas → cuenta
    { fecha: 'b', kcal: 300 },                               // 1 comida → no
    { fecha: 'c', kcal: 200 }, { fecha: 'c', kcal: 200 },   // 400 < 60 % → no
  ], 1274);
  assert.deepEqual(Object.keys(d), ['a']);
});

test('sugerencias: idea de cena que entra en lo que queda', () => {
  const s = sugerencias({ quedan: 500, protFalta: 40, hora: 20, kg: 80, comidasHoy: 2 });
  assert.ok(s.length >= 1);
  const kcal = Number(s[0].texto.match(/~(\d+) kcal/)[1]);
  assert.ok(kcal <= 500 && kcal >= 200, `${kcal}`);
});

test('sugerencias: si te pasaste, caminata opcional y sin culpa', () => {
  const [s] = sugerencias({ quedan: -300, hora: 21, kg: 80, comidasHoy: 3 });
  assert.match(s.texto, /caminata de \d+ minutos/);
  assert.match(s.texto, /Si tenés ganas/);
  assert.doesNotMatch(s.texto, /\b(debés|tenés que|mal)\b/i);
});

test('sugerencias: a la mañana o sin comidas, nada', () => {
  assert.deepEqual(sugerencias({ quedan: 1000, hora: 9, comidasHoy: 1 }), []);
  assert.deepEqual(sugerencias({ quedan: 1000, hora: 20, comidasHoy: 0 }), []);
});

test('las ideas usan alimentos que existen en la base', () => {
  assert.ok(totalIdea({ items: [['pechuga', 1], ['ensalada-mixta', 1]] }).kcal > 300);
});
