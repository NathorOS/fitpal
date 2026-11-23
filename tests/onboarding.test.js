import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PASOS, pasosVisibles, errorDelPaso, datosFinales } from '../www/js/ui/onboarding.js';
import { validarPerfil } from '../www/js/objetivo.js';

const HOY = new Date(2026, 10, 23);
const paso = id => PASOS.find(p => p.id === id);
const completo = {
  gato_nombre: 'Tito', gato_personalidad: 'carinoso', nombre: 'Niqo',
  objetivo: 'bajar', sexo: 'f', nacimiento: '1996-05-10', altura_cm: 165, peso_kg: 80,
  peso_meta: 68, actividad: 'sedentario', ritmo_kg_sem: 0.5, equipo: 'ninguno', acepto_aviso: true,
};

test('"mantener" saltea peso meta y ritmo', () => {
  const ids = pasosVisibles({ objetivo: 'mantener' }).map(p => p.id);
  assert.ok(!ids.includes('peso_meta'));
  assert.ok(!ids.includes('ritmo'));
  assert.equal(pasosVisibles({ objetivo: 'bajar' }).length, PASOS.length);
});

test('el onboarding es corto: 14 pantallas como máximo antes del plan', () => {
  assert.ok(PASOS.length <= 14, `hay ${PASOS.length}`);
});

test('cada paso con campo tiene pregunta', () => {
  for (const p of PASOS.filter(p => p.campo)) assert.equal(typeof p.pregunta, 'function', p.id);
});

test('errores por paso', () => {
  assert.match(errorDelPaso(paso('gato_nombre'), { gato_nombre: '  ' }), /nombre/);
  assert.equal(errorDelPaso(paso('gato_nombre'), { gato_nombre: 'Tito' }), null);
  assert.match(errorDelPaso(paso('nacimiento'), { nacimiento: '2010-01-01' }, HOY), /mayores de 18/);
  assert.equal(errorDelPaso(paso('nacimiento'), { nacimiento: '1990-01-01' }, HOY), null);
  assert.match(errorDelPaso(paso('peso_meta'), { ...completo, peso_meta: 40 }, HOY), /mínima es/);
  assert.match(errorDelPaso(paso('salud'), { acepto_aviso: false }), /casilla/);
  assert.equal(errorDelPaso(paso('salud'), { acepto_aviso: true }), null);
});

test('datosFinales arma un perfil válido', () => {
  const d = datosFinales(completo);
  assert.deepEqual(d.gato, { nombre: 'Tito', personalidad: 'carinoso' });
  assert.equal(validarPerfil(d, HOY).ok, true);
  const m = datosFinales({ ...completo, objetivo: 'mantener' });
  assert.equal(m.peso_meta, undefined);
  assert.equal(validarPerfil(m, HOY).ok, true);
});

test('la meta inicial sugerida nunca es menor al mínimo saludable', () => {
  const ini = paso('peso_meta').inicial({ altura_cm: 180, peso_kg: 62 });
  assert.ok(ini >= 60, `sugirió ${ini}`);
});
