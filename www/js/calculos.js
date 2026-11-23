export const FACTORES = { sedentario: 1.2, ligero: 1.375, moderado: 1.55, alto: 1.725 };
export const KCAL_POR_KG = 7700;
export const MINIMO_KCAL = { m: 1500, f: 1200 };

export function edadDesde(fechaNac, h = new Date()) {
  // fechaNac 'YYYY-MM-DD': se parsea como fecha local (new Date('YYYY-MM-DD') es UTC
  // y en Argentina corre el cumpleaños un día para atrás).
  const [a, m, d] = fechaNac.split('-').map(Number);
  let e = h.getFullYear() - a;
  const dm = h.getMonth() + 1 - m;
  if (dm < 0 || (dm === 0 && h.getDate() < d)) e--;
  return e;
}

// Mifflin-St Jeor. sexo: 'm' | 'f'
export function bmr({ sexo, kg, cm, edad }) {
  return 10 * kg + 6.25 * cm - 5 * edad + (sexo === 'm' ? 5 : -161);
}

export function tdeeInicial(p) {
  return bmr(p) * (FACTORES[p.actividad] ?? 1.2);
}

// Pisos de seguridad: ritmo máx. 1 % del peso por semana y mínimo calórico
export function metaKcal(p, ritmoKgSem, tdee = tdeeInicial(p)) {
  const ritmo = Math.min(ritmoKgSem, p.kg * 0.01);
  const minimo = MINIMO_KCAL[p.sexo] ?? MINIMO_KCAL.f;
  const meta = tdee - (ritmo * KCAL_POR_KG) / 7;
  return Math.round(Math.max(minimo, meta));
}

// Reparto de macros: proteína 1.8 g/kg, grasa 25 % kcal, resto carbohidratos
export function macrosObjetivo(kcal, kg) {
  const prot = Math.round(kg * 1.8);
  const grasa = Math.round((kcal * 0.25) / 9);
  const carb = Math.max(0, Math.round((kcal - prot * 4 - grasa * 9) / 4));
  return { prot, grasa, carb };
}

// Tendencia de peso: media móvil exponencial (alpha bajo = más suave)
export function suavizarPesos(pesos, alpha = 0.2) {
  // pesos: [{fecha, kg}] ordenados por fecha
  let s = null;
  return pesos.map(p => {
    s = s === null ? p.kg : alpha * p.kg + (1 - alpha) * s;
    return { fecha: p.fecha, kg: p.kg, suavizado: +s.toFixed(2) };
  });
}

// TDEE adaptativo: requiere >= 14 días con peso y >= 10 días de comida registrada
export function tdeeAdaptativo({ pesosSuav, kcalPorDia, tdeeInicial: t0 }) {
  const dias = pesosSuav.length;
  const diasComida = Object.keys(kcalPorDia).length;
  if (dias < 14 || diasComida < 10) return { tdee: t0, confianza: 0 };
  const dPeso = pesosSuav.at(-1).suavizado - pesosSuav[0].suavizado;
  const ingesta = Object.values(kcalPorDia).reduce((a, b) => a + b, 0) / diasComida;
  const real = ingesta - (dPeso * KCAL_POR_KG) / dias;
  const w = Math.min(0.8, dias / 35);            // mezcla gradual
  return { tdee: Math.round(w * real + (1 - w) * t0), confianza: +w.toFixed(2) };
}

// Puntaje del día (0-100). Ajustá los pesos a gusto.
export function puntajeDia({ kcal, kcalMeta, prot, protMeta, aguaMl, pasos, pasosMeta, fibra }) {
  const rango = kcalMeta ? Math.max(0, 1 - Math.abs(kcal - kcalMeta) / kcalMeta) : 0;
  const pr = protMeta ? Math.min(1, prot / protMeta) : 0;
  const ag = Math.min(1, aguaMl / 2000);
  const ps = pasosMeta ? Math.min(1, pasos / pasosMeta) : 0;
  const fb = Math.min(1, fibra / 25);
  return Math.round(40 * rango + 25 * pr + 15 * ag + 15 * ps + 5 * fb);
}
