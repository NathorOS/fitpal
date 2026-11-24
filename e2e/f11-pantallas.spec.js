// Resto de las pantallas (accesibilidad + que abran sin errores), entrenamiento y modo sin conexión.
import { test, expect } from '@playwright/test';
import { vigilar, conPerfil, sinViolaciones } from './ayuda.js';

for (const [ruta, titulo] of [['#/hoy', /Calorías de hoy/], ['#/progreso', /Progreso/], ['#/retos', /Retos/], ['#/entrenar', /Entren/],
  ['#/perfil', /Prueba/], ['#/datos', /Tus datos/], ['#/registrar', /Agregar comida/], ['#/ia?modo=texto', /Describir|IA/], ['#/racha', /./]]) {
  test(`A11Y ${ruta} abre sin errores y sin problemas graves de accesibilidad`, async ({ page }) => {
    const errores = vigilar(page);
    await conPerfil(page);
    await page.goto('/index.html' + ruta);
    await expect(page.getByRole('heading', { name: titulo }).first()).toBeVisible();
    await sinViolaciones(page, ruta);
    expect(errores).toEqual([]);
  });
}

test('A11Y Hoy de noche (escena oscura) mantiene el contraste', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-23T22:30:00-03:00') });
  await conPerfil(page);
  await expect(page.locator('.hoy__escena--noche')).toBeVisible();
  await sinViolaciones(page, 'hoy noche');
});

for (const [hora, clase] of [['10:00', 'manana'], ['18:30', 'tarde']]) {
  test(`A11Y Hoy a las ${hora} (escena ${clase})`, async ({ page }) => {
    await page.clock.install({ time: new Date(`2026-11-23T${hora}:00-03:00`) });
    await conPerfil(page);
    await expect(page.locator(`.hoy__escena--${clase}`)).toBeVisible();
    await sinViolaciones(page, `hoy ${clase}`);
  });
}

test('F06-H3 entrenamiento: empezar una rutina y marcar una serie', async ({ page }) => {
  const errores = vigilar(page);
  await conPerfil(page);
  await page.goto('/index.html#/entrenar');
  await page.getByRole('link', { name: 'Empezar' }).first().click();
  await expect(page).toHaveURL(/#\/sesion/);
  await sinViolaciones(page, 'sesión');
  await page.getByRole('button', { name: /Serie hecha|Empezar/ }).first().click();
  expect(errores).toEqual([]);
});

test('OFF-H1 sin conexión la app abre igual (service worker)', async ({ page, context }) => {
  await conPerfil(page);
  await page.goto('/index.html?sw=1#/hoy');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();       // ya controlada por el service worker
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  for (const ruta of ['#/hoy', '#/registrar', '#/progreso', '#/perfil', '#/peso']) {
    await page.goto('/index.html?sw=1' + ruta);
    await expect(page.locator('#vista h1, #vista h2').first()).toBeVisible();
    await expect(page.getByText('Algo no salió bien')).toHaveCount(0);
  }
  await context.setOffline(false);
});
