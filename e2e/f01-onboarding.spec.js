// F01 Primer uso: onboarding con ruedas, IMC y plan.
import { test, expect } from '@playwright/test';
import { vigilar, sinViolaciones } from './ayuda.js';

const seguir = page => page.getByRole('button', { name: 'Seguir' }).click();

test('F01-H1 onboarding completo hasta Hoy', async ({ page }) => {
  const errores = vigilar(page);
  await page.goto('/index.html');
  await expect(page).toHaveURL(/#\/onboarding/);
  await sinViolaciones(page, 'bienvenida');
  await page.getByRole('button', { name: 'Empezamos' }).click();

  await page.getByLabel(/¿Cómo me vas a llamar\?/).fill('Ñandú 🐱');
  await seguir(page);
  await page.getByRole('radio', { name: /Cariñoso/ }).click();
  await seguir(page);
  await page.getByRole('radio', { name: /River/ }).click();
  await seguir(page);
  await page.getByLabel(/¿Y vos cómo te llamás\?/).fill('José María');
  await seguir(page);
  await page.getByRole('radio', { name: /Bajar de peso/ }).click();
  await seguir(page);
  await page.getByRole('radio', { name: /Mujer/ }).click();
  await seguir(page);
  await page.getByLabel('Fecha de nacimiento').fill('1990-04-20');
  await seguir(page);

  // Altura: rueda accesible con el teclado
  const altura = page.getByRole('spinbutton', { name: /Cuánto medís/ });
  await expect(altura).toHaveAttribute('aria-valuenow', '162');
  await altura.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  await expect(altura).toHaveAttribute('aria-valuenow', '165');
  await sinViolaciones(page, 'rueda altura');
  await seguir(page);

  // Peso: enteros + décimas, con la barra de IMC al día
  const kilos = page.getByRole('spinbutton', { name: /kg enteros/ });
  await kilos.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowDown');
  await expect(kilos).toHaveAttribute('aria-valuenow', '80');
  await expect(page.getByRole('img', { name: /IMC 29,4, sobrepeso/ })).toBeVisible();
  await seguir(page);

  // Peso meta: por defecto 92 % del peso; bajar 3 kg
  const meta = page.getByRole('spinbutton', { name: /querés llegar.*enteros/ });
  await meta.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
  await expect(page.getByText(/kg menos que hoy/)).toBeVisible();
  await seguir(page);

  await page.getByRole('radio', { name: /^.*Algo/ }).click();
  await seguir(page);
  await page.getByRole('radio', { name: /Constante/ }).click();
  await seguir(page);
  await page.getByRole('radio', { name: /Nada, entreno en casa/ }).click();
  await seguir(page);
  await page.getByLabel('Entiendo y quiero seguir').check();
  await seguir(page);

  await expect(page.getByRole('heading', { name: /Tu plan está listo, José María/ })).toBeVisible({ timeout: 8000 });
  await expect(page.getByText('Tus metas de cada día')).toBeVisible();
  await expect(page.getByText('7.500')).toBeVisible();          // pasos para "Algo"
  await expect(page.getByText('Nuestro trato')).toBeVisible();
  await sinViolaciones(page, 'plan listo');
  await page.getByRole('button', { name: /Trato hecho/ }).click();

  await expect(page).toHaveURL(/#\/hoy/);
  const perfil = await page.evaluate(async () => (await import('/js/db.js')).obtener('perfil', 'main'));
  expect(perfil).toMatchObject({ nombre: 'José María', altura_cm: 165, meta_pasos: 7500, objetivo: 'bajar' });
  expect(perfil.gato.nombre).toBe('Ñandú 🐱');
  expect(perfil.equipo_futbol).toBe('river');
  expect(perfil.p_inicial).toBeGreaterThanOrEqual(0);
  expect(errores).toEqual([]);
});

test('F01-E1 nombre vacío no deja seguir', async ({ page }) => {
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Empezamos' }).click();
  await page.getByLabel(/¿Cómo me vas a llamar\?/).fill('   ');
  await seguir(page);
  await expect(page.getByRole('alert')).toHaveText(/Escribí un nombre/);
});

test('F01-E2 menor de 18 no puede seguir', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => sessionStorage.setItem('nathorfit-onboarding', JSON.stringify({
    gato_nombre: 'T', gato_personalidad: 'tranqui', nombre: 'A', objetivo: 'bajar', sexo: 'f', _paso: 7 })));
  await page.reload();
  const hoy = new Date();
  await page.getByLabel('Fecha de nacimiento').fill(`${hoy.getFullYear() - 15}-01-01`);
  await seguir(page);
  await expect(page.getByRole('alert')).toHaveText(/mayores de 18/);
});

test('F01-E3 recargar a mitad del onboarding conserva el paso y lo respondido', async ({ page }) => {
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Empezamos' }).click();
  await page.getByLabel(/¿Cómo me vas a llamar\?/).fill('Luna');
  await seguir(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Luna, me encanta/ })).toBeVisible();
});

test('F01-E4 meta por debajo de lo saludable muestra el mínimo', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => sessionStorage.setItem('nathorfit-onboarding', JSON.stringify({
    gato_nombre: 'T', gato_personalidad: 'tranqui', nombre: 'A', objetivo: 'bajar', sexo: 'f', nacimiento: '1990-01-01',
    altura_cm: 170, peso_kg: 70, peso_meta: 50, _paso: 10 })));
  await page.reload();
  await seguir(page);
  await expect(page.getByRole('alert')).toHaveText(/mínima es 53,5 kg/);
});
