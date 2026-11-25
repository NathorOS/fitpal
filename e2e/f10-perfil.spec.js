// Perfil (Fase 8): editar datos y plan, respaldo (guardar / restaurar) y borrar todo.
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { vigilar, conPerfil, sinViolaciones } from './ayuda.js';

const db = (page, fn, ...a) => page.evaluate(async ([fn, a]) => (await import('/js/db.js'))[fn](...a), [fn, a]);

test('P-H1 editar datos: cambia la meta, valida y no inventa una pesada', async ({ page }) => {
  const errores = vigilar(page);
  await conPerfil(page);
  await page.goto('/index.html#/perfil');
  await sinViolaciones(page, 'perfil');
  await page.getByRole('link', { name: /Editar mis datos/ }).click();
  await sinViolaciones(page, 'tus datos');
  await page.getByLabel('Peso meta (kg)').fill('85');
  await expect(page.getByRole('alert')).toHaveText(/menor que tu peso actual/);
  await page.getByLabel('Peso meta (kg)').fill('72,5');
  await page.getByLabel('Cuánto te movés').selectOption('moderado');
  await expect(page.getByLabel('Meta de pasos por día')).toHaveValue('9000');
  await expect(page.locator('#vista-plan')).toContainText('→');
  await page.getByRole('button', { name: 'Guardar y recalcular' }).click();
  await expect(page).toHaveURL(/#\/perfil/);
  await expect(page.getByText(/tus datos y tu plan quedaron actualizados/)).toBeVisible();
  const perfil = await db(page, 'obtener', 'perfil', 'main');
  expect(perfil).toMatchObject({ peso_meta: 72.5, actividad: 'moderado', meta_pasos: 9000 });
  expect(await db(page, 'todos', 'peso')).toHaveLength(1);
  expect(errores).toEqual([]);
});

test('P-H2 respaldo: guardar, borrar todo y restaurar deja los datos como estaban', async ({ page }) => {
  await conPerfil(page);
  await page.evaluate(async () => {
    const { guardarComida } = await import('/js/registro.js');
    const { hoy } = await import('/js/db.js');
    await guardarComida({ fecha: hoy(), hora: '13:00', momento: 'almuerzo', items: [{ nombre: 'Rápido', emoji: '⚡', unidad: 'rapido', kcal: 600, prot: 0, carb: 0, grasa: 0, fibra: 0, g: 0 }] });
    await (await import('/js/ia.js')).guardarClave('clave-de-prueba-local-0000000000');
  });
  await page.goto('/index.html#/perfil');
  const descarga = page.waitForEvent('download');
  await page.getByRole('button', { name: /Guardar/ }).first().click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/^nathorfit-respaldo-\d{4}-\d{2}-\d{2}\.json$/);
  const ruta = await archivo.path();
  const json = JSON.parse(readFileSync(ruta, 'utf8'));
  expect(json.config.find(c => c.clave === 'gemini_clave')).toBeUndefined();   // la clave nunca sale
  await expect(page.getByText(/Último respaldo/)).toBeVisible();

  // Borrar todo → onboarding
  page.on('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Borrar todos mis datos' }).click();
  await expect(page).toHaveURL(/#\/onboarding/);
  await expect(page.getByRole('button', { name: 'Empezamos' })).toBeVisible();

  // Restaurar desde el perfil de otra instalación: se carga un perfil mínimo y se restaura el archivo
  await conPerfil(page, { nombre: 'Otra persona' });
  await page.goto('/index.html#/perfil');
  await page.locator('input[data-restaurar]').setInputFiles(ruta);
  // La app recarga después de restaurar: se espera el aviso que muestra Hoy ya recargado.
  await expect(page.getByText('✅ Respaldo restaurado.')).toBeVisible();
  const perfil = await db(page, 'obtener', 'perfil', 'main');
  expect(perfil.nombre).toBe('Prueba');
  expect(await db(page, 'todos', 'registro')).toHaveLength(1);
});

test('P-N1 restaurar un archivo que no es un respaldo: error claro y no se toca nada', async ({ page }) => {
  await conPerfil(page);
  await page.goto('/index.html#/perfil');
  page.on('dialog', d => d.accept());
  await page.locator('input[data-restaurar]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hola":1}') });
  await expect(page.getByText('El archivo no es un respaldo de Nathor Fit.')).toBeVisible();
  await page.locator('input[data-restaurar]').setInputFiles({ name: 'roto.json', mimeType: 'application/json', buffer: Buffer.from('no es json') });
  await expect(page.getByText(/no se puede leer/)).toBeVisible();
  expect((await db(page, 'obtener', 'perfil', 'main')).nombre).toBe('Prueba');
});

test('P-N2 un respaldo con una "foto" maliciosa no inyecta HTML', async ({ page }) => {
  await conPerfil(page);
  await page.evaluate(async () => {
    const { guardar, hoy } = await import('/js/db.js');
    await guardar('registro', { fecha: hoy(), hora: '10:00', momento: 'desayuno', kcal: 100, prot: 0, carb: 0, grasa: 0, fibra: 0,
      items: [{ nombre: 'x', emoji: '🍞', kcal: 100 }], foto: 'x" onerror="window.__pwned=1' });
  });
  await page.goto('/index.html#/hoy');
  await expect(page.getByRole('heading', { name: 'Comidas' })).toBeVisible();
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  expect(await page.locator('img.comida__foto').count()).toBe(0);
});

test('P-H5 guardar la clave: se prueba al instante con la lista de modelos', async ({ page }) => {
  const errores = vigilar(page);
  await conPerfil(page);
  let generar = 0;
  await page.route('https://generativelanguage.googleapis.com/**', r => {
    if (r.request().url().includes(':generateContent')) { generar++; return r.fulfill({ status: 500, json: {} }); }
    return r.fulfill({ json: { models: [
      { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    ] } });
  });
  await page.goto('/index.html#/perfil');
  await page.getByLabel('Clave de Gemini').fill('clave-de-prueba-local-0000000000');
  await page.getByRole('button', { name: 'Guardar y probar' }).click();
  await expect(page.getByText('¡Listo! La IA ya funciona.')).toBeVisible({ timeout: 5000 });
  expect(generar).toBe(0);                                         // la prueba no gasta cuota
  expect(await db(page, 'obtener', 'config', 'gemini_modelo')).toMatchObject({ valor: 'gemini-2.5-flash' });
  expect(errores).toEqual([]);
});

test('P-E5 si Gemini no contesta, la prueba de la clave corta con un mensaje (no queda cargando)', async ({ page }) => {
  test.setTimeout(40000);
  await conPerfil(page);
  await page.route('https://generativelanguage.googleapis.com/**', () => { /* nunca contesta */ });
  await page.goto('/index.html#/perfil');
  await page.getByLabel('Clave de Gemini').fill('clave-de-prueba-local-0000000000');
  const boton = page.getByRole('button', { name: 'Guardar y probar' });
  await boton.click();
  await expect(page.getByText(/tardó demasiado/)).toBeVisible({ timeout: 20000 });
  await expect(boton).toBeEnabled();
});
