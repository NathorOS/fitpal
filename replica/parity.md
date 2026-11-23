# Control de parecido #1 — después de la Fase 3

Fecha: 2026-11-23. Herramientas: `parity.py` y `imgdiff.py` de `/replica-diff`.

## Resultado

| medida | valor |
|---|---|
| **Paridad de funciones** | **50,4 / 100** (49 funciones contadas) |
| Funciones imprescindibles hechas | **13 de 29** |
| Distribución en pantalla — pregunta del onboarding | 17,7 (distinta) |
| Distribución en pantalla — Inicio/Hoy | 18,3 (distinta) |
| **Veredicto** | **Todavía no se puede publicar**: faltan 16 imprescindibles (es lo esperado a esta altura del plan) |

Por área: progreso y peso 100; agua 80; mascota 75; hoy 59; registro 59; navegación 50; onboarding 41;
actividad 33; racha 30; ayuno, retos, planes y cobro 0 (llegan en las fases 5, 6 y 9).

Además, hay **9 mejoras propias ya hechas** que no suman al puntaje porque BitePal no las tiene. Entre ellas:
- todo gratis;
- la actividad suma a la meta;
- comida argentina;
- anotar en días y horas pasados;
- el gatito duerme la siesta en vez de castigar.

## Distribución en pantalla (sin contar colores)

Las capturas no son del mismo estado exacto: las de BitePal tienen otros datos. Por eso el número es orientativo.
Igual muestra dos diferencias reales de estructura:

1. **Onboarding:**
   - BitePal deja las opciones en la **mitad de abajo** de la pantalla, con aire entre la pregunta y las opciones.
   - Nathor Fit las pone pegadas a la pregunta.
2. **Hoy:**
   - En BitePal la **escena con la mascota ocupa casi la mitad superior**, y las tarjetas se montan encima de la escena.
   - En Nathor Fit la escena es una tarjeta chica.

Las dos se pueden acercar con CSS, sin tocar la lógica.

Capturas e imágenes de diferencias en `replica/diffs/` y `replica/clone-screens/`.

## Diferencias de comportamiento

| flujo | BitePal | Nathor Fit | decisión |
|---|---|---|---|
| Primer uso | ~39 pantallas + muro de pago + cuenta Google | 14 pantallas + plan, sin cuenta ni pago | **mantener** (mejora) |
| Anotar por búsqueda | + → Buscar → escribir → tocar → Agregar → Registrar: 6 toques | igual, 6 toques; con el "+" de la fila son 5 | mantener |
| Editar calorías de una comida | pago | gratis, y también hora y día | **mantener** (mejora) |
| Macros en Inicio | bloqueadas en la versión gratis | visibles | **mantener** (mejora) |
| Estadísticas | premium, desde el día 3 | gratis desde el día 1 | **mantener** (mejora) |
| Actividad | anota kcal quemadas | además las suma al presupuesto del día | **mantener** (mejora) |
| Pesos de la mascota/racha | pierde vidas | duerme la siesta | **mantener** (regla) |
| Meta "subir de peso" | sí | no | mantener: la app es para bajar o mantener |

## Lo próximo, en orden

1. **Ayuno** (Fase 5): tarjeta en Hoy, cronómetro, inicio editable hacia atrás y entrada en el menú "+". Son 2 imprescindibles.
2. **Puntaje nutricional y pantalla de resultado** con comentario del gatito (Fase 5). Son 2 imprescindibles.
3. **Racha con animación y semana, y Retos** en la barra inferior (Fase 5).
4. **Acercar la distribución:**
   - escena grande de Hoy con las tarjetas encima;
   - opciones del onboarding más abajo;
   - ruedas de números para edad, altura y peso.
5. **Plan listo completo**: agua, pasos y "me comprometo".

La foto con IA y describir la comida (2 imprescindibles más) quedan para la Fase 6, como dice el plan.

---

# Control de parecido #2 — después de la Fase 5

Fecha: 2026-11-23. La Fase 5 se hizo antes que la 4 (entrenamiento) porque sumaba más imprescindibles.

| medida | #1 | **#2** |
|---|---|---|
| Paridad de funciones | 50,4 | **68,2 / 100** |
| Imprescindibles hechas | 13 de 29 | **20 de 29** |
| Distribución de Hoy | 18,3 | **22,5** (sigue "distinta") |

**Áreas que quedaron al 100 %:**
- ayuno;
- navegación (barra con Retos);
- mascota (escena grande que reacciona);
- progreso, peso.

**Por qué Hoy sigue "distinta" en la comparación:**
- La comparación es de bordes, y la escena de BitePal es una ilustración llena de detalles (árboles, plantas, sombras). La nuestra es un fondo liso.
- La ubicación de las cosas ya coincide: escena arriba con la mascota, fila del día con la racha, y las tarjetas montadas encima.
- Para acercar el número haría falta **una escena ilustrada propia** (nunca copiar la suya). Lo anoto para la Fase 8.

**Faltan 9 imprescindibles:**
- foto con IA, describir con texto o voz, y la hoja "Mi comida" con "Ajustar con IA" (Fase 6);
- fotos en las miniaturas de comidas (Fase 6);
- ruedas de números, resumen con barra de IMC y plan listo completo (onboarding);
- "subir de peso" (fuera de alcance por decisión).
