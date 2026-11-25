import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  distancia, metPorVelocidad, pasosEstimados, ritmo, textoRitmo, textoTiempo, nuevaPartida, avanzar, tic, pausar,
  fantasmaEn, simplificar, estrellas, resumenFinal, elegirFantasma, filaSalida, fraseVoz, PRIMER_DESAFIO,
} from '../www/js/salida.js';

const M = 1 / 111195;   // grados de latitud por metro
const T0 = 1_700_000_000_000;

/** Camina en línea recta hacia el norte: `metros` cada `seg` segundos, n veces. Devuelve todos los eventos. */
function caminar(est, { n, metros, seg, desde = 0, t0 = T0, lat0 = -34.6, acc = 5 }) {
  const ev = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + (desde + i) * seg * 1000;
    ev.push(...avanzar(est, { lat: lat0 + (desde + i) * metros * M, lon: -58.4, acc, t }));
    ev.push(...tic(est, t));
  }
  return ev;
}

test('distancia: 1 km hacia el norte mide ~1000 m', () => {
  const d = distancia({ lat: -34.6, lon: -58.4 }, { lat: -34.6 + 1000 * M, lon: -58.4 });
  assert.ok(Math.abs(d - 1000) < 1, d);
});

test('MET según la velocidad real, a pie y en bici', () => {
  assert.equal(metPorVelocidad('caminar', 5), 3.5);
  assert.equal(metPorVelocidad('caminar', 10), 9.8);       // trotar en "caminata" cuenta como trote
  assert.equal(metPorVelocidad('bici', 18), 6.8);
  assert.equal(metPorVelocidad('bici', 0), 1);
});

test('pasos estimados con la altura; en bici no hay pasos', () => {
  assert.equal(pasosEstimados(1000, 'caminar', 170), Math.round(1000 / (1.7 * 0.415)));
  assert.equal(pasosEstimados(1000, 'bici', 170), 0);
});

test('textos de ritmo y tiempo', () => {
  assert.equal(textoRitmo(605), '10:05');
  assert.equal(textoRitmo(null), '--:--');
  assert.equal(textoTiempo(3725), '1:02:05');
  assert.equal(textoTiempo(70), '01:10');
  assert.equal(ritmo(1000, 600), 600);
  assert.equal(ritmo(10, 60), null);
});

test('caminar 1 km: distancia, tiempo, calorías, monedas, combo y nivel', () => {
  const est = nuevaPartida({ modo: 'caminar', kg: 80, ahora: T0 });
  const ev = caminar(est, { n: 100, metros: 10, seg: 7 });     // 10 m cada 7 s ≈ 5,1 km/h
  assert.ok(Math.abs(est.metros - 1000) < 2, est.metros);
  assert.equal(Math.round(est.segMov), 700);
  // (3,5 − 1) × 80 kg × 700/3600 h ≈ 39 kcal
  assert.equal(Math.round(est.kcal), 39);
  const monedas = ev.filter(e => e.tipo === 'moneda');
  assert.equal(monedas.length, 9);         // 100…900 m (la de 1000 m depende de redondeos)
  assert.deepEqual(monedas.slice(0, 6).map(e => e.combo), [1, 2, 3, 4, 5, 5]);
  assert.ok(est.monedas >= 9);
  assert.equal(ev.filter(e => e.tipo === 'nivel').length, est.metros >= 1000 ? 1 : 0);
});

test('el temblor del GPS y los saltos imposibles no suman metros', () => {
  const est = nuevaPartida({ ahora: T0 });
  avanzar(est, { lat: -34.6, lon: -58.4, acc: 5, t: T0 });
  avanzar(est, { lat: -34.6 + 1.5 * M, lon: -58.4, acc: 5, t: T0 + 1000 });   // 1,5 m: temblor
  assert.equal(est.metros, 0);
  avanzar(est, { lat: -34.6 + 500 * M, lon: -58.4, acc: 5, t: T0 + 3000 });   // 500 m en 3 s: salto
  assert.equal(est.metros, 0);
  avanzar(est, { lat: -34.6, lon: -58.4 + 0.01, acc: 80, t: T0 + 4000 });     // mala precisión
  assert.equal(est.metros, 0);
  avanzar(est, { lat: -34.6 + 8 * M, lon: -58.4, acc: 5, t: T0 + 6000 });
  assert.ok(Math.abs(est.metros - 8) < 0.1);
});

test('mala señal avisa una vez y después avisa que volvió', () => {
  const est = nuevaPartida({ ahora: T0 });
  const ev = [];
  for (let i = 0; i < 5; i++) ev.push(...avanzar(est, { lat: -34.6, lon: -58.4, acc: 100, t: T0 + i * 1000 }));
  ev.push(...avanzar(est, { lat: -34.6, lon: -58.4, acc: 5, t: T0 + 6000 }));
  assert.deepEqual(ev.map(e => e.tipo), ['senal-mala', 'senal-ok']);
});

test('pausa automática al quedarte quieto, y quieto más de 30 s corta el combo', () => {
  const est = nuevaPartida({ ahora: T0 });
  caminar(est, { n: 30, metros: 10, seg: 7 });
  assert.ok(est.combo > 1);
  const t = T0 + 30 * 7000;
  assert.deepEqual(tic(est, t + 12000).map(e => e.tipo), ['pausa-auto']);
  assert.equal(est.pausaAuto, true);
  const ev = tic(est, t + 31000);
  assert.ok(ev.some(e => e.tipo === 'combo-perdido'));
  assert.equal(est.combo, 1);
  // Al volver a moverte no se cuenta el tiempo quieto como tiempo en movimiento
  const antes = est.segMov;
  const ev2 = avanzar(est, { lat: -34.6 + 310 * M, lon: -58.4, acc: 5, t: t + 40000 });
  assert.ok(ev2.some(e => e.tipo === 'sigue'));
  assert.ok(est.segMov - antes < 10, est.segMov - antes);
});

test('pausa manual: no cuenta lo que te moviste en pausa', () => {
  const est = nuevaPartida({ ahora: T0 });
  caminar(est, { n: 10, metros: 10, seg: 7 });
  const m = est.metros;
  pausar(est, true, T0 + 80000);
  avanzar(est, { lat: -34.6 + 500 * M, lon: -58.4, acc: 5, t: T0 + 200000 });
  assert.equal(est.metros, m);
  pausar(est, false, T0 + 300000);
  avanzar(est, { lat: -34.6 + 800 * M, lon: -58.4, acc: 5, t: T0 + 301000 });
  avanzar(est, { lat: -34.6 + 810 * M, lon: -58.4, acc: 5, t: T0 + 308000 });
  assert.ok(Math.abs(est.metros - m - 10) < 0.5);
});

test('desafío turbo: aparece a los 2 minutos y se gana yendo más rápido', () => {
  const est = nuevaPartida({ ahora: T0 });
  const ev = caminar(est, { n: 18, metros: 10, seg: 7 });   // 126 s en movimiento
  const d = ev.find(e => e.tipo === 'desafio');
  assert.ok(d, 'apareció el desafío');
  assert.ok(est.segMov >= PRIMER_DESAFIO);
  assert.equal(d.desafio.tipo, 'turbo');
  // 1,43 m/s × 60 s × 1,2 ≈ 100 m
  assert.equal(d.desafio.meta, 100);
  const ev2 = caminar(est, { n: 8, metros: 15, seg: 7, desde: 0, t0: T0 + 19 * 7000, lat0: -34.6 + 190 * M });
  assert.ok(ev2.some(e => e.tipo === 'desafio-logrado'));
  assert.equal(est.desafiosHechos, 1);
});

test('desafío perdido si se acaba el tiempo', () => {
  const est = nuevaPartida({ ahora: T0 });
  caminar(est, { n: 18, metros: 10, seg: 7 });
  assert.ok(est.desafio);
  const ev = tic(est, est.desafio.hasta + 1);
  assert.ok(ev.some(e => e.tipo === 'desafio-perdido'));
  assert.equal(est.desafio, null);
});

test('meta de km: avisa la mitad y suma premio al llegar', () => {
  const est = nuevaPartida({ metaKm: 1, ahora: T0 });
  const ev = caminar(est, { n: 102, metros: 10, seg: 7 });
  assert.equal(ev.filter(e => e.tipo === 'mitad').length, 1);
  assert.equal(ev.filter(e => e.tipo === 'meta').length, 1);
  assert.equal(est.metaLograda, true);
});

test('fantasma: interpola y avisa cuando lo pasás', () => {
  assert.equal(fantasmaEn([[0, 0], [10, 20], [20, 60]], 15), 40);
  assert.equal(fantasmaEn([[0, 0], [10, 20]], 99), 20);
  // Fantasma lento al principio y rápido después
  const fantasma = { marcas: [[0, 0], [60, 60], [300, 1000]] };
  const est = nuevaPartida({ fantasma, ahora: T0 });
  const ev = caminar(est, { n: 40, metros: 10, seg: 7 });
  const tipos = ev.filter(e => e.tipo.includes('fantasma')).map(e => e.tipo);
  assert.deepEqual(tipos, ['te-paso-fantasma']);
});

test('simplificar saca los puntos en línea recta', () => {
  const recta = Array.from({ length: 50 }, (_, i) => [-34.6 + i * 10 * M, -58.4]);
  assert.equal(simplificar(recta).length, 2);
  const codo = [...recta, [-34.6 + 490 * M, -58.4 + 0.002]];
  assert.equal(simplificar(codo).length, 3);
});

test('estrellas y récords', () => {
  const est = nuevaPartida({ ahora: T0 });
  caminar(est, { n: 10, metros: 10, seg: 7 });
  assert.equal(estrellas(est), 0);                     // menos de 200 m
  caminar(est, { n: 110, metros: 10, seg: 7, desde: 11 });
  assert.equal(estrellas(est), 2);                     // pasó 1 km
  const r = resumenFinal(est, [{ modo: 'caminar', km: 0.8, puntaje: 50, ritmo: 900 }]);
  assert.deepEqual(r.records.sort(), ['distancia', 'puntaje', 'ritmo']);
  assert.ok(r.pasos > 1000);
  assert.equal(resumenFinal(est, []).records.length, 0);   // la primera no es "récord"
});

test('elegir fantasma: la más rápida del mismo modo, de 500 m o más', () => {
  const marcas = [[0, 0], [10, 10], [20, 20]];
  const s = [
    { id: 1, modo: 'caminar', km: 2, segMov: 1500, marcas },
    { id: 2, modo: 'caminar', km: 1, segMov: 600, marcas },
    { id: 3, modo: 'caminar', km: 0.3, segMov: 60, marcas },
    { id: 4, modo: 'bici', km: 10, segMov: 1200, marcas },
  ];
  assert.equal(elegirFantasma(s, 'caminar').id, 2);
  assert.equal(elegirFantasma(s, 'correr'), null);
});

test('la fila guardada cuenta como actividad del día con km en el nombre', () => {
  const est = nuevaPartida({ modo: 'bici', kg: 70, ahora: T0 });
  caminar(est, { n: 50, metros: 50, seg: 10 });          // 18 km/h
  const r = resumenFinal(est);
  const f = filaSalida(est, r, { fecha: '2026-11-25', hora: '08:00' });
  assert.equal(f.tipo, 'actividad');
  assert.equal(f.fuente, 'gps');
  assert.equal(f.nombre, 'Bici 2,5 km');
  assert.equal(f.pasos, 0);
  assert.ok(f.kcal > 0 && f.minutos === 8);
  assert.equal(f.ruta.length, 2);
});

test('frases de la voz', () => {
  const est = nuevaPartida({ ahora: T0 });
  caminar(est, { n: 100, metros: 10, seg: 7 });
  const f = fraseVoz({ tipo: 'nivel', nivel: 1, km: 1 }, est, 'directo', () => 0);
  assert.match(f, /^¡Nivel 1! 1 kilómetro en 12 minutos, a 11 con 40 el kilómetro\. Bien\. Seguí\.$/);
  assert.equal(fraseVoz({ tipo: 'moneda' }, est), null);
});
