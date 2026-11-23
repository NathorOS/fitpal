import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EJERCICIOS, GRUPOS } from '../www/js/datos/ejercicios.js';
import { rutinasPara, minutosEstimados, sugerir, kcalSesion, EQUIPO_PERMITE, NIVELES } from '../www/js/entrenamiento.js';

test('biblioteca: ~60 ejercicios, ids únicos y datos completos', () => {
  assert.ok(EJERCICIOS.length >= 60, `hay ${EJERCICIOS.length}`);
  assert.equal(new Set(EJERCICIOS.map(e => e.id)).size, EJERCICIOS.length);
  for (const e of EJERCICIOS) {
    assert.ok(GRUPOS[e.grupo], `${e.id}: grupo ${e.grupo}`);
    assert.ok(['ninguno', 'mancuernas', 'gimnasio'].includes(e.equipo), e.id);
    assert.ok(['reps', 'tiempo'].includes(e.tipo), e.id);
    assert.ok(e.indicaciones.length > 30, `${e.id}: faltan indicaciones`);
  }
});

test('cada rutina usa solo ejercicios del equipo disponible', () => {
  for (const equipo of Object.keys(EQUIPO_PERMITE)) {
    for (const nivel of Object.keys(NIVELES)) {
      const rutinas = rutinasPara(equipo, nivel);
      assert.ok(rutinas.length >= 2, `${equipo}/${nivel}`);
      for (const r of rutinas) for (const x of r.ejercicios) {
        const e = EJERCICIOS.find(y => y.id === x.id);
        assert.ok(e, `${r.id}: ${x.id} no existe`);
        assert.ok(EQUIPO_PERMITE[equipo].includes(e.equipo), `${equipo}: ${x.id} necesita ${e.equipo}`);
        assert.ok(x.series >= 1 && x.descanso > 0);
      }
    }
  }
});

test('principiante: menos series y versiones más fáciles', () => {
  const [p] = rutinasPara('ninguno', 'principiante');
  const [i] = rutinasPara('ninguno', 'intermedio');
  assert.ok(p.ejercicios.some(x => x.id === 'flexiones-rodillas'));
  assert.ok(i.ejercicios.some(x => x.id === 'flexiones'));
  assert.ok(p.ejercicios[0].series < i.ejercicios[0].series);
});

test('duración estimada razonable', () => {
  for (const r of rutinasPara('gimnasio', 'intermedio')) {
    const m = minutosEstimados(r);
    assert.ok(m >= 5 && m <= 60, `${r.nombre}: ${m} min`);
  }
});

test('progresión: sube si completaste todo, repite si no', () => {
  // Sin peso: +2 repeticiones
  const s1 = sugerir('sentadilla', { reps: 10 }, { objetivo: { reps: 10 }, series: [{ reps: 10 }, { reps: 11 }] });
  assert.deepEqual([s1.reps, s1.subio], [12, true]);
  const s2 = sugerir('sentadilla', { reps: 10 }, { objetivo: { reps: 12 }, series: [{ reps: 12 }, { reps: 9 }] });
  assert.deepEqual([s2.reps, s2.subio], [12, false]);
  // Con peso: +2,5 kg en gimnasio, +1 kg con mancuernas
  const s3 = sugerir('prensa', { reps: 12 }, { objetivo: { reps: 12 }, series: [{ reps: 12, kg: 60 }, { reps: 12, kg: 60 }] });
  assert.equal(s3.kg, 62.5);
  const s4 = sugerir('curl', { reps: 12 }, { objetivo: { reps: 12 }, series: [{ reps: 12, kg: 6 }] });
  assert.equal(s4.kg, 7);
  // Tiempo: +5 s
  assert.equal(sugerir('plancha', { seg: 30 }, { objetivo: { seg: 30 }, series: [{ seg: 30 }] }).seg, 35);
  // Primera vez: el objetivo de la rutina
  assert.deepEqual(sugerir('plancha', { seg: 30 }, null), { reps: null, seg: 30, kg: null, subio: false });
  // Tope: no pasa de 20 repeticiones
  assert.equal(sugerir('sentadilla', { reps: 10 }, { objetivo: { reps: 20 }, series: [{ reps: 20 }] }).reps, 20);
});

test('kcal de la sesión', () => {
  const [r] = rutinasPara('mancuernas', 'intermedio');
  assert.equal(kcalSesion(r, 30, 80), 160);   // (5 − 1) × 80 × 0,5
});
