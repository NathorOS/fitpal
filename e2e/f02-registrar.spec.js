// F02 Registrar por búsqueda, registro rápido, editar y borrar.
import { test, expect } from '@playwright/test';
import { vigilar, conPerfil, sinViolaciones } from './ayuda.js';

const comidas = page => page.evaluate(async () => (await import('/js/db.js')).todos('registro'));

test('F02-H1 buscar, agregar y anotar una comida', async ({ page }) => {
  const errores = vigilar(page);
  await conPerfil(page);
  await page.getByRole('link', { name: 'Anotar comida' }).first().click();
  await sinViolaciones(page, 'registrar');
  await page.getByLabel('Buscar un alimento').fill('milanesa');
  await page.getByRole('button', { name: /^Milanesa de carne al horno/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await sinViolaciones(page, 'hoja de alimento');
  const hoja = page.getByRole('dialog');
  await hoja.getByRole('button', { name: 'Más' }).click();          // 1,5 porciones
  await hoja.getByRole('button', { name: /^Agregar \d+ kcal/ }).click();
  await page.getByRole('button', { name: /^Anotar \d+ kcal/ }).click();
  await expect(page).toHaveURL(/#\/resultado/);
  await page.getByRole('link', { name: 'Listo' }).click();
  // Primera comida del día: pasa por la racha antes de volver a Hoy
  await expect(page).toHaveURL(/#\/racha/);
  await sinViolaciones(page, 'racha');
  await page.getByRole('link', { name: 'Seguir' }).click();
  await expect(page.getByRole('link', { name: /kcal\. Editar/ })).toHaveCount(1);
  const [c] = await comidas(page);
  expect(c.items[0].cantidad).toBe(1.5);
  expect(errores).toEqual([]);
});

test('F02-E1 búsqueda con acentos, eñes y sin resultados', async ({ page }) => {
  await conPerfil(page);
  await page.goto('/index.html#/registrar');
  await page.getByLabel('Buscar un alimento').fill('ñoquis');
  await expect(page.getByRole('button', { name: /Ñoquis/i }).first()).toBeVisible();
  await page.getByLabel('Buscar un alimento').fill('noquis');
  await expect(page.getByRole('button', { name: /Ñoquis/i }).first()).toBeVisible();
  await page.getByLabel('Buscar un alimento').fill('zzzzqqq');
  await expect(page.getByText(/No encontré "zzzzqqq"/)).toBeVisible();
});

test('F02-E2 doble toque en Anotar guarda una sola comida', async ({ page }) => {
  await conPerfil(page);
  await page.goto('/index.html#/registrar');
  await page.getByRole('button', { name: /Registro rápido/ }).click();
  await page.getByLabel('Calorías').fill('350');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  const anotar = page.getByRole('button', { name: /^Anotar 350 kcal/ });
  await anotar.dblclick();
  await expect(page).toHaveURL(/#\/resultado/);
  expect(await comidas(page)).toHaveLength(1);
});

test('F02-H2 editar y borrar una comida', async ({ page }) => {
  await conPerfil(page);
  await page.goto('/index.html#/registrar');
  await page.getByRole('button', { name: /Registro rápido/ }).click();
  await page.getByLabel(/Qué comiste/).fill('Postre del cumple 🎂');
  await page.getByLabel('Calorías').fill('420');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await page.getByRole('button', { name: /^Anotar 420 kcal/ }).click();
  await page.goto('/index.html#/hoy');
  await page.getByRole('link', { name: /420 kcal\. Editar/ }).click();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Borrar comida' }).click();
  await expect(page).toHaveURL(/#\/hoy/);
  expect(await comidas(page)).toHaveLength(0);
});

test('F02-E3 registro rápido sin calorías no se agrega', async ({ page }) => {
  await conPerfil(page);
  await page.goto('/index.html#/registrar');
  await page.getByRole('button', { name: /Registro rápido/ }).click();
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await comidas(page)).toHaveLength(0);
});
