import { test } from 'node:test';
import assert from 'node:assert/strict';
import { horasDe, reloj, progresoAyuno, validarInicio, ultimaComida, PROTOCOLOS, META_MAXIMA_H } from '../www/js/ayuno.js';
import { puntajeComida, etiquetaPuntaje, consejosComida, puntajeDelDia } from '../www/js/puntaje.js';
import { calcularRetos, semanaDe } from '../www/js/retos.js';

const AHORA = new Date(2026, 10, 23, 12, 0, 0);

test('ayuno: horas, reloj y progreso', () => {
  const a = { inicio: new Date(2026, 10, 22, 21, 0).toISOString(), fin: null, meta_h: 14 };
  assert.equal(horasDe(a, AHORA), 15);
  assert.equal(reloj(13.5), '13:30:00');
  const p = progresoAyuno(a, AHORA);
  assert.equal(p.cumplido, true);
  assert.equal(p.pct, 1);
  assert.ok(PROTOCOLOS.every(x => x.horas <= META_MAXIMA_H));
});

test('ayuno: el inicio no puede ser futuro ni de más de 24 h atrás', () => {
  assert.match(validarInicio(new Date(2026, 10, 23, 13), AHORA), /futuro/);
  assert.match(validarInicio(new Date(2026, 10, 21, 10), AHORA), /24 horas/);
  assert.equal(validarInicio(new Date(2026, 10, 22, 22), AHORA), null);
});

test('ayuno: última comida anotada', () => {
  const c = [{ fecha: '2026-11-22', hora: '21:30' }, { fecha: '2026-11-22', hora: '13:00' }];
  assert.equal(ultimaComida(c).getHours(), 21);
  assert.equal(ultimaComida([]), null);
});

test('puntaje: una comida con proteína y verduras puntúa mejor que una frita y grande', () => {
  const buena = puntajeComida({ kcal: 450, prot: 40, grasa: 12, fibra: 8 }, 1800);
  const floja = puntajeComida({ kcal: 1300, prot: 20, grasa: 80, fibra: 2 }, 1800);
  assert.ok(buena >= 80, `buena ${buena}`);
  assert.ok(floja < 40, `floja ${floja}`);
  assert.equal(etiquetaPuntaje(buena), 'Excelente');
  assert.equal(etiquetaPuntaje(floja), 'Se puede mejorar');
  assert.equal(puntajeComida({ kcal: 0 }), null);
});

test('consejos: amables y como mucho 2', () => {
  const c = consejosComida({ kcal: 1300, prot: 20, grasa: 80, fibra: 2 }, 1800);
  assert.equal(c.length, 2);
  assert.ok(c.every(t => !/\b(mal|culpa|fallaste|prohibido)\b/i.test(t)));
  assert.match(consejosComida({ kcal: 450, prot: 40, grasa: 12, fibra: 8 }, 1800)[0], /Buena combinación/);
});

test('puntaje del día', () => {
  const p = puntajeDelDia({ kcal: 1800, kcalMeta: 1800, prot: 140, protMeta: 140, aguaMl: 2500, aguaMeta: 2500, minutosActividad: 30, fibra: 25 });
  assert.equal(p, 100);
  assert.equal(puntajeDelDia({ kcal: 0 }), null);
});

test('semana de lunes a domingo', () => {
  const s = semanaDe(new Date(2026, 10, 23));      // lunes 23/11/2026
  assert.equal(s[0], '2026-11-23');
  assert.equal(s[6], '2026-11-29');
  assert.equal(semanaDe(new Date(2026, 10, 29))[0], '2026-11-23');   // domingo
});

test('retos se calculan con lo anotado', () => {
  const hoy = '2026-11-23';
  const d = {
    hoy, ahora: AHORA, semana: semanaDe(AHORA), aguaMeta: 2000, metaKcal: () => 1500,
    comidas: [{ fecha: hoy, kcal: 500 }, { fecha: hoy, kcal: 500 }, { fecha: hoy, kcal: 450 }],
    agua: [{ fecha: hoy, ml: 2000 }], sesiones: [{ fecha: hoy, minutos: 20 }], pasos: [], pesos: [{ fecha: hoy, kg: 80 }], ayunos: [],
  };
  const { diarios, semanales } = calcularRetos(d);
  const por = (l, id) => l.find(r => r.id === id);
  assert.equal(por(diarios, 'anotar3').hecho, true);
  assert.equal(por(diarios, 'agua').hecho, true);
  assert.equal(por(diarios, 'moverse').hecho, false);
  assert.equal(por(diarios, 'meta').hecho, true, '1450 está dentro del ±10 % de 1500');
  assert.equal(por(semanales, 'peso2').valor, 1);
  assert.equal(por(semanales, 'racha7').valor, 1);
});

test('misiones del día: suman el puntaje y "cerca de la meta" no premia comer de menos', async () => {
  const { misionesDelDia } = await import('../www/js/puntaje.js');
  const d = { kcal: 1800, kcalMeta: 1800, prot: 140, protMeta: 140, aguaMl: 2500, aguaMeta: 2500, minutosActividad: 30, fibra: 25 };
  const ms = misionesDelDia(d);
  assert.equal(ms.length, 5);
  assert.ok(ms.every(m => m.hecha));
  assert.equal(ms.reduce((a, m) => a + m.peso, 0), 100);
  assert.equal(puntajeDelDia(d), 100);
  const poco = misionesDelDia({ ...d, kcal: 700 });
  assert.equal(poco.find(m => m.id === 'meta').hecha, false);
  assert.equal(misionesDelDia({ kcalMeta: 1800 }).find(m => m.id === 'meta').avance, 0);
});

test('etapas del ayuno: orientativas y nunca proponen pasar de la meta', async () => {
  const { faseAyuno } = await import('../www/js/ayuno.js');
  assert.equal(faseAyuno(1, 14).fase.nombre, 'Digiriendo');
  assert.equal(faseAyuno(5, 14).fase.nombre, 'Usando reservas');
  assert.equal(faseAyuno(13, 14).siguiente.nombre, 'Meta');
  const lista = faseAyuno(14, 14);
  assert.equal(lista.fase.nombre, '¡Meta cumplida!');
  assert.equal(lista.siguiente, null);
  assert.equal(faseAyuno(3, 12).fases.length, 2);   // con meta de 12 h no aparece "Más grasa"
});
