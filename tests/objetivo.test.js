// Pruebas de la Fase 1 con 3 perfiles calculados a mano (Mifflin-St Jeor).
// Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarPerfil, calcularPlan, imc, pesoMetaMinimo } from '../www/js/objetivo.js';

const HOY = new Date(2026, 10, 23); // 23/11/2026, hora local

// A: mujer 30 años, 165 cm, 80 kg, sedentaria, 0,5 kg/sem
//    BMR = 800 + 1031,25 - 150 - 161 = 1520,25 · TDEE = 1520,25 × 1,2 = 1824,3
//    meta = 1824,3 - 0,5 × 7700 / 7 = 1274,3 → 1274
//    prot = 80 × 1,8 = 144 · grasa = 1274 × 0,25 / 9 = 35 · carb = (1274 - 576 - 315) / 4 = 96
const A = { objetivo: 'bajar', sexo: 'f', nacimiento: '1996-05-10', altura_cm: 165, peso_kg: 80,
  peso_meta: 68, actividad: 'sedentario', ritmo_kg_sem: 0.5, equipo: 'ninguno' };

// B: hombre 40 años, 180 cm, 100 kg, moderado, 1 kg/sem (justo el 1 %)
//    BMR = 1000 + 1125 - 200 + 5 = 1930 · TDEE = 1930 × 1,55 = 2991,5 → 2992 (redondeado)
//    meta = 2992 - 1100 = 1892
const B = { objetivo: 'bajar', sexo: 'm', nacimiento: '1986-01-15', altura_cm: 180, peso_kg: 100,
  peso_meta: 85, actividad: 'moderado', ritmo_kg_sem: 1, equipo: 'gimnasio' };

// C: mujer 50 años, 155 cm, 60 kg, sedentaria, pide 1 kg/sem
//    ritmo máx = 0,6 kg/sem · BMR = 600 + 968,75 - 250 - 161 = 1157,75 · TDEE = 1389,3 → 1389
//    meta = 1389 - 660 = 729 → piso 1200 · ritmo real = (1389 - 1200) × 7 / 7700 = 0,17
const C = { objetivo: 'bajar', sexo: 'f', nacimiento: '1976-03-02', altura_cm: 155, peso_kg: 60,
  peso_meta: 55, actividad: 'sedentario', ritmo_kg_sem: 1, equipo: 'mancuernas' };

test('perfil A: déficit normal, sin pisos', () => {
  const p = calcularPlan(A, HOY);
  assert.equal(p.edad, 30);
  assert.equal(p.bmr, 1520);
  assert.equal(p.tdee, 1824);
  assert.equal(p.kcal, 1274);
  assert.deepEqual(p.macros, { prot: 144, grasa: 35, carb: 96 });
  assert.equal(p.limitadoPorPiso, false);
  assert.equal(p.limitadoPorRitmo, false);
  assert.equal(p.semanas, 24);            // 12 kg / 0,5 kg
});

test('perfil B: hombre, ritmo justo en el 1 %', () => {
  const p = calcularPlan(B, HOY);
  assert.equal(p.edad, 40);
  assert.equal(p.tdee, 2992);
  assert.equal(p.kcal, 1892);
  assert.equal(p.limitadoPorRitmo, false);
  assert.equal(p.semanas, 15);
});

test('perfil C: actúan el límite de ritmo y el piso de 1200', () => {
  const p = calcularPlan(C, HOY);
  assert.equal(p.tdee, 1389);
  assert.equal(p.kcal, 1200);
  assert.equal(p.limitadoPorRitmo, true);
  assert.equal(p.limitadoPorPiso, true);
  assert.equal(p.ritmoReal, 0.17);
  assert.equal(p.semanas, 30);            // 5 kg / 0,17 → 29,4 → 30
});

test('la meta nunca baja del piso (barrido de perfiles)', () => {
  for (const sexo of ['m', 'f'])
    for (const kg of [40, 50, 60, 90, 150])
      for (const actividad of ['sedentario', 'alto'])
        for (const ritmo_kg_sem of [0.25, 1]) {
          const p = calcularPlan({ ...A, sexo, peso_kg: kg, peso_meta: kg - 5, actividad, ritmo_kg_sem }, HOY);
          assert.ok(p.kcal >= (sexo === 'm' ? 1500 : 1200), `${sexo} ${kg} kg → ${p.kcal}`);
        }
});

test('mantener: calorías = gasto, sin fecha', () => {
  const p = calcularPlan({ ...A, objetivo: 'mantener' }, HOY);
  assert.equal(p.kcal, p.tdee);
  assert.equal(p.semanas, null);
});

test('validaciones', () => {
  assert.equal(validarPerfil(A, HOY).ok, true);
  const menor = validarPerfil({ ...A, nacimiento: '2010-01-01' }, HOY);
  assert.match(menor.errores.nacimiento, /mayores de 18/);
  assert.ok(validarPerfil({ ...A, altura_cm: 90 }, HOY).errores.altura_cm);
  assert.ok(validarPerfil({ ...A, peso_kg: 400 }, HOY).errores.peso_kg);
  assert.match(validarPerfil({ ...A, peso_meta: 85 }, HOY).errores.peso_meta, /menor/);
  assert.match(validarPerfil({ ...A, peso_meta: 45 }, HOY).errores.peso_meta, /mínima es 50.4/);
  assert.ok(validarPerfil({ ...A, ritmo_kg_sem: 2 }, HOY).errores.ritmo_kg_sem);
  assert.ok(validarPerfil({ ...A, actividad: 'atleta' }, HOY).errores.actividad);
  assert.equal(validarPerfil({ ...A, objetivo: 'mantener', peso_meta: null, ritmo_kg_sem: null }, HOY).ok, true);
});

test('cumpleaños en hora local', () => {
  assert.equal(calcularPlan({ ...A, nacimiento: '1996-11-23' }, HOY).edad, 30);
  assert.equal(calcularPlan({ ...A, nacimiento: '1996-11-24' }, HOY).edad, 29);
});

test('IMC', () => {
  assert.equal(imc(80, 165), 29.4);
  assert.equal(pesoMetaMinimo(165), 50.4);
});
