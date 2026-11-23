# Recon: BitePal (Android y iPhone) — borrador 2

Alcance: el ciclo principal completo (onboarding, registrar comida, Hoy, retos, rachas, agua, ayuno, peso, actividad).
Para: Nathor Fit, PWA local-first para uso propio y luego venta.
Fecha: 2026-11-23
Estado: **borrador 3**, con las 64 + 28 capturas del usuario (Android, `com.pookies.food.ai`, versión gratis).
Capturas: carpeta de Drive "NATHOR FIT"; los números C1–C64 siguen el orden en que se sacaron.

## Fuentes

| # | fuente | URL | qué aportó |
|---|---|---|---|
| 1 | Capturas del usuario (64) | Drive › NATHOR FIT | Onboarding completo, registro por búsqueda, resultado de comida, racha, Hoy, retos, menú "+" |
| 2 | Google Play | https://play.google.com/store/apps/details?id=com.pookies.food.ai | **5 M+ descargas, 4,9 ★, 471 mil reseñas.** Corrige el borrador 1: sí existe en Android |
| 3 | App Store | https://apps.apple.com/us/app/-/id6479529917 | Descripción, reseñas, precio |
| 4 | ScreensDesign | https://screensdesign.com/showcase/bitepal-ai-calorie-tracker | Escáner con ingredientes, monedas, muro de pago |
| 5 | Consumer App Lab | https://consumerapplab.substack.com/p/bitepals-ai-pet-makes-meal-logging | Qué es gratis y qué es pago |

## Ciclo principal

Registrás lo que comiste (búsqueda, texto o foto) → la mascota reacciona, sumás kcal y un puntaje →
la racha crece y los retos dan monedas. Todo gira alrededor de "alimentar a la mascota".

## Pantallas

### Onboarding (C1–C39, ~39 pantallas)
Estructura fija: botón atrás redondo arriba a la izquierda, **barra de progreso en 4 tramos** verdes,
la mascota chica con un **globo de diálogo gris** que hace la pregunta, opciones abajo y un
**botón negro tipo píldora** "Continuar >" fijo abajo (gris claro mientras no elegiste nada).

| ID | pantalla | tipo de control | capturas |
|---|---|---|---|
| S01 | Presentación de la mascota | ilustración grande + "Continuar" | C1 |
| S02 | Nombrar a la mascota y decir tu nombre | campo de texto | C2 |
| S03 | Personalidad de la mascota (animador, amable, directo, guía de atención plena) | 4 tarjetas con ilustración, una tildada | C3 |
| S04 | Intro "hablemos de tus objetivos" | mascota + globo, "Vamos" | C4 |
| S05 | Meta principal: bajar, mantener o subir de peso | lista de 3 con ícono | C5 |
| S06 | Metas adicionales (8: relación con la comida, salud intestinal, energía, estrés…) | lista multi-selección con círculo | C6 |
| S07 | "Resultados a largo plazo": curva tu peso vs. otras apps | gráfico + dato destacado | C7 |
| S08 | ¿Contaste calorías antes? (nuevo / lo dejé / ya cuento) | lista de 3 | C8 |
| S09 | Por qué funciona: foto, progreso diario, apoyo de la mascota | collage de 3 tarjetas | C9 |
| S10 | Recordatorios: intro con ejemplo de notificación | "Configurar recordatorios" | C10 |
| S11 | ¿Cuándo recordarte? (mañana, antes de comidas, cuando la mascota tiene hambre) | multi-selección + "Configurar más tarde" | C11 |
| S12 | Intro "hablemos de tus hábitos" | mascota + globo | C12 |
| S13 | ¿Cuántas comidas al día? | **rueda de números** | C13 |
| S14 | ¿Entre qué horas comés? (inicio/fin) | 2 ruedas de hora + nota de ventana | C14 |
| S15 | ¿Conocés el ayuno intermitente? | sí / no | C15 |
| S16 | Dato sobre ayuno con fuente | ilustración reloj + cita | C16 |
| S17 | "Ya ayunaste X h" + recomendado | "Quiero probar el ayuno" / "Omitir" | C17 |
| S18 | ¿Dónde comés? (casa, afuera, delivery) | lista | C18 |
| S19 | Tipo de dieta (7: equilibrada, vegetariana, vegana, paleo, keto, alta en proteínas, baja en carbos) | lista | C19 |
| S20 | Restricciones y alergias | **chips** multi-selección + "+" | C20 |
| S21 | ¿Tomás suficiente agua? | sí / no / no sé | C21 |
| S22 | Dato sobre el agua | ilustración de vasos | C22 |
| S23 | Aviso "no sustituye consejo médico" | **hoja inferior** + "¡Entendido!" | C23 |
| S24 | Qué hábitos cambiar (8: azúcar, estrés, agua, chatarra, porciones, verduras, cocinar, sal) | multi-selección + "Nada de lo anterior" | C24 |
| S25 | "Tu plan está casi listo" | transición | C25 |
| S26 | Género (mujer, hombre, no binario) | lista | C26 |
| S27 | Edad | rueda | C27 |
| S28 | Nivel de actividad (4 con descripción) | lista con ícono de barras | C28 |
| S29 | Conectar Health Connect | "Conectar" / "Agregaré actividades manualmente" | C29 |
| S30 | (pregunta incompleta en la captura, "¿Cómo querés que tu a…") | confirmar | C30 |
| S31 | Peso actual | rueda kg/lb | C31 |
| S32 | Altura | rueda cm/ft | C32 |
| S33 | **Resumen personal**: barra de IMC por colores, aviso de riesgo, actividad, dieta, metabolismo | tarjetas | C33 |
| S34 | Peso ideal + etiqueta "Realista" | rueda + nota | C34 |
| S35 | "Niqo, mantener 60 kg es…" | transición personalizada | C35 |
| S36 | **Plan listo** (desplazable): progreso proyectado, kcal + barra apilada de macros, plan de comidas 28 días, ayuno 14/10 h, agua 2500 ml, pasos y kcal a quemar, resumen | tarjetas + "Comprometerme con mi meta" | C36–C39 |
| S37 | Muro de pago: anual / semanal, −50 % | carrusel + 2 tarjetas de precio | C40 |
| S38 | Regalo de oferta | "Abrir ahora" | C41 |
| S39 | Crear cuenta (Google) | botón Google | C42–C43 |

### Registro de comida (C44–C55)
| ID | pantalla | componentes clave | capturas |
|---|---|---|---|
| S40 | Hoy, primera vez: "Alimentá a [mascota]. ¿Qué comiste la última vez?" | tarjeta central; abajo **cámara · "+" grande · galería**; "Lo haré después" | C44 |
| S41 | Buscar / describir comida | campo "Describí tu comida…" con micrófono, pestañas **Recientes / Guardados**, estado vacío | C45, C48 |
| S42 | Resultados de búsqueda | lista "Biblioteca de alimentos" con ✓ verificado, porción y kcal, botón "+" | C46–C47 |
| S43 | Detalle de alimento (hoja inferior) | kcal y macros con íconos de color, pestañas **unidad / gramos**, **– cantidad +**, regla deslizable, "Agregar" | C46–C47 |
| S44 | Carrito | barra inferior "Huevos grandes · **Registrar 71 kcal**" | C48 |
| S45 | Procesando | foto en círculo con ✓, "Casi listo…", mascota | C49 |
| S46 | **Resultado de la comida** (fondo lila) | foto, comentario de la mascota, progreso del día (+71 kcal, 71/2259), macros 🔒, "Mi comida" + Editar, **puntaje nutricional 0–100** con barra, logros 🔒, proteína, fibra, consejos 🔒, botón flotante "Listo" | C50–C52 |
| S47 | Contador de racha | número animado 0 → 1 | C53 |
| S48 | Racha | "1 día de racha", semana L–D con tildes, compartir, "Estoy comprometido" | C54 |
| S49 | Compromiso de racha: 7 / 14 / 30 / 50 días | lista con etiqueta (Súper, Genial…) | C55 |

### Uso diario (C56–C64)
| ID | pantalla | componentes clave | capturas |
|---|---|---|---|
| S50 | **Inicio** | mitad superior: escena ilustrada con la mascota, aviso "+15 monedas"; fila "Hoy" (calendario) · racha · regalo; tarjetas: **Calorías consumidas** (número grande, "+" circular, 3 barras de macros, miniaturas de comidas, meta), **Calorías por quemar** (+, Health Connect), **Plan de comidas** (recetas con kcal y minutos), **Agua** (cuadrícula de vasos, +, meta), **Ayuno** (meta), **Puntaje nutricional** (anillo 60, premios 🔒) | C56–C59 |
| S51 | **Retos** | encabezado verde con monedas; **diarios** (balance calórico, constancia, comer consciente) y **semanales** (racha, calorías, agua, peso, ayuno, logros, fibra) con barra de progreso y recompensa | C60–C61 |
| S52 | Estadísticas (vacía) | fondo borroso + "Registrá 2 días más para ver estadísticas" | C62–C63 |
| S53 | **Menú del "+"** (panel oscuro) | Entrenamiento (kcal restantes), Peso, Agua, Ayuno (INICIO), fila **Agregar rápido · Describir · Buscar**, **Escanear alimento** | C64 |

### Desde el menú "+" (D1–D28, subcarpeta "Imágenes que faltan")
| ID | pantalla | componentes clave | capturas |
|---|---|---|---|
| S54 | Aviso "ya leo códigos de barras" | hoja inferior: una sola cámara para comida, etiquetas y códigos | D1 |
| S55 | **Cámara** | visor con esquinas, chip "Mis comidas", abajo **galería · disparador · teclado** | D2 |
| S56 | Analizando | barrido animado sobre la foto, hoja "Qué hay ahí" → "Revisando base de datos…" con la mascota | D3–D4 |
| S57 | **Hoja "Mi comida"** | ×cantidad, "Hoy a las 16:21" (editable), alimento ✓ con porción y kcal, **"Ajustar con IA"**, "+", borrar, "Registrar X kcal" | D5 |
| S58 | Preparando | foto en círculo con anillo de progreso | D6 |
| S59 | Resultado (el color de fondo cambia con la comida) | igual que S46, con puntaje "Bueno 72" | D7–D8 |
| S60 | **Buscar entrenamiento** | buscador + lista larga (~90) con ícono por categoría: caminata, trote, ciclismo, pesas, HIIT, yoga, pilates, baile, natación, deportes, adaptados (silla de ruedas)… | D9–D19 |
| S61 | **Peso** | hoja "Tu peso actual" con rueda kg, la primera vez muestra "Consejos para pesarse", "Registrar peso" | D20–D21 |
| S62 | **Agua** | hoja "Consumo de agua" con número en ml y teclado, "Registrar agua" | D22 |
| S63 | Tarjeta de ayuno sin iniciar | "¿Listo para empezar? Debería empezar en 7 h 06 m", botón INICIO | D24 |
| S64 | **Empezar ayuno** | hoja: "¿Desde tu última comida a las 16:21?" sí / "desde ahora" | D25 |
| S65 | **Ayuno en curso** | cronómetro, inicio (editable) y meta, anillo con FIN | D26 |
| S66 | **Agregar rápido** | kcal grande, nombre opcional, carbos / grasas / proteínas opcionales, otros nutrientes, "Registrar" | D27 |
| S67 | **Describir** | campo "Describí lo que comiste (ej. 2 huevos cocidos y tostada…)" + micrófono | D28 |

Escena de la mascota: nombre y **corazones** (3 de 4) arriba a la izquierda, engranaje arriba a la
derecha, la mascota cambia de pose (quieta, saluda, sorprendida) (D20–D23). El plan de comidas
completo y las estadísticas son **premium** en BitePal.

**Navegación:** barra inferior flotante tipo píldora con 3 íconos (**Inicio · Retos · Estadísticas**) y un
**"+" negro circular** separado a la derecha. No hay pestaña de perfil: la configuración está en el engranaje de la escena.

## Flujos

```
F01 Primer uso                S01→S39 · ~39 pantallas · Nathor Fit apunta a ~15
F02 Registrar por búsqueda    S50 → "+" → S53 Buscar → S41 → S42 → S43 Agregar → S44 Registrar → S45 → S46 → S47/S48
                              toques: 6 · bordes: sin resultados, porción en gramos
F03 Registrar por foto        S53 Escanear → cámara → S45 → S46        (confirmar: falta captura)
F04 Describir con texto/voz   S53 Describir → S41 → S46                 (confirmar)
F05 Agua                      S50 tarjeta Agua "+" (1 toque)
F06 Peso / Entrenamiento      S53 → Peso / Entrenamiento                (confirmar)
F07 Ayuno                     S53 Ayuno → INICIO                         (confirmar)
F08 Retos                     barra → S51
F09 Estadísticas              barra → S52 (se habilita con 3 días)
```

## Componentes

| componente | variantes | dónde |
|---|---|---|
| Botón principal | píldora negra a lo ancho; deshabilitado gris; secundario solo texto | todas |
| Barra de progreso | 4 tramos verdes | onboarding |
| Globo de la mascota | gris claro con cola, texto en negrita | onboarding, resultado |
| Opción de lista | ícono + texto + círculo; elegida: fondo verde claro y borde verde | onboarding |
| Chip | normal / elegido | S20 |
| Rueda de selección | número, hora, con unidad | S13, S14, S27, S31, S32, S34 |
| Hoja inferior | con agarre | S23, S43 |
| Tarjeta de métrica | título chico gris, número grande, "+" circular, pie con meta y "…" | S50 |
| Barra de macro | carbos amarillo, grasas azul, proteína verde | S36, S46, S50 |
| Puntaje | barra segmentada y anillo, 0–100 | S46, S50 |
| Insignia hexagonal | bloqueada / desbloqueada | S46, S51 |
| Fila de reto | ícono hexagonal, título, descripción, barra, recompensa | S51 |
| Barra inferior | píldora flotante con 3 íconos + "+" negro | S50–S53 |
| Menú del "+" | panel oscuro con filas e íconos | S53 |
| Aviso flotante (toast) | oscuro con moneda | S50 |
| Candado premium | sobre contenido borroso | S46, S50 |

**Estilo:** fondo blanco y tarjetas gris muy claro con bordes grandes; tipografía de títulos **muy gruesa y
condensada**; texto general sans simple; verde para progreso y selección, negro para acciones; cada
sección tiene su color de fondo (inicio verde ilustrado, resultado lila, racha crema).

## Modelo de datos (inferido)

```
Perfil      nombre, género, edad, altura, peso, peso ideal, actividad, meta principal, metas extra[],
            experiencia, comidas/día, ventana horaria, dónde come, dieta, restricciones[], hábitos[],
            recordatorios[], mascota{nombre, personalidad}           evidencia: S01–S34 · alta
Plan        kcal, carb, grasa, prot, ayuno h, agua ml, pasos, kcal a quemar, peso meta   S36 · alta
Alimento    nombre, verificado, porción (unidad y g), kcal, carb, grasa, prot, fibra     S42–S43 · alta
Entrada     fecha/hora, alimentos[{alimento, cantidad, unidad}], foto?, puntaje 0–100, consejo   S44–S46 · alta
Guardado    alimento (pestaña Guardados)                                    S41 · media
Racha       días, objetivo (7/14/30/50), semana                             S48–S49 · alta
Reto        tipo (diario/semanal), meta, progreso, recompensa              S51 · alta
Monedas     saldo                                                            S50–S51 · alta
Agua, Peso, Ayuno, Entrenamiento                                            S50, S53 · alta
```

## Matriz de funciones

Ver `features.csv`.

## Fuera de alcance

- El mapache, su arte, sus nombres de monedas y frases.
- Su base de alimentos y sus recetas: las nuestras se arman de cero.
- La cuenta con Google: Nathor Fit guarda todo en el teléfono.

## Tamaño

Pantallas 67, flujos 9, entidades 12. Partes difíciles: **el arte de la mascota** (si se agrega), la foto con IA,
el contenido (alimentos y recetas) y un onboarding largo que no aburra.
Tamaño: **M-L**.

## Estadísticas: diseño propio, gratis

En BitePal son premium, así que no hay referencia. Nathor Fit las incluye **gratis** y las diseñamos
nosotros (Fase 3), con el mismo estilo de tarjetas: tendencia de peso (real y suavizada), calorías por día
contra la meta, promedio de macros, agua, horas de ayuno, pasos o entrenamientos, racha y "mejores días".
Se muestran desde el **primer día**, con mensajes de "faltan datos" donde corresponda, en vez de bloquear la pantalla.

## Qué falta capturar (opcional, no bloquea)

1. **Configuración**: el engranaje de la escena, con perfil, metas y recordatorios.
2. **Editar** una comida ya registrada: el botón "Editar" de la pantalla de resultado.
3. **Entrenamiento después de elegirlo**: dónde se pone la duración o la intensidad.
4. **Calendario** ("Hoy"): cambiar de día.
5. **"Mis comidas"**: el chip de la cámara o la pestaña Guardados con algo guardado.
6. La captura C30 completa: la pregunta quedó cortada.

Faltan **solo detalles**: con lo que hay se puede diseñar todo. El plan de comidas completo y las estadísticas son premium y no hacen falta.
