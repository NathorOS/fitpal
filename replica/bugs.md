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
