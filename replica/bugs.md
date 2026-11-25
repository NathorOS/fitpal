# Errores — Nathor Fit

Severidad: S1 pérdida de datos / seguridad / flujo principal bloqueado · S2 función rota sin salida ·
S3 rota con salida o visiblemente mal · S4 cosmético.

Resumen Fase 8 (2026-11-23): 6 encontrados, 6 corregidos, 0 abiertos. Ningún S1 ni S2.

### BUG-001: la rueda de números perdía pulsaciones de teclado
- Severity: S3
- Flow / case: F01-H1 · Screen: onboarding (altura, peso, meta)
- Build: Fase 8, antes del commit · Browser: Chromium 375 px
Steps
1. Enfocar la rueda del peso meta (81 kg).
2. Apretar 6 veces la flecha arriba rápido.
Expected: 75 kg. Actual: 77 kg (el desplazamiento suave volvía a marcar valores intermedios).
Evidence: registro de eventos en el navegador (val 75 → 77 al terminar de desplazarse).
Status: fixed en el commit de la Fase 8 (se ignoran los pasos intermedios mientras la rueda va a un valor);
cubierto por F01-H1 y F06-H1.

### BUG-002: con IMC de 40 o más, la marca de la barra quedaba en NaN
- Severity: S3
- Flow / case: F01-H1 · Screen: peso / plan listo
Steps: `posicionImc(40)`.
Expected: 100 (final de la barra). Actual: NaN (la marca desaparecía).
Evidence: test "IMC: la marca queda dentro de la barra" en `tests/fase8.test.js`.
Status: fixed en el commit de la Fase 8.

### BUG-003: poco contraste en el texto de ayuda de la racha
- Severity: S3 (accesibilidad)
- Flow / case: F02-H1 · Screen: racha
Steps: anotar la primera comida del día → Listo → pantalla de racha.
Expected: contraste AA. Actual: texto gris sobre el fondo verde claro de la escena (axe: color-contrast).
Status: fixed en el commit de la Fase 8 (tinta oscura en pantallas con fondo de escena).

### BUG-004: la etiqueta "Recomendado" no llegaba a AA
- Severity: S3 (accesibilidad)
- Flow / case: F07-H1 · Screen: ayuno y onboarding (ritmo)
Expected: 4,5:1 para texto de 12 px. Actual: 4,07:1 (blanco sobre el verde de acento).
Status: fixed en el commit de la Fase 8 (fondo con el verde oscuro, 5,69:1); par agregado a
`replica/design/tokens.json` para que `contrast.py` lo controle.

### BUG-005: de noche, el texto de Hoy quedaba blanco sobre el fondo claro de respaldo
- Severity: S3 (accesibilidad; introducido en esta fase)
- Flow / case: A11Y Hoy de noche · Screen: Hoy
Expected: el texto se lee aunque el dibujo de la escena no cargue. Actual: el fondo CSS era el verde claro
y el texto blanco (axe: color-contrast).
Status: fixed en el commit de la Fase 8 (fondo de respaldo oscuro de noche y cálido de tarde).

### BUG-006: en desarrollo, el service worker servía copias viejas
- Severity: S4 (solo afecta al desarrollo)
- Steps: editar un archivo y recargar en localhost.
Expected: el archivo nuevo. Actual: el service worker guardaba la versión anterior.
Status: fixed en el commit de la Fase 8: en localhost no se registra el service worker (salvo con `?sw=1`, que
usa la prueba OFF-H1).

## Para revisar (no reproducido)
- Ruedas con el dedo en celulares reales: el deslizado con inercia y el "frenado" en un número solo se
  probaron con rueda del mouse y teclado.
- Compartir el respaldo (`navigator.share` con archivos) solo se puede probar en el celular.

### BUG-007: si cambiabas de pantalla mientras otra cargaba, la vieja tapaba a la nueva
- Severity: S3
- Flow / case: F04-H2 · Screen: cualquiera (se vio en Resultado → Agregar comida)
- Build: 2026-11-24 · Browser: Chromium (Pixel 7)
Steps
1. Anotar una comida (va a Resultado).
2. Antes de que Resultado termine de cargar, ir a Agregar comida.
Expected: queda Agregar comida. Actual: Resultado terminaba de dibujarse encima y el buscador desaparecía.
Evidence: prueba e2e F04-H2 (el buscador se "despegaba" del documento una y otra vez).
Status: fixed el 2026-11-24 — cada pantalla se dibuja en su propio contenedor (`.pantalla` en app.js).

### BUG-008: al guardar la clave de Gemini quedaba "Probando la clave…" para siempre
- Severity: S2 (la IA no se podía activar)
- Flow / case: P-H5, P-E5 · Screen: Perfil → IA
- Build: 2026-11-24 · Reportado por el usuario en su celular con una clave real
Steps
1. Perfil → pegar una clave real de Gemini → Guardar y probar.
Expected: "¡Listo! La IA ya funciona." en pocos segundos. Actual: queda cargando y nunca confirma.
Causa: la prueba pedía un análisis completo a `gemini-flash-latest` (un modelo que "piensa" antes de contestar)
y el pedido no tenía tiempo límite.
Status: fixed el 2026-11-24 — la prueba pide la lista de modelos (instantáneo, no gasta cuota) y guarda el mejor
modelo flash disponible; todos los pedidos cortan con un mensaje si tardan (15 s la prueba, 45 s el análisis);
el pensamiento se apaga o se pone al mínimo para estimar comida.

### BUG-009: el entrenador cortaba con "Gemini tardó demasiado" al armar la rutina
- Severity: S2 (el entrenador no respondía con la clave real)
- Flow / case: E-H1, P-H6 · Screen: Entrenador → Rutina
- Build: 2026-11-25 · Reportado por el usuario en su celular (captura)
Expected: la rutina en unos segundos. Actual: a los 45 s, "Gemini tardó demasiado en contestar".
Causa: la app prefería `gemini-2.5-flash` (deprecado, se apaga el 2026-12-01) y después el alias
`gemini-flash-latest` sin bajar el "pensamiento"; los modelos 3.x piensan en nivel medio o alto por defecto.
Status: fixed el 2026-11-25 — se elige el Flash estable 3.x más nuevo de la lista de la clave, con
`thinkingLevel: low` (también en los alias), y los teléfonos con un modelo elegido por la versión anterior
vuelven a elegir solos. "Probar" en Perfil hace un pedido real y muestra el modelo y los segundos.
Tiempo límite de los pedidos: 60 s. Pendiente: confirmar con la clave real cuánto tarda.
