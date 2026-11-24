import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recortarFondo, esCamiseta, pintarCamiseta, hsv } from '../www/js/personaje.js';

const px = (...colores) => new Uint8ClampedArray(colores.flatMap(c => [...c, 255]));

test('recorte: el magenta del fondo y la sombra violeta quedan transparentes', () => {
  const p = recortarFondo(px([238, 14, 225], [194, 13, 180]));
  assert.equal(p[3], 0);
  assert.equal(p[7], 0);
});

test('recorte: piel amarilla, contorno negro, jogging azul, lengua y vincha no se tocan', () => {
  const colores = [[201, 177, 79], [20, 18, 16], [60, 70, 100], [230, 100, 120], [180, 40, 40]];
  const p = recortarFondo(px(...colores));
  colores.forEach((c, k) => assert.deepEqual([...p.slice(k * 4, k * 4 + 4)], [...c, 255], `color ${k}`));
});

test('camiseta: detecta el verde (también en sombra) y no la piel', () => {
  assert.ok(esCamiseta(91, 244, 16));
  assert.ok(esCamiseta(40, 120, 10));
  assert.ok(!esCamiseta(201, 177, 79));
  assert.ok(!esCamiseta(60, 70, 100));
});

test('camiseta: se pinta con el color del equipo y conserva la sombra', () => {
  // 10 × 10: todo verde; la mitad de abajo en sombra
  const datos = new Uint8ClampedArray(10 * 10 * 4);
  for (let k = 0; k < 100; k++) datos.set(k < 50 ? [91, 244, 16, 255] : [45, 122, 8, 255], k * 4);
  pintarCamiseta(datos, 10, 10, 'independiente');
  const [h] = hsv(datos[0], datos[1], datos[2]);
  assert.ok(h < 15 || h > 345, `quedó rojo (tono ${h})`);
  assert.ok(datos[99 * 4] < datos[0], 'la sombra sigue más oscura');
});

test('bandera: encuentra el verde chillón y no las plantas', async () => {
  const { cajaBandera } = await import('../www/js/personaje.js');
  const w = 60, h = 40, d = new Uint8ClampedArray(w * h * 4);
  for (let k = 0; k < w * h; k++) d.set([120, 110, 100, 255], k * 4);                   // pared
  for (let y = 5; y < 20; y++) for (let x = 20; x < 40; x++) d.set([91, 244, 16, 255], (y * w + x) * 4);   // bandera
  for (let y = 20; y < 28; y++) for (let x = 2; x < 10; x++) d.set([60, 120, 50, 255], (y * w + x) * 4);   // planta
  const [x0, y0, x1, y1] = cajaBandera(d, w, h);
  assert.ok(x0 >= 18 && x0 <= 20 && x1 >= 39 && x1 <= 42 && y0 >= 4 && y1 <= 21, `${x0},${y0},${x1},${y1}`);
});
