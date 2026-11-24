// Ayudas comunes: falla ante errores de consola o respuestas 5xx, datos de prueba y escaneo de accesibilidad.
import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export function vigilar(page) {
  const errores = [];
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', e => errores.push(String(e)));
  page.on('response', r => { if (r.status() >= 500) errores.push(`${r.status()} ${r.url()}`); });
  return errores;
}

/** Perfil completo cargado con la misma función que usa la app. */
export async function conPerfil(page, extra = {}) {
  await page.goto('/index.html#/onboarding');
  await page.evaluate(async extra => {
    const { guardarPerfil } = await import('/js/objetivo.js');
    await guardarPerfil({
      nombre: 'Prueba', gato: { nombre: 'Tito', personalidad: 'carinoso' }, objetivo: 'bajar', sexo: 'f',
      nacimiento: '1994-06-15', altura_cm: 165, peso_kg: 80, peso_meta: 70, ritmo_kg_sem: 0.5,
      actividad: 'sedentario', equipo: 'ninguno', meta_pasos: 6000, ...extra,
    });
  }, extra);
  await page.goto('/index.html#/hoy');
  await expect(page.getByRole('heading', { name: /Calorías de hoy/ })).toBeVisible();
}

export async function sinViolaciones(page, nombre) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const graves = r.violations.filter(v => ['serious', 'critical'].includes(v.impact));
  expect(graves.map(v => `${nombre}: ${v.id} → ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([]);
}
