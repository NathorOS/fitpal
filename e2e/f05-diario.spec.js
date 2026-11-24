// F05 Agua · F06 Peso y actividad · F07 Ayuno · menú "+".
import { test, expect } from '@playwright/test';
import { vigilar, conPerfil, sinViolaciones } from './ayuda.js';

test('F05-H1 agua: sumar y sacar vasos desde Hoy y desde el menú +', async ({ page }) => {
  const errores = vigilar(page);
  await conPerfil(page);
  await page.getByRole('button', { name: 'Sumar un vaso de 250 ml' }).click();
  await page.getByRole('button', { name: 'Sumar un vaso de 250 ml' }).click();
  await page.getByRole('button', { name: 'Sacar un vaso' }).click();
  await page.getByRole('button', { name: 'Agregar' }).click();             // el "+" flotante
  await sinViolaciones(page, 'menú +');
  await page.getByRole('button', { name: /Agua/ }).click();
  await expect(page.getByText('💧 +250 ml de agua')).toBeVisible();
  const total = await page.evaluate(async () => (await import('/js/actividad.js')).aguaDelDia((await import('/js/db.js')).hoy()));
  expect(total).toBe(500);
  expect(errores).toEqual([]);
});

test('F06-H1 peso con la rueda: se guarda y aparece en la lista', async ({ page }) => {
  await conPerfil(page);
  await page.goto('/index.html#/peso');
  await sinViolaciones(page, 'peso');
  const dec = page.getByRole('spinbutton', { name: /décimas/ });
  await dec.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
  await page.getByRole('button', { name: 'Guardar peso' }).click();
  await expect(page).toHaveURL(/#\/hoy/);
  const pesos = await page.evaluate(async () => (await import('/js/db.js')).todos('peso'));
  expect(pesos.at(-1).kg).toBe(80.4);
});

test('F06-H2 actividad y pasos suman a la meta del día', async ({ page }) => {
  await conPerfil(page);
  await page.goto('/index.html#/actividad');
  await sinViolaciones(page, 'actividad');
  await page.getByRole('button', { name: /^Anotar / }).click();
  await expect(page).toHaveURL(/#\/hoy/);
  await expect(page.getByText(/kcal quemadas/)).toBeVisible();
  await page.goto('/index.html#/actividad');
  await page.getByRole('button', { name: 'Pasos' }).click();
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Más 500 pasos' }).click();
  await page.getByRole('button', { name: 'Guardar pasos' }).click();
  await expect(page.getByText(/de 6\.000 pasos/)).toBeVisible();
});

test('F07-H1 ayuno: empezar, ver el reloj y cancelar sin guardar', async ({ page }) => {
  await conPerfil(page);
  await page.goto('/index.html#/ayuno');
  await sinViolaciones(page, 'ayuno');
  await page.getByRole('button', { name: /Empezar ayuno de/ }).click();
  await expect(page.getByRole('heading', { name: 'Estás en ayuno' })).toBeVisible();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: /Cancelar/ }).click();
  const ayunos = await page.evaluate(async () => (await import('/js/db.js')).todos('ayuno'));
  expect(ayunos.filter(a => !a.fin)).toHaveLength(0);
});

test('Hoy-E1 cambiar de día y anotar en un día pasado', async ({ page }) => {
  await conPerfil(page);
  await page.getByRole('link', { name: 'Día anterior' }).click();
  await expect(page.getByText('Ayer', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Anotar comida' }).first().click();
  await page.getByRole('button', { name: /Registro rápido/ }).click();
  await page.getByLabel('Calorías').fill('500');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await page.getByRole('button', { name: /^Anotar 500 kcal/ }).click();
  const [c] = await page.evaluate(async () => (await import('/js/db.js')).todos('registro'));
  const hoy = await page.evaluate(async () => (await import('/js/db.js')).hoy());
  expect(c.fecha < hoy).toBe(true);
});
