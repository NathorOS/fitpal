import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVIDADES, kcalActividad, kcalPasos, factorActividad, kcalExtraDelDia, metaAgua, PASOS_BASE } from '../www/js/actividad.js';
import { ultimosDias, sumarPorDia, promedioDiasConDato, racha, seriePeso, escala, limites } from '../www/js/estadisticas.js';

test('kcal de actividad: (MET − 1) × kg × horas', () => {
  assert.equal(kcalActividad(3.5, 80, 30), 100);     // caminar 30 min, 80 kg
  assert.equal(kcalActividad(8.3, 60, 60), 438);     // correr 1 h, 60 kg
  assert.equal(kcalActividad(1, 80, 60), 0);
  assert.equal(kcalActividad(5, 80, 0), 0);
  assert.ok(ACTIVIDADES.every(a => a.met > 1 && a.met < 13));
});

test('pasos: solo cuentan los que pasan la base', () => {
  assert.equal(kcalPasos(PASOS_BASE, 70), 0);
  assert.equal(kcalPasos(10000, 70), 200);
  assert.equal(kcalPasos(2000, 70), 0);
});

test('si el perfil ya es activo, se suma la mitad', () => {
  assert.equal(factorActividad('sedentario'), 1);
  assert.equal(factorActividad('alto'), 0.5);
  const d = kcalExtraDelDia({ actividades: [{ kcal: 200 }], pasos: 10000, kg: 70, nivel: 'moderado' });
  assert.deepEqual(d, { quemadas: 400, suma: 200 });
});

test('meta de agua entre 2 y 3,5 litros', () => {
  assert.equal(metaAgua(80), 2750);
  assert.equal(metaAgua(40), 2000);
  assert.equal(metaAgua(150), 3500);
});

test('últimos días en hora local', () => {
  assert.deepEqual(ultimosDias(3, new Date(2026, 0, 1)), ['2025-12-30', '2025-12-31', '2026-01-01']);
});

test('promedio ignora los días sin anotar', () => {
  const dias = ['a', 'b', 'c'];
  const porDia = sumarPorDia([{ fecha: 'a', kcal: 1000 }, { fecha: 'a', kcal: 500 }, { fecha: 'c', kcal: 1300 }], 'kcal');
  assert.deepEqual(promedioDiasConDato(dias, porDia), { promedio: 1400, dias: 2 });
  assert.deepEqual(promedioDiasConDato(dias, {}), { promedio: null, dias: 0 });
});

test('racha cuenta desde hoy o desde ayer', () => {
  const hoy = new Date(2026, 10, 23);
  assert.equal(racha(['2026-11-21', '2026-11-22', '2026-11-23'], hoy), 3);
  assert.equal(racha(['2026-11-21', '2026-11-22'], hoy), 2, 'hoy todavía no anotó: no se corta');
  assert.equal(racha(['2026-11-20'], hoy), 0);
});

test('serie de peso: tendencia con todo el historial y cambio en el rango', () => {
  const p = [{ fecha: '2026-11-01', kg: 80 }, { fecha: '2026-11-10', kg: 79 }, { fecha: '2026-11-20', kg: 78 }];
  const { puntos, cambio } = seriePeso(p, '2026-11-05');
  assert.equal(puntos.length, 2);
  assert.ok(cambio < 0);
  assert.equal(seriePeso(p.slice(0, 1), '2026-11-01').cambio, null);
});

test('escala y límites', () => {
  const x = escala([0, 10], [0, 100]);
  assert.equal(x(5), 50);
  assert.deepEqual(limites([78.2, 80.6], 1), [78, 81]);
  assert.deepEqual(limites([], 500), [0, 500]);
});
