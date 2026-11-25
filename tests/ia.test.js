import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armarPedido, leerRespuesta, coincidenciaEnBase, platosAItems, mensajeError } from '../www/js/ia.js';
import { productoOFF } from '../www/js/codigo.js';

const respuesta = obj => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] });

test('pedido: foto con instrucciones y respuesta en JSON', () => {
  const p = armarPedido({ imagenBase64: 'AAAA' });
  assert.equal(p.contents[0].parts[1].inlineData.data, 'AAAA');
  assert.equal(p.generationConfig.responseMimeType, 'application/json');
  const t = armarPedido({ texto: '2 empanadas' });
  assert.match(t.contents[0].parts[0].text, /2 empanadas/);
  assert.equal(t.contents[0].parts.length, 1);
});

test('respuesta: limpia valores raros y descarta lo vacío', () => {
  const r = leerRespuesta(respuesta({
    es_comida: true, comentario: 'Rico',
    platos: [
      { nombre: 'Milanesa de carne frita', gramos: 150, kcal: 405, proteinas: 30, carbohidratos: 20, grasas: 22, confianza: 'alta' },
      { nombre: '', gramos: 100, kcal: 50 },
      { nombre: 'Agua', gramos: -5, kcal: 0 },
      { nombre: 'Algo', gramos: 99999, kcal: 99999, proteinas: 'x', confianza: 'rara' },
    ],
  }));
  assert.equal(r.platos.length, 2);
  assert.equal(r.platos[1].gramos, 2000);
  assert.equal(r.platos[1].kcal, 5000);
  assert.equal(r.platos[1].prot, 0);
  assert.equal(r.platos[1].confianza, 'media');
  assert.throws(() => leerRespuesta({ candidates: [{ content: { parts: [{ text: 'no es json' }] } }] }), /no pude leer/);
  assert.equal(leerRespuesta(respuesta({ es_comida: false, platos: [] })).esComida, false);
});

test('primero la base propia: coincide solo si el nombre se parece de verdad', () => {
  assert.equal(coincidenciaEnBase('Milanesa de carne frita')?.id, 'b:mila-carne-frita');
  assert.equal(coincidenciaEnBase('Puré de papas')?.id, 'b:pure');
  assert.equal(coincidenciaEnBase('Empanada de carne')?.id.startsWith('b:empanada-carne'), true);
  assert.equal(coincidenciaEnBase('Ramen de cerdo con huevo'), null);
  assert.equal(coincidenciaEnBase('Empanada de carne al horno')?.id, 'b:empanada-carne', 'elige la mejor, no la primera');
  assert.equal(coincidenciaEnBase('Milanesa de pollo al horno')?.id, 'b:mila-pollo-horno');
});

test('platos a ítems: base escalada por gramos o estimación de la IA', () => {
  const items = platosAItems([
    { nombre: 'Puré de papas', gramos: 100, kcal: 999, prot: 0, carb: 0, grasa: 0, fibra: 0, confianza: 'alta' },
    { nombre: 'Ramen de cerdo', gramos: 400, kcal: 520, prot: 25, carb: 60, grasa: 18, fibra: 3, confianza: 'baja' },
  ]);
  assert.equal(items[0].fuente, 'base');
  assert.equal(items[0].kcal, 105, 'usa la base (105 kcal/100 g), no los 999 de la IA');
  assert.equal(items[1].fuente, 'ia');
  assert.equal(items[1].kcal, 520);
  assert.equal(items[1].unidad, 'rapido');
});

test('mensajes de error claros', () => {
  assert.match(mensajeError(400, 'API_KEY_INVALID'), /no es válida/);
  assert.match(mensajeError(429), /límite/);
  assert.match(mensajeError(503), /no responde/);
});

test('Open Food Facts: producto a alimento propio por 100 g', () => {
  const a = productoOFF({
    code: '7790000000001',
    product: {
      product_name: 'Galletitas de agua', brands: 'Marca X', serving_quantity: 30,
      nutriments: { 'energy-kcal_100g': 420, proteins_100g: 10, carbohydrates_100g: 70, fat_100g: 10, fiber_100g: 3 },
    },
  });
  assert.equal(a.nombre, 'Galletitas de agua (Marca X)');
  assert.equal(a.por100.kcal, 420);
  assert.deepEqual(a.porciones[0], { nombre: 'porción', g: 30 });
  assert.equal(productoOFF({ status: 0 }), null);
  // Sin kcal pero con kJ: se convierte
  const b = productoOFF({ product: { product_name: 'Jugo', nutriments: { 'energy_100g': 200 } } });
  assert.equal(b.por100.kcal, 48);
});

// --- Clave que quedaba cargando (2026-11-24) ---
import { elegirModelo, configPensar } from '../www/js/ia.js';

test('modelo: el Flash estable más nuevo de la 3 en adelante (no previews ni el 2.5 deprecado)', () => {
  const lista = ['models/gemini-2.5-flash', 'models/gemini-3-flash-preview', 'models/gemini-3.6-flash', 'models/gemini-3.8-flash',
    'models/gemini-3.5-flash-lite', 'models/gemini-3.8-pro', 'models/gemini-flash-latest'];
  assert.equal(elegirModelo(lista), 'gemini-3.8-flash');
});

test('modelo: sin Flash 3.x, el Flash-Lite más nuevo; después alias o lo que haya', () => {
  assert.equal(elegirModelo(['models/gemini-2.5-flash', 'models/gemini-2.5-flash-lite', 'models/gemini-3.5-flash-lite']), 'gemini-3.5-flash-lite');
  assert.equal(elegirModelo(['models/gemini-flash-latest', 'models/gemini-2.5-pro']), 'gemini-flash-latest');
  assert.equal(elegirModelo(['models/gemini-2.5-flash', 'models/gemini-2.5-pro']), 'gemini-2.5-flash');
  assert.equal(elegirModelo(['models/text-embedding-004']), null);
});

test('pensar: mínimo en 3.x y alias, apagado en 2.5 Flash, nada en 2.5 Flash-Lite', () => {
  assert.deepEqual(configPensar('gemini-3.8-flash'), { thinkingLevel: 'low' });
  assert.deepEqual(configPensar('gemini-3.5-flash-lite'), { thinkingLevel: 'low' });
  assert.deepEqual(configPensar('gemini-flash-latest'), { thinkingLevel: 'low' });
  assert.deepEqual(configPensar('gemini-2.5-flash'), { thinkingBudget: 0 });
  assert.equal(configPensar('gemini-2.5-flash-lite'), null);
});
