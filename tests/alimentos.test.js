import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALIMENTOS_BASE } from '../www/js/datos/alimentos.js';
import { buscar, alimentosAprendidos, calcularItem } from '../www/js/registro.js';

const primero = q => buscar(q, ALIMENTOS_BASE)[0]?.nombre;

test('la base ampliada tiene más de 400 alimentos sin ids repetidos', () => {
  assert.ok(ALIMENTOS_BASE.length > 400, `hay ${ALIMENTOS_BASE.length}`);
  assert.equal(new Set(ALIMENTOS_BASE.map(a => a.id)).size, ALIMENTOS_BASE.length);
});

test('encuentra cosas de todos los días que antes faltaban', () => {
  assert.equal(primero('mate dulce'), 'Mate dulce');
  assert.equal(primero('mate con azúcar'), 'Mate dulce');
  assert.equal(primero('café con azúcar'), 'Café con azúcar');
  assert.equal(primero('chipa'), 'Chipá');
  assert.equal(primero('chocotorta'), 'Chocotorta');
});

test('la búsqueda ignora "de", "con" y acepta plurales', () => {
  assert.equal(primero('tostadas con manteca'), 'Tostada con manteca');
  assert.equal(primero('empanadas de verdura'), 'Empanada de verdura');
  assert.ok(buscar('huevos', ALIMENTOS_BASE).some(a => a.nombre === 'Huevo duro'));
  assert.equal(primero('cerveza sin alcohol'), 'Cerveza sin alcohol');   // "sin" sí cuenta
});

test('mate dulce: una ronda suma calorías por el azúcar', () => {
  const ronda = calcularItem(ALIMENTOS_BASE.find(a => a.id === 'b:mate-dulce'), { cantidad: 1, porcionIdx: 1 });
  assert.equal(ronda.kcal, 80);
});

test('lo que calcula la IA queda como alimento propio, sin repetir', () => {
  const items = [
    { fuente: 'ia', nombre: 'Guiso de la abuela', g: 300, kcal: 450, prot: 20, carb: 50, grasa: 18 },
    { fuente: 'ia', nombre: 'guiso de la ABUELA', g: 250, kcal: 380 },            // mismo nombre: no se repite
    { fuente: 'base', nombre: 'Mate dulce', g: 500, kcal: 80 },                   // ya estaba en la base
    { fuente: 'ia', nombre: 'Mate dulce', g: 500, kcal: 80 },                     // existe en la base
    { fuente: 'ia', nombre: 'Algo sin gramos', g: 0, kcal: 100 },
  ];
  const nuevos = alimentosAprendidos(items, ALIMENTOS_BASE);
  assert.equal(nuevos.length, 1);
  assert.equal(nuevos[0].nombre, 'Guiso de la abuela');
  assert.equal(nuevos[0].origen, 'ia');
  assert.equal(nuevos[0].por100.kcal, 150);   // 450 kcal en 300 g
  assert.equal(nuevos[0].porciones[0].g, 300);
});
