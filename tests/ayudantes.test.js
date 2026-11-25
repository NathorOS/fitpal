import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { AYUDANTES, POSES_AYUDANTES, SITUACIONES, decir, situacionEntrenador, situacionChef } from '../www/js/ayudantes.js';
import { LARGO_MAXIMO } from '../www/js/frases.js';

test('cada pose tiene su imagen y cada situación usa poses que existen', () => {
  for (const [quien, poses] of Object.entries(POSES_AYUDANTES)) {
    for (const p of poses) assert.ok(existsSync(`www/img/ayudantes/${quien}-${p}.webp`), `${quien}-${p}`);
    for (const [sit, [ps, frases]] of Object.entries(SITUACIONES[quien])) {
      for (const p of ps) assert.ok(poses.includes(p), `${quien}/${sit}: ${p}`);
      assert.ok(frases.length > 0, `${quien}/${sit} sin frases`);
    }
  }
  assert.deepEqual(Object.keys(AYUDANTES).sort(), Object.keys(POSES_AYUDANTES).sort());
});

test('las frases respetan las reglas de FRASES.md', () => {
  for (const quien of Object.keys(SITUACIONES)) {
    for (const [, [, frases]] of Object.entries(SITUACIONES[quien])) {
      for (const f of frases) {
        assert.ok(f.length <= LARGO_MAXIMO, `larga: ${f}`);
        assert.doesNotMatch(f, /no comas|salte[aá] (la|una) comida|\b(gord[oa]|flac[oa]|nene|nena|chabón|mina)\b/i, f);
      }
    }
  }
});

test('decir elige pose y frase de la situación (y cae en el saludo si no la conoce)', () => {
  assert.deepEqual(decir('chef', 'pesado', () => 0), { pose: 'eso-no', texto: SITUACIONES.chef.pesado[1][0] });
  assert.equal(decir('entrenador', 'fin', () => 0.99).pose, 'festejando');
  assert.equal(decir('entrenador', 'cualquiera', () => 0).pose, 'saludando');
  assert.equal(decir('nadie', 'saludo'), null);
});

test('situación del entrenador y del chef en Hoy', () => {
  assert.equal(situacionEntrenador({ minutosActividad: 20, hora: 21 }), 'entreno');
  assert.equal(situacionEntrenador({ minutosActividad: 0, hora: 20 }), 'quieto');
  assert.equal(situacionEntrenador({ minutosActividad: 0, hora: 9 }), 'saludo');
  assert.equal(situacionChef({ kcal: 2500, kcalMeta: 2000, comidasHoy: 4 }), 'pasado');
  assert.equal(situacionChef({ kcal: 0, kcalMeta: 2000, comidasHoy: 0, hora: 15 }), 'vacio');
  assert.equal(situacionChef({ kcal: 0, kcalMeta: 2000, comidasHoy: 0, hora: 8 }), 'saludo');
  assert.equal(situacionChef({ kcal: 900, kcalMeta: 2000, comidasHoy: 2, hora: 15 }), 'consejo');
});
