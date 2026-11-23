import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizar, buscar, calcularItem, itemRapido, sumar, momentoPorHora, armarAlimentoPropio, textoCantidad,
} from '../www/js/registro.js';
import { ALIMENTOS_BASE } from '../www/js/datos/alimentos.js';

const por = id => ALIMENTOS_BASE.find(a => a.id === `b:${id}`);

test('la base tiene comida argentina, ids únicos y datos completos', () => {
  assert.ok(ALIMENTOS_BASE.length >= 120, `hay ${ALIMENTOS_BASE.length}`);
  const ids = new Set(ALIMENTOS_BASE.map(a => a.id));
  assert.equal(ids.size, ALIMENTOS_BASE.length);
  for (const a of ALIMENTOS_BASE) {
    assert.ok(a.porciones.length > 0 && a.porciones.every(p => p.g > 0), a.nombre);
    const { kcal, prot, carb, grasa, alcohol } = a.por100;
    assert.ok(kcal >= 0 && kcal <= 900, a.nombre);
    // Las kcal tienen que cerrar con los macros (4/4/9, alcohol 7) con margen por redondeos y fibra.
    const estimado = prot * 4 + carb * 4 + grasa * 9 + alcohol * 7;
    assert.ok(Math.abs(estimado - kcal) <= Math.max(25, kcal * 0.2), `${a.nombre}: ${kcal} vs ${Math.round(estimado)}`);
  }
});

test('normalizar quita tildes y mayúsculas', () => {
  assert.equal(normalizar('Ñoquis CON Salsa Fíleto'), 'noquis con salsa fileto');
});

test('buscar: "mila" trae milanesas primero; sin tildes; varias palabras', () => {
  const r = buscar('mila', ALIMENTOS_BASE);
  assert.match(r[0].nombre, /^Milanesa/);
  assert.ok(buscar('noquis', ALIMENTOS_BASE).some(a => a.nombre === 'Ñoquis de papa'));
  const r2 = buscar('empanada pollo', ALIMENTOS_BASE);
  assert.equal(r2[0].nombre, 'Empanada de pollo');
  assert.ok(buscar('birra', ALIMENTOS_BASE).some(a => a.nombre === 'Cerveza'), 'busca por sinónimo');
  assert.deepEqual(buscar('   ', ALIMENTOS_BASE), []);
});

test('calcularItem por porción y por gramos', () => {
  const huevo = por('huevo');                       // 143 kcal/100 g, unidad 50 g
  const dos = calcularItem(huevo, { cantidad: 2 });
  assert.equal(dos.g, 100);
  assert.equal(dos.kcal, 143);
  assert.equal(dos.prot, 12.6);
  const gramos = calcularItem(huevo, { cantidad: 75, unidad: 'g' });
  assert.equal(gramos.kcal, 107);
  assert.equal(textoCantidad(dos), '2 unidad');
  assert.equal(textoCantidad(gramos), '75 g');
});

test('sumar ítems y comidas', () => {
  const a = calcularItem(por('mila-carne-horno'), { cantidad: 1 });   // 150 g → 315 kcal
  const b = calcularItem(por('pure'), { cantidad: 1 });               // 200 g → 210 kcal
  const r = itemRapido({ nombre: 'Postre', kcal: 150.4 });
  assert.equal(sumar([a, b, r]).kcal, 315 + 210 + 150);
  assert.equal(sumar([{ items: [a] }, { items: [b] }]).kcal, 525);
});

test('itemRapido sin nombre ni macros', () => {
  const r = itemRapido({ kcal: '300' });
  assert.equal(r.nombre, 'Registro rápido');
  assert.equal(r.kcal, 300);
  assert.equal(r.prot, 0);
});

test('momento según la hora', () => {
  assert.equal(momentoPorHora(8), 'desayuno');
  assert.equal(momentoPorHora(13), 'almuerzo');
  assert.equal(momentoPorHora(17), 'merienda');
  assert.equal(momentoPorHora(21), 'cena');
  assert.equal(momentoPorHora(2), 'colacion');
});

test('alimento propio se guarda por 100 g y vuelve a dar lo cargado', () => {
  const a = armarAlimentoPropio({ nombre: 'Tarta de la abuela', porcion: 'porción', g: 200, kcal: 500, prot: 20 });
  assert.equal(a.por100.kcal, 250);
  const it = calcularItem({ ...a, id: 'p:1' }, { cantidad: 1 });
  assert.equal(it.kcal, 500);
  assert.equal(it.prot, 20);
});
