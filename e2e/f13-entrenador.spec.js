// Entrenador con IA: rutina, cocinar, cómo vengo, charla y consejo del día (Gemini simulado).
import { test, expect } from '@playwright/test';
import { vigilar, conPerfil, sinViolaciones } from './ayuda.js';

const resp = obj => ({ json: { candidates: [{ content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] } }] } });

/** Simula a Gemini según lo que se le pide. Devuelve la lista de pedidos para revisarlos. */
async function geminiFalso(page) {
  const pedidos = [];
  await page.route('https://generativelanguage.googleapis.com/**', async r => {
    if (r.request().method() === 'GET') return r.fulfill({ json: { models: [{ name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }] } });
    const b = r.request().postDataJSON();
    pedidos.push({ url: r.request().url(), headers: r.request().headers(), body: b });
    const t = JSON.stringify(b.contents.at(-1));
    if (t.includes('Armame la rutina')) return r.fulfill(resp({ nombre: 'Piernas sin drama', porque: 'Ayer descansaste.', consejo: 'Respirá.', ejercicios: [
      { id: 'sentadilla', series: 2, reps: 10, descanso: 30 }, { id: 'press-banca', series: 3, reps: 10 }, { id: 'puente', series: 2, reps: 12, descanso: 30 }] }));
    if (t.includes('qué puedo cocinar')) return r.fulfill(resp({ comentario: 'No te zarpes.', recetas: [
      { nombre: 'Tortilla al horno', minutos: 30, kcal: 480, proteinas: 26, carbohidratos: 45, grasas: 20,
        ingredientes: [{ nombre: 'Huevo', gramos: 150 }, { nombre: 'Papa', gramos: 250 }], pasos: ['Hervir la papa.', 'Hornear con el huevo.'] }] }));
    if (t.includes('Analizá cómo vengo')) return r.fulfill(resp({ titulo: 'Flojo de papeles', resumen: 'Anotaste 1 de 7 días.',
      bien: ['Te pesaste'], mejorar: ['Anotás poco'], plan: [{ titulo: 'Anotá todo', texto: 'Los 7 días.' }] }));
    if (t.includes('UN consejo')) return r.fulfill(resp({ consejo: 'Hoy meté 30 g de proteína en el almuerzo.' }));
    return r.fulfill(resp('Cená pollo o huevos.'));
  });
  return pedidos;
}

const conClave = page => page.evaluate(async () => (await import('/js/ia.js')).guardarClave('clave-de-prueba-local-0000000000'));

test('E-N1 sin clave, el entrenador explica cómo activarlo', async ({ page }) => {
  await conPerfil(page);
  await expect(page.getByRole('link', { name: /Tu entrenador/ })).toContainText(/Tocá para activarlo/);
  await page.getByRole('link', { name: 'Entrenador', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Entrenador' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cargar mi clave en Perfil' })).toBeVisible();
  await sinViolaciones(page, 'entrenador sin clave');
});

test('E-H1 rutina del día: la IA la arma, se filtra y se puede empezar', async ({ page }) => {
  const errores = vigilar(page);
  const pedidos = await geminiFalso(page);
  await conPerfil(page);
  await conClave(page);
  await page.reload();
  await expect(page.locator('#consejo-coach')).toHaveText('Hoy meté 30 g de proteína en el almuerzo.');
  await page.getByRole('link', { name: /Tu entrenador/ }).click();
  await expect(page.getByText('Hoy meté 30 g de proteína en el almuerzo.')).toBeVisible();
  await sinViolaciones(page, 'entrenador');
  await page.getByRole('button', { name: /Cansado/ }).click();
  await page.getByRole('button', { name: '15 min' }).click();
  await page.getByRole('button', { name: /Armar mi rutina/ }).click();
  await expect(page.getByRole('heading', { name: 'Piernas sin drama' })).toBeVisible();
  await expect(page.getByText('Sentadilla')).toBeVisible();
  await expect(page.getByText('Press de banca')).toHaveCount(0);          // de gimnasio: se descarta
  const rutina = pedidos.find(p => JSON.stringify(p.body).includes('Armame la rutina')).body;
  expect(JSON.stringify(rutina)).toContain('cansado');
  expect(JSON.stringify(rutina)).toContain('15 minutos');
  expect(pedidos.every(p => !p.url.includes('clave-de-prueba'))).toBe(true);   // la clave va en el encabezado
  await sinViolaciones(page, 'entrenador con rutina');
  await page.getByRole('link', { name: /Empezar/ }).click();
  await expect(page).toHaveURL(/#\/sesion\?rutina=ia/);
  await expect(page.getByRole('heading', { name: 'Sentadilla' })).toBeVisible();
  // El consejo se pidió una sola vez en el día
  expect(pedidos.filter(p => JSON.stringify(p.body).includes('UN consejo')).length).toBe(1);
  expect(errores).toEqual([]);
});

test('E-H2 qué cocino: la receta va al carrito para revisarla', async ({ page }) => {
  const errores = vigilar(page);
  await geminiFalso(page);
  await conPerfil(page);
  await conClave(page);
  await page.goto('/index.html#/entrenador?tab=cocinar');
  await page.getByLabel('Lo que tenés en casa').fill('huevos y papa');
  await page.getByRole('button', { name: /Proponeme/ }).click();
  await expect(page.getByRole('heading', { name: 'Tortilla al horno' })).toBeVisible();
  await page.getByText('Ingredientes y pasos').click();
  await expect(page.getByText('Hervir la papa.')).toBeVisible();
  await sinViolaciones(page, 'recetas');
  await page.getByRole('button', { name: 'Anotar esta' }).click();
  await expect(page).toHaveURL(/#\/registrar\?desde=ia/);
  await expect(page.getByRole('button', { name: 'Anotar 480 kcal' })).toBeVisible();
  expect(errores).toEqual([]);
});

test('E-H3 cómo vengo y charla', async ({ page }) => {
  const errores = vigilar(page);
  const pedidos = await geminiFalso(page);
  await conPerfil(page);
  await conClave(page);
  await page.goto('/index.html#/entrenador?tab=progreso');
  await page.getByRole('button', { name: /Analizar cómo vengo/ }).click();
  await expect(page.getByRole('heading', { name: 'Flojo de papeles' })).toBeVisible();
  await expect(page.getByText('Anotá todo')).toBeVisible();
  await sinViolaciones(page, 'cómo vengo');
  // Volver a entrar no gasta otro pedido: el análisis del día queda guardado
  await page.getByRole('button', { name: 'Charlar' }).click();
  await page.getByRole('button', { name: 'Cómo vengo' }).click();
  await expect(page.getByRole('heading', { name: 'Flojo de papeles' })).toBeVisible();
  expect(pedidos.filter(p => JSON.stringify(p.body).includes('Analizá cómo vengo')).length).toBe(1);

  await page.getByRole('button', { name: 'Charlar' }).click();
  await page.getByLabel('Tu mensaje').fill('¿Qué ceno?');
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByText('Cená pollo o huevos.')).toBeVisible();
  await expect(page.locator('.chat__msg--yo')).toHaveText('¿Qué ceno?');
  await sinViolaciones(page, 'charla');
  // El resumen de datos viaja como instrucción de sistema
  const charla = pedidos.at(-1).body;
  expect(charla.systemInstruction.parts[0].text).toContain('RESUMEN DE DATOS');
  await page.reload();
  await expect(page.getByText('Cená pollo o huevos.')).toBeVisible();     // la charla queda guardada
  expect(errores).toEqual([]);
});

test('E-E1 si la IA falla, el error se muestra y se puede reintentar', async ({ page }) => {
  await page.route('https://generativelanguage.googleapis.com/**', r => r.fulfill({ status: 429, json: {} }));
  await conPerfil(page);
  await conClave(page);
  await page.goto('/index.html#/entrenador');
  await page.getByRole('button', { name: /Armar mi rutina/ }).click();
  await expect(page.getByRole('alert')).toHaveText(/límite gratuito/);
  await expect(page.getByRole('button', { name: /Armar mi rutina/ })).toBeEnabled();
});
