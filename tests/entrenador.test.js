import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resumir, instrucciones, pedidoRutina, validarRutina, ejerciciosPara, pedidoRecetas, validarRecetas, recetaAItem,
  validarAnalisis, pedidoChat, textoDe, jsonDe, MAX_CHAT,
} from '../www/js/entrenador.js';

const ahora = new Date(2026, 10, 24, 13, 0);
const datos = (extra = {}) => ({
  perfil: { nombre: 'Niqo', sexo: 'm', nacimiento: '1990-06-15', altura_cm: 175, objetivo: 'bajar', peso_meta: 85, ritmo_kg_sem: 0.5,
    actividad: 'sedentario', equipo: 'ninguno', meta_pasos: 6000, gato: { nombre: 'Tito', personalidad: 'divertido' } },
  comidas: [
    { fecha: '2026-11-24', kcal: 700, prot: 30, items: [{ nombre: 'Milanesa' }, { nombre: 'Puré' }] },
    { fecha: '2026-11-23', kcal: 2100, prot: 90, items: [] },
    { fecha: '2026-11-20', kcal: 1900, prot: 110, items: [] },
    { fecha: '2026-11-01', kcal: 3000, prot: 60, items: [] },     // fuera de la semana
  ],
  agua: [{ fecha: '2026-11-24', ml: 500 }, { fecha: '2026-11-24', ml: 250 }],
  sesiones: [{ tipo: 'entrenamiento', fecha: '2026-11-22', nombre: 'Cuerpo completo A', minutos: 25 }, { tipo: 'actividad', fecha: '2026-11-24', minutos: 30 }],
  pesos: [{ fecha: '2026-10-10', kg: 96 }, { fecha: '2026-11-24', kg: 94 }],
  pasos: [{ fecha: '2026-11-24', pasos: 4000 }],
  metas: [{ fecha: '2026-10-10', kcal_objetivo: 2000, prot: 150, carb: 200, grasa: 60 }],
  ...extra,
});

test('resumen: hoy, semana, peso y entrenos, sin datos de más', () => {
  const r = resumir(datos(), { ahora, nivel: 'principiante' });
  assert.equal(r.hoy, '2026-11-24');
  assert.equal(r.perfil.edad, 36);
  assert.equal(r.perfil.sexo, 'hombre');
  assert.equal(r.piso_kcal, 1500);
  assert.deepEqual(r.hoy_lleva.comidas, ['Milanesa', 'Puré']);
  assert.equal(r.hoy_lleva.kcal, 700);
  assert.equal(r.hoy_lleva.agua_ml, 750);
  assert.equal(r.hoy_lleva.minutos_actividad, 30);
  assert.equal(r.semana.dias_anotados, 3);
  assert.equal(r.semana.kcal_promedio, Math.round((700 + 2100 + 1900) / 3));
  assert.equal(r.peso.actual, 94);
  assert.equal(r.peso.hace_30_dias, 96);
  assert.equal(r.dias.length, 14);
  assert.deepEqual(r.entrenos, [{ fecha: '2026-11-22', nombre: 'Cuerpo completo A', minutos: 25 }]);
  assert.equal(r.personaje.nombre, 'Tito');
  assert.ok(!JSON.stringify(r).includes('nacimiento'));          // la fecha de nacimiento no viaja, solo la edad
});

test('resumen: sin nada anotado no rompe', () => {
  const r = resumir(datos({ comidas: [], agua: [], sesiones: [], pasos: [], pesos: [] }), { ahora });
  assert.equal(r.semana.kcal_promedio, null);
  assert.equal(r.peso.actual, null);
  assert.equal(r.racha, 0);
});

test('instrucciones: piso de calorías y ritmo máximo siempre presentes', () => {
  const r = resumir(datos(), { ahora });
  const t = instrucciones(r);
  assert.match(t, /menos de 1500 kcal/);
  assert.match(t, /1 % del peso por semana/);
  assert.match(t, /Sos Tito/);
  const mujer = instrucciones(resumir(datos({ perfil: { ...datos().perfil, sexo: 'f' } }), { ahora }));
  assert.match(mujer, /menos de 1200 kcal/);
});

test('rutina: el pedido solo ofrece ejercicios del equipo', () => {
  const r = resumir(datos(), { ahora });
  const texto = pedidoRutina(r, { animo: 'cansado', minutos: 15 }).contents[0].parts[0].text;
  assert.match(texto, /cansado/);
  assert.match(texto, /15 minutos/);
  assert.ok(texto.includes('sentadilla |'));
  assert.ok(!texto.includes('press-banca |'));                  // de gimnasio
  assert.ok(ejerciciosPara('gimnasio').length > ejerciciosPara('ninguno').length);
});

test('rutina: descarta inventados, repetidos y de otro equipo; acota números', () => {
  const r = validarRutina({ nombre: 'Hoy', ejercicios: [
    { id: 'sentadilla', series: 12, reps: 100, descanso: 1 },
    { id: 'sentadilla', series: 3, reps: 10 },
    { id: 'inventado', series: 3 },
    { id: 'press-banca', series: 3, reps: 10 },
    { id: 'plancha', series: 3, segundos: 600 },
  ] }, 'ninguno');
  assert.deepEqual(r.ejercicios.map(x => x.id), ['sentadilla', 'plancha']);
  assert.deepEqual(r.ejercicios[0], { id: 'sentadilla', series: 5, objetivo: { reps: 25 }, descanso: 15 });
  assert.deepEqual(r.ejercicios[1].objetivo, { seg: 90 });
  assert.equal(r.id, 'ia');
  assert.equal(r.met, 4.5);
});

test('rutina: cardio de máquina va en minutos y una sola serie; vacía → null', () => {
  const r = validarRutina({ nombre: 'Cardio', ejercicios: [{ id: 'cinta', series: 4, segundos: 1200 }, { id: 'bici-fija', series: 1 }] }, 'gimnasio');
  assert.deepEqual(r.ejercicios.map(x => [x.series, x.objetivo.seg]), [[1, 1200], [1, 600]]);
  assert.equal(r.met, 6);
  assert.equal(validarRutina({ ejercicios: [{ id: 'nada' }] }, 'ninguno'), null);
  assert.equal(validarRutina(null), null);
});

test('recetas: pedido con lo que queda y foto opcional; limpieza de la respuesta', () => {
  const r = resumir(datos(), { ahora });
  const p = pedidoRecetas(r, { texto: 'huevos y papa', imagenBase64: 'AAA' });
  assert.match(p.contents[0].parts[0].text, /Me quedan 1300 kcal y me faltan 120 g de proteína/);
  assert.equal(p.contents[0].parts[1].inlineData.data, 'AAA');
  const v = validarRecetas({ comentario: 'Dale', recetas: [
    { nombre: 'Tortilla', kcal: 480, proteinas: 26, ingredientes: [{ nombre: 'Huevo', gramos: 150 }, { nombre: '', gramos: 5 }], pasos: ['Batir', ''] },
    { nombre: 'Sin ingredientes', kcal: 300, ingredientes: [], pasos: [] },
    { nombre: 'Sin calorías', kcal: 0, ingredientes: [{ nombre: 'Agua', gramos: 200 }], pasos: [] },
  ] });
  assert.equal(v.recetas.length, 1);
  assert.deepEqual(v.recetas[0].ingredientes, [{ nombre: 'Huevo', gramos: 150 }]);
  assert.deepEqual(v.recetas[0].pasos, ['Batir']);
  const it = recetaAItem(v.recetas[0]);
  assert.equal(it.fuente, 'ia');
  assert.equal(it.unidad, 'rapido');
  assert.equal(it.g, 150);
  assert.equal(it.kcal, 480);
});

test('análisis: máximo 3 de cada cosa y plan con título y texto', () => {
  const a = validarAnalisis({ titulo: 'Bien', resumen: 'r', bien: ['a', 'b', 'c', 'd'], plan: [{ titulo: 'x', texto: 'y' }, { titulo: 'sin texto' }] });
  assert.equal(a.bien.length, 3);
  assert.deepEqual(a.mejorar, []);
  assert.deepEqual(a.plan, [{ titulo: 'x', texto: 'y' }]);
  assert.equal(validarAnalisis({}).titulo, 'Cómo venís');
});

test('charla: historial con roles de Gemini y tope de mensajes', () => {
  const r = resumir(datos(), { ahora });
  const hist = Array.from({ length: 50 }, (_, i) => ({ rol: i % 2 ? 'pj' : 'yo', texto: `m${i}` }));
  const p = pedidoChat(r, hist, '¿Qué ceno?');
  assert.equal(p.contents.length, MAX_CHAT);
  assert.equal(p.contents.at(-1).parts[0].text, '¿Qué ceno?');
  assert.equal(p.contents.at(-2).role, 'model');
  assert.ok(!p.generationConfig.responseSchema);
});

test('respuestas: texto y JSON, con error claro si viene vacío o roto', () => {
  const resp = t => ({ candidates: [{ content: { parts: [{ text: t }] } }] });
  assert.equal(textoDe(resp(' hola ')), 'hola');
  assert.deepEqual(jsonDe(resp('{"a":1}')), { a: 1 });
  assert.throws(() => textoDe({}), /no contestó/);
  assert.throws(() => jsonDe(resp('no json')), /no pude leer/);
});
