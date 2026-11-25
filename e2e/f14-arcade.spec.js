// Modo arcade: salidas con GPS simulado y reloj controlado (sin moverse de la silla).
import { test, expect } from '@playwright/test';
import { vigilar, conPerfil, sinViolaciones } from './ayuda.js';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const M = 1 / 111195;
const LAT0 = -34.5755, LON0 = -58.4167;

/** GPS falso: window.__gps(metrosAlNorte, precision) manda un punto a la app. `sinPermiso` simula que lo negaste. */
async function gpsFalso(page, { sinPermiso = false } = {}) {
  await page.addInitScript(({ sinPermiso }) => {
    const subs = new Map(); let id = 0;
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      watchPosition(ok, err) { if (sinPermiso) { setTimeout(() => err({ code: 1, message: 'denied' }), 0); return 0; } subs.set(++id, ok); return id; },
      clearWatch(k) { subs.delete(k); },
      getCurrentPosition() {},
    } });
    window.__gps = (lat, lon, acc = 5) => subs.forEach(f => f({ coords: { latitude: lat, longitude: lon, accuracy: acc }, timestamp: Date.now() }));
  }, { sinPermiso });
  await page.route('https://tile.openstreetmap.org/**', r => r.fulfill({ contentType: 'image/png', body: PNG }));
}

/** Camina hacia el norte: `n` puntos, `metros` cada `seg` segundos (adelanta el reloj de la página). */
async function caminar(page, { desde = 0, n, metros = 10, seg = 7 }) {
  for (let i = desde; i < desde + n; i++) {
    await page.evaluate(([lat, lon]) => window.__gps(lat, lon), [LAT0 + i * metros * M, LON0]);
    await page.clock.runFor(seg * 1000);
  }
}

async function abrirArcade(page) {
  await page.getByRole('link', { name: 'Entrenador', exact: true }).click();
  await page.getByRole('link', { name: /MODO ARCADE/ }).click();
  await expect(page.getByRole('heading', { name: '¡A JUGAR AFUERA!' })).toBeVisible();
}

async function arrancar(page) {
  await page.getByRole('button', { name: '▶ START' }).click();
  await page.clock.runFor(3000);                      // 3, 2, 1, ¡YA!
  await expect(page.getByRole('button', { name: '⏸ PAUSA' })).toBeVisible();
}

test('A-H1 caminata de 1 km: monedas, nivel, meta, guardar y sumar al día', async ({ page }) => {
  const errores = vigilar(page);
  await gpsFalso(page);
  await page.clock.install({ time: new Date('2026-11-25T08:00:00') });
  await conPerfil(page);
  await abrirArcade(page);
  await sinViolaciones(page, 'arcade lobby');
  await expect(page.getByRole('button', { name: /CAMINATA/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '1 KM' }).click();
  await expect(page.getByRole('button', { name: '1 KM' })).toHaveAttribute('aria-pressed', 'true');
  await arrancar(page);
  await expect(page.getByText('BUSCANDO SEÑAL GPS')).toBeVisible();
  await sinViolaciones(page, 'arcade partida');

  await caminar(page, { n: 25 });                          // 240 m
  await expect(page.locator('#d-km')).toHaveText('0,24');
  await expect(page.locator('#h-puntos')).toHaveText('000030');      // 10 + 20 (combo x2)
  await expect(page.locator('#h-combo')).toHaveText('x3');
  await expect(page.locator('.mapa__moneda')).toHaveCount(2);
  await expect(page.locator('#h-desafio')).toContainText('TURBO');   // a los 2 minutos en movimiento

  await caminar(page, { desde: 25, n: 87 });                // 1,11 km
  await expect(page.locator('#d-km')).toHaveText('1,11');
  await expect(page.locator('#h-nivel')).toHaveText('2');
  await expect(page.locator('#d-pasos')).toHaveText(/^1\.6\d\d$/);   // 1110 m / (165 cm × 0,415)

  // Pausa a mano: lo que te movés en pausa no cuenta
  await page.getByRole('button', { name: '⏸ PAUSA' }).click();
  await expect(page.getByText('⏸ EN PAUSA')).toBeVisible();
  await page.evaluate(([lat, lon]) => window.__gps(lat, lon), [LAT0 + 3000 * M, LON0]);
  await page.clock.runFor(5000);
  await expect(page.locator('#d-km')).toHaveText('1,11');
  await page.getByRole('button', { name: '▶ SEGUIR' }).click();

  // Modo bolsillo: dos toques para volver
  await page.getByRole('button', { name: /Modo bolsillo/ }).click();
  await expect(page.locator('#bolsillo')).toBeVisible();
  await page.locator('#bolsillo').click();
  await page.locator('#bolsillo').click();
  await expect(page.locator('#bolsillo')).toBeHidden();

  await page.getByRole('button', { name: '⏹ FIN' }).click();
  await page.getByRole('button', { name: 'SÍ, TERMINAR' }).click();
  await expect(page.getByRole('heading', { name: '¡FIN DE LA PARTIDA!' })).toBeVisible();
  await expect(page.getByRole('img', { name: '2 de 3 estrellas' })).toBeVisible();
  await expect(page.getByText('Meta de 1 km cumplida')).toBeVisible();
  await sinViolaciones(page, 'arcade final');
  await page.getByRole('button', { name: /GUARDAR PARTIDA/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Partida guardada' })).toBeVisible();

  // Cuenta como actividad del día
  await page.getByRole('link', { name: 'VER MI DÍA' }).click();
  await expect(page.getByText(/Caminata 1,11 km · 13 min/)).toBeVisible();

  // En el lobby: récords, fantasma para la próxima y la partida en la lista
  await page.goto('/index.html#/salida');
  await expect(page.getByText(/Vas a correr contra tu fantasma/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ÚLTIMAS PARTIDAS' })).toBeVisible();
  await page.getByRole('link', { name: /1,11 km/ }).click();
  await expect(page.getByRole('heading', { name: 'CAMINATA · 1,11 KM' })).toBeVisible();
  await expect(page.locator('.mapa__ruta')).toHaveAttribute('points', /,/);
  await sinViolaciones(page, 'arcade ver partida');
  expect(errores).toEqual([]);
});

test('A-H2 una partida que quedó a medias se puede terminar después', async ({ page }) => {
  const errores = vigilar(page);
  await gpsFalso(page);
  await page.clock.install({ time: new Date('2026-11-25T08:00:00') });
  await conPerfil(page);
  await abrirArcade(page);
  await page.getByRole('button', { name: /BICI/ }).click();
  await arrancar(page);
  await caminar(page, { n: 20, metros: 50, seg: 10 });        // 950 m a 18 km/h
  await page.clock.runFor(11000);                               // se guarda cada 10 s
  await page.goto('/index.html#/hoy');                         // te vas en plena partida
  await page.goto('/index.html#/salida');
  await expect(page.getByRole('heading', { name: 'PARTIDA SIN TERMINAR' })).toBeVisible();
  await page.getByRole('button', { name: '💾 TERMINAR' }).click();
  await expect(page.getByRole('heading', { name: '¡FIN DE LA PARTIDA!' })).toBeVisible();
  await expect(page.locator('.arc__datos')).toContainText('17,9');    // km/h
  await page.getByRole('button', { name: /GUARDAR PARTIDA/ }).click();
  await expect(page.getByText('Partida guardada')).toBeVisible();
  await page.getByRole('button', { name: '▶ JUGAR OTRA' }).click();
  await expect(page.getByRole('heading', { name: 'PARTIDA SIN TERMINAR' })).toHaveCount(0);
  expect(errores).toEqual([]);
});

test('A-N1 sin permiso de ubicación explica qué hacer', async ({ page }) => {
  await gpsFalso(page, { sinPermiso: true });
  await conPerfil(page);
  await abrirArcade(page);
  await page.getByRole('button', { name: '▶ START' }).click();
  await expect(page.getByRole('alert')).toContainText('Sin permiso de ubicación');
  await expect(page.getByRole('heading', { name: '¡A JUGAR AFUERA!' })).toBeVisible();
});
