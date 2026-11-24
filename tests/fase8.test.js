import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { categoriaImc, metaPasos, calcularPlan } from '../www/js/objetivo.js';
import { posicionImc } from '../www/js/ui/imc.js';
import { rango, indiceCercano } from '../www/js/ui/rueda.js';
import { momentoDelDia, escenaSVG } from '../www/js/escena.js';
import { iconoSVG } from '../www/js/marca.js';
import { datosFinales } from '../www/js/ui/onboarding.js';

test('IMC: categorías de la OMS en los bordes', () => {
  assert.equal(categoriaImc(18.4).id, 'bajo');
  assert.equal(categoriaImc(18.5).id, 'normal');
  assert.equal(categoriaImc(24.9).id, 'normal');
  assert.equal(categoriaImc(25).id, 'sobre');
  assert.equal(categoriaImc(30).id, 'alto');
});

test('IMC: la marca queda dentro de la barra y en el tramo correcto', () => {
  assert.equal(posicionImc(10), 0);
  assert.equal(posicionImc(60), 100);
  assert.equal(posicionImc(18.5), 25);
  assert.equal(posicionImc(25), 50);
  assert.ok(posicionImc(27) > 50 && posicionImc(27) < 75);
});

test('meta de pasos según la actividad, y queda en el perfil del onboarding', () => {
  assert.equal(metaPasos('sedentario'), 6000);
  assert.equal(metaPasos('alto'), 10000);
  const d = datosFinales({ nombre: 'A', gato_nombre: 'T', gato_personalidad: 'tranqui', objetivo: 'mantener', sexo: 'f',
    nacimiento: '1990-01-01', altura_cm: 160, peso_kg: 60, actividad: 'ligero', equipo: 'ninguno', acepto_aviso: true });
  assert.equal(d.meta_pasos, 7500);
});

test('ruedas: valores con paso fijo y el más cercano', () => {
  assert.deepEqual(rango(0, 9).length, 10);
  assert.deepEqual(rango(120, 122), [120, 121, 122]);
  assert.equal(indiceCercano([0, 5], 3), 1);
  assert.equal(indiceCercano(rango(35, 300), 70.4), 35);
});

test('escena: momento del día y SVG decorativo', () => {
  assert.equal(momentoDelDia(8), 'manana');
  assert.equal(momentoDelDia(18), 'tarde');
  assert.equal(momentoDelDia(23), 'noche');
  assert.equal(momentoDelDia(3), 'noche');
  for (const m of ['manana', 'tarde', 'noche']) assert.match(escenaSVG(m), /aria-hidden="true"/);
});

test('ícono: fondo lleno (sin transparencia) y versión maskable', () => {
  assert.match(iconoSVG(), /<rect width="512" height="512"\s+fill=/);
  assert.notEqual(iconoSVG(), iconoSVG({ maskable: true }));
});

test('el service worker guarda TODOS los módulos (si falta uno, la app no abre sin conexión)', () => {
  const sw = readFileSync('www/sw.js', 'utf8');
  const recorrer = dir => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? recorrer(p) : [p]; });
  const faltan = recorrer('www/js').filter(p => p.endsWith('.js')).map(p => './' + p.slice(4)).filter(p => !sw.includes(`'${p}'`));
  assert.deepEqual(faltan, []);
  for (const i of JSON.parse(readFileSync('www/manifest.webmanifest', 'utf8')).icons) assert.ok(sw.includes(`'./${i.src}'`), i.src);
});

test('editar datos: el plan se recalcula con el peso actual y respeta los pisos', () => {
  const p = calcularPlan({ objetivo: 'bajar', sexo: 'f', nacimiento: '1990-01-01', altura_cm: 155, peso_kg: 58, peso_meta: 52, actividad: 'sedentario', ritmo_kg_sem: 1 }, new Date(2026, 10, 23));
  assert.ok(p.kcal >= 1200);
});
