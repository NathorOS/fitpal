# Fase R2 — Qué odian, qué piden y qué no resuelve BitePal

Fecha: 2026-11-23
**Muestra: 773 reseñas reales** (780 leídas, 7 repetidas), de julio a noviembre de 2026:
- App Store, feed oficial de Apple: 600 reseñas de EE. UU., México, España y Argentina (150 por país).
- Google Play Argentina, en español: 180 reseñas leídas en la página, ordenadas por relevancia.
- **No se pudo** leer Reddit (bloqueado en el navegador) ni Trustpilot (pide verificación anti-robots).
  Son 2 tiendas en 5 países. La skill pide 3 fuentes, así que cuando un tema aparece en "5 fuentes" se cuentan países, no sitios distintos.

Contexto: en Google Play, BitePal tiene 421 mil reseñas de 5★ y 2,4 mil de 1★. **La app gusta mucho.**
Las quejas se concentran en pocos puntos y son muy claras.

Datos completos: `reviews.csv` (cada reseña con su link) y `feedback.md` (ranking automático).
Los conteos salen de búsquedas por palabras; algunas coincidencias son falsas (por ejemplo, "ayer" en
"descargué la app ayer"), así que los números son aproximados.

---

## 1. Lo que odian

| # | problema | reseñas | fuentes | ★ prom. |
|---|---|---|---|---|
| 1 | **Lo importante es pago**: macros, editar calorías y consejos solo con suscripción. Además, **ahora la versión gratis permite solo 2 escaneos por día** | 138 | 5 | 2,6 |
| 2 | **Cobros y cancelación**: no se puede cancelar, cobran después de la prueba, "estafa" | 92 | 5 | 1,4 |
| 3 | **Fallas**, y **actualizaciones que empeoraron** la app: perdió alimentos y limitó comidas | 21 + varias sin tema | 4 | 2,1 |
| 4 | **Faltan marcas y productos locales** (Chile, España, Colombia, México) | 26 | 3 | 3,1 |
| 5 | **La IA calcula mal** y después no te deja corregir | 14 + varias sin tema | 3 | 2,6 |
| — | Rígida con los horarios: "te castiga" si no sos exacto con cantidades y tiempos | 1 | 1 | *poca evidencia* |
| — | Usa el IMC para todos, también para deportistas con mucho músculo | 1 | 1 | *poca evidencia* |

Citas (textuales):
- "Have to pay to track protein and carbs" — [App Store US, 1★](https://apps.apple.com/us/app/id6479529917?see-all=reviews#review-14762540924)
- "now you can only scan twice a day before having to pay? Shame to be so greedy." — [App Store ES, 1★](https://apps.apple.com/es/app/id6479529917?see-all=reviews#review-14504935530)
- "No se puede cancelar la suscripción." — [App Store ES, 1★](https://apps.apple.com/es/app/id6479529917?see-all=reviews#review-14378131594)
- "Un alimento de marca cuesta un mundo encontrarlo, por lo menos para las típicas marcas de Chile me es casi siempre imposible." — [Google Play, 1★](https://play.google.com/store/apps/details?id=com.pookies.food.ai&reviewId=1e9ba62c-a382-4b78-9196-cd268ad948e7)
- "Me arrepiento mucho de haber pagado la suscripción anual la IA no identifica bien los ingredientes." — [Google Play, 1★](https://play.google.com/store/apps/details?id=com.pookies.food.ai&reviewId=52e779c1-04c3-4401-adb9-6ecf66f2d2d3)

## 2. Lo que falta

| # | pedido | reseñas | fuentes |
|---|---|---|---|
| 1 | **La actividad física no ajusta las calorías** ni las macros; las kcal quemadas se cuentan mal | 35 | 5 |
| 2 | **Macros y nutrientes gratis**; carbohidratos netos para keto | 27 | 2 |
| 3 | **Editar todo**: escribir calorías a mano, cambiar ingredientes, corregir la IA, editar el ayuno | 16 | 3 |
| 4 | **Guardar comidas y recetas propias**, y crear alimentos nuevos | 16 | 4 |
| 5 | **Comida casera y regional** (mexicana, latinoamericana, española) | 5 | 4 |
| 6 | **Registrar comidas o ayunos de antes**, con su hora real | 3 | 2 — *poca evidencia, pero muy concreta* |

Citas:
- "Además no contempla regular los macros si aumenta mi actividad física." — [Google Play, 1★](https://play.google.com/store/apps/details?id=com.pookies.food.ai&reviewId=52e779c1-04c3-4401-adb9-6ecf66f2d2d3)
- "estaría copado que agreguen que podes hacer (caminar tantos km, algun ejercicio complementario) para completar las calorías quemadas" — [App Store AR, 4★](https://apps.apple.com/ar/app/id6479529917?see-all=reviews#review-14774629815)
- "It would be nice to be able to build your entry than having to rely on shoddy Ai." — [App Store US, 3★](https://apps.apple.com/us/app/id6479529917?see-all=reviews#review-14755997051)
- "lo único que agregaría es que cuando uno agrega comidas que se olvidó el día anterior pueda ingresar la hora de la comida." — [Google Play, 5★](https://play.google.com/store/apps/details?id=com.pookies.food.ai&reviewId=982f04b1-175a-4259-b4f2-80b50089d587)
- "ya no me deja marcar que lo inicie desde ayer" (sobre el ayuno) — [Google Play, 3★](https://play.google.com/store/apps/details?id=com.pookies.food.ai&reviewId=e6a2b6b9-f98b-4ac1-9542-f19c2afd8354)

## 3. Lo que no resuelve (para posicionarse)

| grupo o necesidad | evidencia |
|---|---|
| **Latinoamericanos con comida casera y marcas locales**: la base son productos envasados de otros países | 31 reseñas entre "base" y "local", 4 países |
| **Gente que quiere ayuda real** y no solo un contador | "Es solo un contador de calorías, no aporta nada más" — [App Store ES](https://apps.apple.com/es/app/id6479529917?see-all=reviews#review-14608278899), más una reseña de Google Play con 10 votos de "útil". *Poca evidencia* |
| Personas con **diabetes o TCA** | 1 reseña ([Google Play](https://play.google.com/store/apps/details?id=com.pookies.food.ai&reviewId=eeb925ef-e3bb-41d7-b1ce-8d1b02b0f73c)). *Poca evidencia*. Para Nathor Fit esto **no es un mercado**: es un grupo al que hay que derivar a un profesional (regla 5) |

---

## 4. Plan de mejoras para Nathor Fit

Ordenado por evidencia y por lo barato que es hacerlo. Todas entran a `features.csv` con `original = no`.

| # | mejora | tamaño | fase | evidencia |
|---|---|---|---|---|
| 1 | **Lo básico, gratis siempre**: macros, editar, estadísticas, consejos, búsqueda y registro manual sin límite | S (decisión) | todas | Pago: 138 / 5 |
| 2 | **Cobro honesto**: sin prueba que cobra sola, cancelar en un toque, sin cuenta obligatoria. Pago único o premium solo para la foto con IA, que es lo único que nos cuesta | S | 9 (`/replica-launch`) | Cobros: 92 / 5 |
| 3 | **Editar todo**: kcal y macros escritas a mano, ingredientes, porciones, hora y fecha; corregir la IA ingrediente por ingrediente | S-M | 2 y 6 | Editar: 16 / 3 |
| 4 | **Base argentina y casera**: ~150 platos caseros, marcas locales y código de barras con Open Food Facts | M | 2 y 6 | Base + local: 31 / 4 |
| 5 | **Comidas y recetas propias** que se guardan y se reusan en un toque | S-M | 2 | Propias: 16 / 4 |
| 6 | **La actividad ajusta el día**: kcal quemadas reales que suman al presupuesto, más una sugerencia del tipo "caminá 25 min y llegás" | M | 3, 4 y 7 | Actividad: 35 / 5 |
| 7 | **Nada rígido con el tiempo**: registrar comidas pasadas con su hora, iniciar o editar un ayuno hacia atrás, días anteriores editables | S | 2 y 5 | Tarde + rígida: 4 / 2 + citas |
| 8 | **IA honesta**: primero busca en la base, muestra un rango, confirma antes de guardar, y los escaneos no se limitan a 2 por día | M | 6 | IA: 14 / 3 + varias sin tema |

Además, transversal: **no romper lo que funciona con cada actualización** (21 reseñas sobre fallas o
actualizaciones). Los tests y el respaldo local ayudan.

---

## 5. El argumento de venta (ángulo)

**A. Todo a la vista, sin pagar para ver tus propias proteínas** — *recomendado*
> Para quienes se cansaron de que su app de calorías les cobre por ver sus macros o corregir un número,
> Nathor Fit muestra todo y deja editar todo gratis, con un gatito que te acompaña sin hacerte sentir culpa.
> Evidencia: "Lo importante es pago", 138 reseñas en 5 fuentes, y "Editar", 16 en 3.

**B. Hecha para la comida de acá**
> Para quienes no encuentran sus milanesas, su mate o las marcas del súper,
> Nathor Fit trae comida casera argentina y escanea los productos locales.
> Evidencia: base + local, 31 reseñas en 4 países.

**C. Sin trampas en el cobro**
> Para quienes tuvieron que pelear para cancelar una suscripción,
> Nathor Fit no pide cuenta, no cobra pruebas automáticas y se cancela en un toque.
> Evidencia: cobros, 92 reseñas en 5 fuentes.

**Recomendación: A como mensaje principal, con B como apoyo para Argentina.** C es una promesa que hay
que cumplir en el modelo de cobro (Fase 9), más que un titular.

En la tienda, los anuncios y la landing **no se nombra a BitePal**. Si se quiere una comparación directa,
primero hay que consultarla con un abogado.

Siguiente: `/replica-design` + `/replica-brand` (Fase R3).
