import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pInicial, etapaDe, poseDelDia, limpieza, nivelLimpieza, archivoPersonaje, archivoCuarto, objetosDelCuarto,
  logrosQueCorresponden, premiosGanados, insigniaRacha, rachaCortada, pesoTendencia, PREMIOS,
} from '../www/js/personaje-estado.js';
import { FRASES, elegirFrase, situacionAlAbrir, esPesado, LARGO_MAXIMO } from '../www/js/frases.js';

// --- Etapa: los ejemplos de la tabla del encargo (1,75 m, meta 75 kg) ---
const base = { objetivo: 'bajar', pesoMeta: 75, alturaCm: 175 };
const etapa = (inicial, actual, anterior = null) =>
  etapaDe({ ...base, pInicial: pInicial(inicial, 175), pesoInicial: inicial, pesoActual: actual, etapaAnterior: anterior });

test('etapa: con IMC ≥ 35 arranca en lo más gordo', () => {
  assert.equal(pInicial(120, 175), 0);
  assert.equal(etapa(120, 120), 'e1');
  assert.equal(etapa(120, 106), 'e1');
  assert.equal(etapa(120, 104), 'e3');
  assert.equal(etapa(120, 87), 'e3');
  assert.equal(etapa(120, 86), 'e5');
});

test('etapa: 100 kg arranca en e1, pasa a e3 con 97 y a e5 con 83', () => {
  assert.ok(Math.abs(pInicial(100, 175) - 0.235) < 0.01);
  assert.equal(etapa(100, 100), 'e1');
  assert.equal(etapa(100, 96.5), 'e3');
  assert.equal(etapa(100, 83.5), 'e3');
  assert.equal(etapa(100, 83), 'e5');
});

test('etapa: con pocos kilos arranca en e3 (nunca ya en la meta)', () => {
  assert.equal(pInicial(90, 175), 0.5);
  assert.equal(etapa(90, 90), 'e3');
  assert.equal(etapa(90, 82.5), 'e5');
  assert.equal(pInicial(80, 175), 0.5);
  assert.equal(etapa(80, 80), 'e3');
});

test('etapa: si sube por encima del peso inicial queda como al principio, nunca peor', () => {
  assert.equal(etapa(120, 125), 'e1');
  assert.equal(etapa(90, 95), 'e3');
});

test('etapa: histéresis para no titilar al volver a subir', () => {
  // 120 → 104 es e3 (p = 0,36). Si vuelve a 107 (p = 0,29) sigue e3 porque no bajó 0,08 del corte.
  assert.equal(etapa(120, 107, 'e3'), 'e3');
  assert.equal(etapa(120, 107), 'e1');
  // Recién con p < 0,26 vuelve a e1
  assert.equal(etapa(120, 109, 'e3'), 'e1');
});

test('etapa: mantener', () => {
  const m = (actual, cm = 175) => etapaDe({ objetivo: 'mantener', pesoMeta: 75, pesoActual: actual, alturaCm: cm });
  assert.equal(m(76), 'e5');
  assert.equal(m(79), 'e3');
  assert.equal(m(110), 'e1');                     // IMC ≥ 35
});

test('peso de tendencia: suaviza un pesaje suelto', () => {
  const t = pesoTendencia([{ fecha: '2026-01-01', kg: 100 }, { fecha: '2026-01-02', kg: 100 }, { fecha: '2026-01-03', kg: 105 }]);
  assert.ok(t > 100 && t < 102);
});

// --- Pose ---
test('pose: orden de prioridad', () => {
  const d = { hora: 15, comidasHoy: 0, kcal: 0, kcalMeta: 2000 };
  assert.equal(poseDelDia(d), 'fiaca');
  assert.equal(poseDelDia({ ...d, hora: 10 }), 'contento');
  assert.equal(poseDelDia({ ...d, comidasHoy: 2, kcal: 1500 }), 'contento');
  assert.equal(poseDelDia({ ...d, comidasHoy: 4, kcal: 2400 }), 'empachado');
  assert.equal(poseDelDia({ ...d, actividadHoy: true }), 'entrenando');
  assert.equal(poseDelDia({ ...d, comidasHoy: 4, kcal: 2400, actividadHoy: true }), 'empachado');
  assert.equal(poseDelDia({ ...d, comidasHoy: 4, kcal: 2400, festejo: true }), 'festejando');
  assert.equal(poseDelDia({ ...d, hora: 2, ayunoEnCurso: true }), 'durmiendo');
  assert.equal(poseDelDia({ ...d, hora: 9, rachaCortada: true }), 'triste');
});

// --- Limpieza ---
const hoy = new Date(2026, 10, 24);
test('limpieza: arranca en 50 y sube de a poco con una semana buena', () => {
  const buena = () => ({ comidas: true, agua: true, actividad: true });
  assert.equal(limpieza(buena, { hoy, dias: 1 }), 60);              // +10 como máximo
  assert.equal(limpieza(buena, { hoy, dias: 7 }), 100);
});

test('limpieza: una semana mala la baja, de a 15 como mucho por día', () => {
  const mala = () => ({ comidas: false, agua: false, actividad: false });
  assert.equal(limpieza(mala, { hoy, dias: 1 }), 35);
  assert.equal(limpieza(mala, { hoy, dias: 7 }), 0);
});

test('limpieza: un día malo después de una semana buena no destruye todo', () => {
  const porDia = f => (f === '2026-11-24' ? { comidas: false, agua: false, actividad: false } : { comidas: true, agua: true, actividad: true });
  const l = limpieza(porDia, { hoy, dias: 14 });
  assert.ok(l >= 85, `limpieza ${l}`);
  assert.equal(nivelLimpieza(l), 'ordenado');
});

test('limpieza: tramos', () => {
  assert.equal(nivelLimpieza(0), 'desastre');
  assert.equal(nivelLimpieza(33), 'desastre');
  assert.equal(nivelLimpieza(34), 'normal');
  assert.equal(nivelLimpieza(67), 'ordenado');
});

// --- Archivos ---
test('archivos del personaje: limpio solo donde existe', () => {
  assert.equal(archivoPersonaje({ etapa: 'e3', pose: 'contento', limpieza: 80 }), 'e3-contento-limpio');
  assert.equal(archivoPersonaje({ etapa: 'e1', pose: 'contento', limpieza: 80 }), 'e1-contento');
  assert.equal(archivoPersonaje({ etapa: 'e3', pose: 'fiaca', limpieza: 80 }), 'e3-fiaca');
  assert.equal(archivoPersonaje({ etapa: 'e3', pose: 'contento', limpieza: 40 }), 'e3-contento');
  assert.equal(archivoPersonaje({ etapa: 'e3', pose: 'saludando' }), 'e3-saludando');
  assert.equal(archivoPersonaje({ etapa: 'e5', pose: 'saludando' }), 'e5-contento');
  assert.equal(archivoPersonaje({ etapa: 'e1', pose: 'con-un-trofeo' }), 'e1-festejando');
  assert.equal(archivoPersonaje({ etapa: 'e1', pose: 'cualquiera' }), 'e1-contento');
});

test('cuarto: el normal no tiene noche', () => {
  assert.equal(archivoCuarto(10, true), 'cuarto-desastre-noche');
  assert.equal(archivoCuarto(50, true), 'cuarto-normal');
  assert.equal(archivoCuarto(90, false), 'cuarto-ordenado');
  assert.ok(objetosDelCuarto(10).every(o => o.startsWith('vicio-')));
  assert.ok(objetosDelCuarto(90).every(o => o.startsWith('sano-')));
  assert.deepEqual(objetosDelCuarto(90, 3), objetosDelCuarto(90, 3));
});

// --- Juego ---
test('logros: hitos de peso, racha y primeros pasos', () => {
  const ids = logrosQueCorresponden({ pesoInicial: 100, pesoTend: 94, pesoMeta: 80, rachaActual: 8, retosHechos: ['agua'], comidas: 3, sesiones: 0, fotos: 0, aguaTotalMl: 0, diasConComida: 8 });
  for (const id of ['hito-1kg', 'hito-5kg', 'hito-meta', 'racha-3', 'racha-7', 'reto-agua', 'logro-primera-comida', 'logro-primera-semana']) assert.ok(ids.includes(id), id);
  for (const id of ['hito-10kg', 'hito-llegada', 'racha-14', 'logro-primer-entreno']) assert.ok(!ids.includes(id), id);
  assert.ok(logrosQueCorresponden({ pesoInicial: 100, pesoTend: 79.5, pesoMeta: 80 }).includes('hito-llegada'));
});

test('premios: uno por hito o racha, nunca más que los que hay', () => {
  assert.equal(premiosGanados([{ id: 'hito-1kg' }, { id: 'racha-3' }, { id: 'reto-agua' }, { id: 'hito-meta' }]).length, 2);
  assert.equal(premiosGanados(Array.from({ length: 30 }, (_, i) => ({ id: `cofre-${i}` }))).length, PREMIOS.length);
});

test('racha: insignia y racha cortada', () => {
  assert.equal(insigniaRacha(2), null);
  assert.equal(insigniaRacha(9), 7);
  assert.equal(insigniaRacha(40), 30);
  assert.ok(rachaCortada(['2026-11-22'], hoy));
  assert.ok(!rachaCortada(['2026-11-22', '2026-11-23'], hoy));
  assert.ok(!rachaCortada([], hoy));
});

// --- Frases ---
test('frases: todas entran en la burbuja y ninguna tiene género', () => {
  for (const [sit, b] of Object.entries(FRASES)) {
    for (const f of [...b.picante, ...(b.suave ?? [])]) {
      const larga = f.replace(/\{\w+\}/g, 'xxxxxx');
      assert.ok(larga.length <= LARGO_MAXIMO + 6, `${sit}: "${f}" (${larga.length})`);
      assert.ok(!/\b(papá|campeón|flaca|gordo)\b/i.test(f), `${sit}: "${f}"`);
    }
  }
});

test('frases: nunca dicen que no comas', () => {
  for (const b of Object.values(FRASES)) for (const f of [...b.picante, ...(b.suave ?? [])]) {
    assert.ok(!/(no comas nada|salteate|no comas para|no cenes|no desayunes)/i.test(f), f);
  }
});

test('frases: no repite en el mismo día y completa las variables', () => {
  const dichas = [];
  for (let i = 0; i < FRASES.fiaca.picante.length; i++) {
    const r = elegirFrase('fiaca', { yaDichas: dichas, vars: { hora: '15', n: 'Nico' } });
    assert.ok(!dichas.includes(r.original));
    assert.ok(!r.texto.includes('{'));
    dichas.push(r.original);
  }
});

test('frases: cariñoso y tranqui usan la versión suave en lo sensible', () => {
  const r = elegirFrase('pasado', { personalidad: 'carinoso' });
  assert.ok(FRASES.pasado.suave.includes(r.original));
  const d = elegirFrase('pasado', { personalidad: 'directo' });
  assert.ok(FRASES.pasado.picante.includes(d.original));
});

test('frases: las de pizza o fernet solo salen si comiste eso', () => {
  for (let i = 0; i < 50; i++) {
    const r = elegirFrase('pesado', { vars: { comida: 'alfajor' }, azar: () => i / 50 });
    assert.ok(!/pizza|fernet/i.test(r.texto), r.texto);
  }
  assert.ok(esPesado({ nombre: 'Pizza muzzarella' }));
  assert.ok(esPesado({ nombre: 'Ensalada', kcal: 700 }));
  assert.ok(!esPesado({ nombre: 'Manzana', kcal: 80 }));
});

test('frases: por debajo del piso de calorías no hay chicana', () => {
  assert.equal(situacionAlAbrir({ bajoPiso: true, hora: 22, comidasHoy: 2 }), null);
  assert.equal(situacionAlAbrir({ hora: 15, comidasHoy: 0 }), 'fiaca');
  assert.equal(situacionAlAbrir({ hora: 9, comidasHoy: 0 }), 'vacio');
  assert.equal(situacionAlAbrir({ hora: 12, comidasHoy: 2, kcal: 2500, kcalMeta: 2000 }), 'pasado');
  assert.equal(situacionAlAbrir({ hora: 12, comidasHoy: 0, diasSinEntrar: 4 }), 'volvio');
});

test('frases: arrancan con mayúscula aunque la comida venga en minúscula', () => {
  const r = elegirFrase('pesado', { vars: { comida: 'pizza' }, azar: () => 0 });
  assert.match(r.texto, /^[¿¡]?[A-ZÁÉÍÓÚÑ]/);
});

test('durmiendo: en e1 y e5 no queda sentado con el celular; desde las 22 con ayuno en curso', () => {
  assert.equal(archivoPersonaje({ etapa: 'e1', pose: 'durmiendo' }), 'e1-ojos-cerrados');
  assert.equal(archivoPersonaje({ etapa: 'e5', pose: 'durmiendo', limpieza: 90 }), 'e5-contento');
  assert.equal(archivoPersonaje({ etapa: 'e3', pose: 'durmiendo' }), 'e3-durmiendo');
  assert.equal(poseDelDia({ hora: 22, ayunoEnCurso: true, comidasHoy: 3, kcal: 1500, kcalMeta: 2000 }), 'durmiendo');
  assert.equal(poseDelDia({ hora: 22, ayunoEnCurso: false, comidasHoy: 3, kcal: 1500, kcalMeta: 2000 }), 'contento');
});

test('de madrugada la frase es de noche, no de arrancar el día', () => {
  assert.equal(situacionAlAbrir({ hora: 0, comidasHoy: 0 }), 'noche');
  assert.equal(situacionAlAbrir({ hora: 7, comidasHoy: 0 }), 'vacio');
});
