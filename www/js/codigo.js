// Fase 6 — Código de barras con Open Food Facts (base abierta y gratuita, sin clave).
// El producto se guarda como alimento propio para que después se encuentre sin internet.

const r1 = n => Math.round(n * 10) / 10;

/** Respuesta de la API v2 de Open Food Facts → alimento propio (por 100 g). null si no hay datos. */
export function productoOFF(json) {
  const p = json?.product;
  if (!p) return null;
  const n = p.nutriments ?? {};
  const num = k => (Number.isFinite(Number(n[k])) ? Number(n[k]) : null);
  let kcal = num('energy-kcal_100g');
  if (kcal == null && num('energy_100g') != null) kcal = num('energy_100g') / 4.184;   // kJ → kcal
  if (kcal == null) return null;
  const nombre = String(p.product_name_es || p.product_name || '').trim();
  if (!nombre) return null;
  const marca = String(p.brands ?? '').split(',')[0].trim();
  const g = Number(p.serving_quantity) > 0 ? Number(p.serving_quantity) : 100;
  return {
    nombre: marca ? `${nombre} (${marca})` : nombre,
    emoji: '🏷️', propio: true, codigo: json.code ?? p.code ?? null, sinonimos: marca,
    porciones: [{ nombre: 'porción', g: r1(g) }],
    por100: {
      kcal: Math.round(kcal), prot: r1(num('proteins_100g') ?? 0), carb: r1(num('carbohydrates_100g') ?? 0),
      grasa: r1(num('fat_100g') ?? 0), fibra: r1(num('fiber_100g') ?? 0),
    },
  };
}

/** Busca el código: primero entre los ya guardados, después en Open Food Facts. Devuelve el id 'p:N' o null. */
export async function buscarCodigo(codigo) {
  const limpio = String(codigo).replace(/\D/g, '');
  if (limpio.length < 8) throw new Error('El código tiene que tener al menos 8 números.');
  const { todos, guardar } = await import('./db.js');
  const ya = (await todos('alimentos')).find(a => a.codigo === limpio);
  if (ya) return `p:${ya.id}`;
  if (!navigator.onLine) throw new Error('Sin conexión: no puedo buscar productos nuevos ahora.');
  let r;
  try {
    r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${limpio}.json?fields=code,product_name,product_name_es,brands,nutriments,serving_quantity`);
  } catch {
    throw new Error('No pude conectarme con la base de productos.');
  }
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('La base de productos no responde. Probá en un rato.');
  const a = productoOFF({ ...(await r.json()), code: limpio });
  if (!a) return null;
  return `p:${await guardar('alimentos', a)}`;
}
