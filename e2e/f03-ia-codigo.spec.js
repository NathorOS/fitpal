// F03/F04 Foto y texto con IA (Gemini simulado: nunca se llama a Google en las pruebas) y código de barras
// (Open Food Facts simulado).
import { test, expect } from '@playwright/test';
import { vigilar, conPerfil, sinViolaciones } from './ayuda.js';

const respuestaGemini = platos => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ platos }) }] } }] });
// 1×1 px PNG válido, para simular la foto elegida
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('F04-N1 sin clave, la IA explica cómo cargarla', async ({ page }) => {
  await conPerfil(page);
  await page.goto('/index.html#/ia?modo=texto');
  await expect(page.getByText(/necesito tu clave de Gemini/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cargar mi clave en Perfil' })).toBeVisible();
});

test('F03-H1 foto con IA → carrito → comida guardada con miniatura', async ({ page }) => {
  const errores = vigilar(page);
  let pedido = null;
  await page.route('https://generativelanguage.googleapis.com/**', async route => {
    pedido = route.request();
    await route.fulfill({ json: respuestaGemini([
      { nombre: 'Milanesa de carne al horno', gramos: 150, kcal: 320, proteinas: 33, carbohidratos: 19, grasas: 12, fibra: 1, confianza: 0.8 },
      { nombre: 'Puré de papas', gramos: 200, kcal: 210, proteinas: 4, carbohidratos: 32, grasas: 8, fibra: 3, confianza: 0.7 },
    ]) });
  });
  await conPerfil(page);
  await page.evaluate(async () => (await import('/js/ia.js')).guardarClave('clave-de-prueba-local-0000000000'));
  await page.goto('/index.html#/ia?modo=foto');
  await page.locator('input[data-foto]:not([capture])').setInputFiles({ name: 'plato.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('img', { name: 'La foto que elegiste' })).toBeVisible();
  await sinViolaciones(page, 'IA foto');
  await page.getByRole('button', { name: /Analizar/ }).click();
  await page.getByRole('button', { name: 'Revisar y anotar' }).click();
  // La clave va en el encabezado, nunca en la dirección
  expect(pedido.url()).not.toContain('clave-de-prueba');
  expect(pedido.headers()['x-goog-api-key']).toBe('clave-de-prueba-local-0000000000');
  await expect(page.getByText(/Revisá lo que encontró la IA/)).toBeVisible();
  await page.getByRole('button', { name: /^Anotar \d+ kcal/ }).click();
  await expect(page).toHaveURL(/#\/resultado/);
  await expect(page.getByRole('img', { name: 'Foto de tu comida' })).toBeVisible();
  const [c] = await page.evaluate(async () => (await import('/js/db.js')).todos('registro'));
  expect(c.items).toHaveLength(2);
  expect(c.foto).toMatch(/^data:image\/jpeg;base64,/);
  expect(errores).toEqual([]);
});

test('F04-N2 la IA no encuentra comida: mensaje claro, sin carrito', async ({ page }) => {
  await page.route('https://generativelanguage.googleapis.com/**', r => r.fulfill({ json: respuestaGemini([]) }));
  await conPerfil(page);
  await page.evaluate(async () => (await import('/js/ia.js')).guardarClave('clave-de-prueba-local-0000000000'));
  await page.goto('/index.html#/ia?modo=texto');
  await page.getByLabel('Qué comiste').fill('nada');
  await page.getByRole('button', { name: /Analizar/ }).click();
  await expect(page.getByText(/No entendí qué comiste/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revisar y anotar' })).toHaveCount(0);
});

test('F04-N3 clave inválida o sin conexión: error entendible', async ({ page }) => {
  await page.route('https://generativelanguage.googleapis.com/**', r => r.fulfill({ status: 400, json: { error: { status: 'INVALID_ARGUMENT', message: 'API key not valid' } } }));
  await conPerfil(page);
  await page.evaluate(async () => (await import('/js/ia.js')).guardarClave('clave-de-prueba-local-0000000000'));
  await page.goto('/index.html#/ia?modo=texto');
  await page.getByLabel('Qué comiste').fill('2 empanadas de carne');
  await page.getByRole('button', { name: /Analizar/ }).click();
  await expect(page.getByText(/clave/i).first()).toBeVisible();
});

test('F03-H2 código de barras escrito a mano → producto → anotar', async ({ page }) => {
  await page.route('https://world.openfoodfacts.org/**', r => r.fulfill({ json: { status: 1, product: {
    code: '7790000000017', product_name: 'Galletitas de prueba', brands: 'Marca', serving_quantity: 30,
    nutriments: { 'energy-kcal_100g': 450, proteins_100g: 8, carbohydrates_100g: 70, fat_100g: 15, fiber_100g: 3 } } } }));
  await conPerfil(page);
  await page.goto('/index.html#/codigo');
  await sinViolaciones(page, 'código');
  await page.getByLabel('Número del código').fill('7790000000017');
  await page.getByRole('button', { name: 'Buscar producto' }).click();
  const hoja = page.getByRole('dialog');
  await expect(hoja.getByRole('heading', { name: /Galletitas de prueba/ })).toBeVisible();
  await hoja.getByRole('button', { name: /^Agregar \d+ kcal/ }).click();
  await page.getByRole('button', { name: /^Anotar \d+ kcal/ }).click();
  await expect(page).toHaveURL(/#\/resultado/);
});

test('F03-N1 código que no existe', async ({ page }) => {
  await page.route('https://world.openfoodfacts.org/**', r => r.fulfill({ status: 404, json: { status: 0 } }));
  await conPerfil(page);
  await page.goto('/index.html#/codigo');
  await page.getByLabel('Número del código').fill('7790000000024');
  await page.getByRole('button', { name: 'Buscar producto' }).click();
  await expect(page.getByText(/No encontré el 7790000000024/)).toBeVisible();
  // Se puede volver a buscar después de no encontrar
  await page.getByLabel('Número del código').fill('abc');
  await page.getByRole('button', { name: 'Buscar producto' }).click();
  await expect(page.locator('.error')).not.toBeEmpty();
});

test('F04-H2 no está en la base → "Calcular con la IA" → se anota y la próxima vez aparece', async ({ page }) => {
  const errores = vigilar(page);
  await page.route('https://generativelanguage.googleapis.com/**', r => r.fulfill({ json: respuestaGemini([
    { nombre: 'Guiso de la abuela', gramos: 300, kcal: 450, proteinas: 20, carbohidratos: 50, grasas: 18, fibra: 4, confianza: 0.7 },
  ]) }));
  await conPerfil(page);
  await page.evaluate(async () => (await import('/js/ia.js')).guardarClave('clave-de-prueba-local-0000000000'));
  await page.goto('/index.html#/registrar');
  await page.getByLabel('Buscar un alimento').fill('guiso de la abuela');
  await page.getByRole('link', { name: /Calcular “guiso de la abuela” con la IA/ }).click();
  await expect(page.getByLabel('Qué comiste')).toHaveValue('guiso de la abuela');
  await page.getByRole('button', { name: /Analizar/ }).click();
  await page.getByRole('button', { name: 'Revisar y anotar' }).click();
  await page.getByRole('button', { name: /^Anotar \d+ kcal/ }).click();
  await expect(page).toHaveURL(/#\/resultado/);
  // Quedó guardado como alimento propio
  await page.goto('/index.html#/registrar');
  await page.getByLabel('Buscar un alimento').fill('guiso abuela');
  await expect(page.getByRole('button', { name: /^Guiso de la abuela/ })).toBeVisible();
  expect(errores).toEqual([]);
});

test('F02-E4 búsqueda de cosas cotidianas que antes faltaban', async ({ page }) => {
  await conPerfil(page);
  await page.goto('/index.html#/registrar');
  for (const [q, nombre] of [['mate dulce', /^Mate dulce/], ['tostadas con manteca', /^Tostada con manteca/], ['chipa', /^Chipá/]]) {
    await page.getByLabel('Buscar un alimento').fill(q);
    await expect(page.getByRole('button', { name: nombre }).first()).toBeVisible();
  }
});
