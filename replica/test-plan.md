# Plan de pruebas — Nathor Fit (Fase 8, 2026-11-23)

Cómo correrlas:

```bash
npm test          # 67 tests unitarios (node --test)
npm run e2e       # 39 pruebas de punta a punta (Playwright, Chromium como Pixel 7, es-AR)
```

Cada prueba de punta a punta falla si hay errores en la consola, respuestas 5xx o problemas de
accesibilidad graves o críticos según axe (WCAG 2 A/AA). Gemini y Open Food Facts se **simulan**: las
pruebas nunca llaman a servicios reales.

## Resultado de esta corrida

| | casos | pasan | fallan |
| --- | --- | --- | --- |
| Unitarios (`tests/`) | 67 | 67 | 0 |
| Punta a punta (`e2e/`) | 39 | 39 | 0 |

Errores encontrados y corregidos: 6 (ver `replica/bugs.md`). Abiertos: 0.

## F01 Primer uso (`e2e/f01-onboarding.spec.js`)
- **F01-H1** onboarding completo: nombres con eñe, tilde y emoji; altura, peso y meta con las ruedas usando
  solo el teclado; barra de IMC en vivo; plan con agua, pasos y trato; llega a Hoy y el perfil queda guardado. ✅
- **F01-E1** nombre vacío (solo espacios) no deja seguir. ✅
- **F01-E2** menor de 18 no puede seguir. ✅
- **F01-E3** recargar a mitad del onboarding conserva el paso y lo respondido. ✅
- **F01-E4** meta por debajo de IMC 18,5 muestra el mínimo saludable. ✅

## F02 Registrar (`e2e/f02-registrar.spec.js`)
- **F02-H1** buscar → hoja → 1,5 porciones → anotar → resultado → racha → Hoy. ✅
- **F02-H2** editar y borrar una comida. ✅
- **F02-E1** búsqueda con "ñoquis" y "noquis" (con y sin eñe) y sin resultados. ✅
- **F02-E2** doble toque en "Anotar" guarda una sola comida. ✅
- **F02-E3** registro rápido sin calorías no se agrega. ✅

## F03/F04 IA y código (`e2e/f03-ia-codigo.spec.js`)
- **F03-H1** foto → Gemini (simulado) → carrito → comida con miniatura; la clave va en el encabezado
  `x-goog-api-key` y nunca en la dirección. ✅
- **F03-H2** código escrito a mano → Open Food Facts (simulado) → hoja → anotar. ✅
- **F03-N1** código que no existe; se puede volver a buscar. ✅
- **F04-N1** sin clave: explica cómo cargarla. ✅
- **F04-N2** la IA no encuentra comida: mensaje claro, sin carrito. ✅
- **F04-N3** clave inválida: error entendible. ✅

## F05–F07 Diario (`e2e/f05-diario.spec.js`)
- **F05-H1** agua: sumar y sacar desde Hoy y desde el menú "+". ✅
- **F06-H1** peso con la rueda (décimas por teclado). ✅
- **F06-H2** actividad y pasos; la meta de pasos aparece en Hoy. ✅
- **F07-H1** ayuno: empezar, ver el reloj y cancelar sin guardar. ✅
- **Hoy-E1** ir al día anterior y anotar ahí. ✅

## Perfil (`e2e/f10-perfil.spec.js`)
- **P-H1** editar datos: valida, recalcula la meta, ajusta la meta de pasos y no anota un peso falso. ✅
- **P-H2** guardar respaldo (sin la clave de la IA) → borrar todo → onboarding → restaurar → datos iguales. ✅
- **P-N1** restaurar un archivo que no es respaldo o JSON roto: error claro, no se toca nada. ✅
- **P-N2** un respaldo con una "foto" maliciosa no inyecta HTML. ✅

## Pantallas y sin conexión (`e2e/f11-pantallas.spec.js`)
- **A11Y** Hoy, Progreso, Retos, Entrenar, Perfil, Tus datos, Registrar, IA y Racha abren sin errores y sin
  problemas graves de accesibilidad. ✅
- **A11Y** Hoy a la mañana, a la tarde y de noche (escena con fondo oscuro). ✅
- **F06-H3** entrenamiento: empezar una rutina. ✅
- **OFF-H1** sin conexión, con el service worker, abren Hoy, Registrar, Progreso, Perfil y Peso. ✅

## Pasada a mano en el celular (no se puede automatizar acá)
Pendiente de que lo pruebes vos en https://nathoros.github.io/fitpal/ (después de subir esta versión):

- [ ] Instalar la app desde Chrome ("Agregar a la pantalla de inicio") y ver el ícono nuevo.
- [ ] Ruedas: deslizar con el dedo altura, peso y peso meta (que frenen en un número y no salten).
- [ ] Foto con IA con tu clave real de Gemini (cámara y galería), y que la miniatura aparezca en Hoy.
- [ ] Describir con la voz (🎤 Dictar).
- [ ] Código de barras con la cámara (en Chrome para Android funciona `BarcodeDetector`).
- [ ] Guardar un respaldo y elegir dónde (Drive, mail) con el menú de compartir; restaurarlo.
- [ ] Modo avión: la app abre igual.
- [ ] Hoy a la mañana, a la tarde y de noche: la escena cambia.
- [ ] Teléfono con muesca: nada queda tapado arriba ni abajo.
