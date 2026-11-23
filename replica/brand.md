# Marca de Nathor Fit

Fecha: 2026-11-23. Ángulo (de `fixes.md`): **todo a la vista, sin pagar para ver tus propias proteínas**,
con **hecha para la comida de acá** como apoyo para Argentina.

---

## 1. Nombre: Nathor Fit

Lo eligió el usuario. "Nathor" viene de su marca propia (NathorOS), así que no es un juego de palabras con
el nombre de la competencia: no comparte sonido, letras ni significado.

### Chequeos

Son chequeos de búsqueda, **no** una autorización legal. Antes de gastar plata en el nombre (logo pago,
dominio caro, publicidad) conviene que un abogado de marcas haga la búsqueda formal.

| chequeo | dónde | resultado |
|---|---|---|
| Web | búsqueda "Nathor Fit" / "NathorFit" app | **2026-11-23: sin resultados** con ese nombre ([búsqueda 1](https://apps.apple.com/sv/app/challenge-fit/id1640970123) devolvió solo apps distintas, p. ej. "Challenge.Fit") |
| Web | búsqueda "Nathor" fitness / app / marca | **2026-11-23: sin resultados** con "Nathor"; lo más cercano fue "Nathashby" ([App Store](https://apps.apple.com/es/app/nathashby/id6751297164)), nombre distinto |
| Dominio | `dig NS nathorfit.com`, `.app`, `.com.ar` | **2026-11-23: ninguno devuelve servidores DNS**, señal de que probablemente estén libres. *Confirmar en un registrador* (no había `whois` instalado) |
| **Argentina (INPI)** | portaltramites.inpi.gob.ar, clases 9 y 42 (y 44 si se habla de salud) | **a correr** — es el mercado principal |
| EE. UU. (USPTO) | tmsearch.uspto.gov, clases 9 y 42 | a correr |
| Unión Europea | TMview / EUIPO eSearch | a correr |
| Global | WIPO Global Brand Database | a correr |
| Google Play y App Store | buscar "Nathor Fit" exacto | a correr (desde el teléfono) |
| Redes | Instagram, TikTok, X: @nathorfit | a correr |
| GitHub | NathorOS ya es tuyo | **hecho** |

## 2. Paleta: Esmeralda

En `replica/design/tokens.json` y `www/css/tokens.css`. Elegida por el usuario el 2026-11-23.

| rol | color | para qué |
|---|---|---|
| tinta (`ink`) | `#12302A` | botón principal, menú del +, barra inferior |
| acento (`accent`) | `#0F8F6A` | progreso, selección, anillo, "Sacar foto" |
| texto acento | `#0B7556` | números destacados sobre blanco |
| acento suave | `#E3F6EE` | fondo de la opción elegida |
| escena | `#BDE9D5` | fondo del gatito en Inicio |
| macros | ámbar `#F5B83D`, turquesa `#4FB3BF`, coral `#E8625B` | carbos, grasas, proteínas |

**Por qué no es el verde de la competencia:**
- el tono es 163° contra 130°: más profundo y azulado;
- los botones son verde muy oscuro, no negros, así que el par "verde + negro" no se repite;
- la escena es menta, no verde pasto;
- las macros usan otros colores.

Contraste: **20 pares, 0 fallas AA** (`contrast.py`). Los colores de la competencia están en `brand.json`
para que el barrido avise si alguno se cuela.

**Tipografía:**
- Títulos: **Fredoka** (redondeada, amable).
- Texto: **Nunito Sans**.
- Las dos tienen licencia OFL, libres para uso comercial, y se guardan dentro de la app para que funcione sin internet.

## 3. Brief del logo y del ícono

**La idea en una línea:** la cara del gatito de Nathor Fit, contenta, dentro de un círculo que también es
un anillo de progreso: "te acompaño a llegar".

- **Tipo:** símbolo + nombre. El símbolo solo se usa como ícono de la app.
- **Símbolo:**
  - la cabeza del gatito atigrado naranja (`#F4A259`, contorno `#C9692A`), de frente, ojos cerrados de felicidad;
  - va sobre fondo esmeralda `#0F8F6A`, con un anillo claro (`#BDE9D5`) que lo rodea en unos ¾;
  - es la misma ilustración de `www/js/gato.js`, simplificada: sin cuerpo, sin collar y con 2 rayas en la frente.
- **Nombre:**
  - "Nathor Fit" en Fredoka 600, color tinta `#12302A`;
  - "Fit" puede ir en acento.
- **Tiene que funcionar a 16 px:**
  - en el favicon queda solo la silueta de la cabeza (dos orejas y la cara) con el anillo;
  - sin bigotes ni rayas.
- **Entregables:**
  - SVG del símbolo y del logo completo;
  - ícono 1024×1024 sin transparencia;
  - ícono adaptable de Android: primer plano y fondo por separado, zona segura de 66 %;
  - íconos PWA de 192 y 512 px, también "maskable";
  - favicons de 16, 32 y 48 px;
  - imagen para redes de 1200×630;
  - el "feature graphic" de Google Play de 1024×500.
- **No se tiene que parecer a la competencia:**
  - nada de mapaches ni antifaces;
  - no usar el par verde pasto + negro;
  - no imitar las letras de su logo.
  - Antes de aprobarlo, ponerlo al lado del ícono de BitePal en la tienda y mirarlos juntos.
- **Lo hago yo en SVG** (Fase 8), con el mismo estilo del gatito, salvo que prefieras encargarlo a un diseñador.

## 4. Tono de voz

**Cercano, no empalagoso.** Habla de vos, en argentino, como un amigo que sabe de nutrición. Sin exceso de
emojis ni diminutivos.

**Claro, no técnico.** Dice "te quedan 510 kcal", no "déficit restante". Si usa un término (TDEE, macros),
lo explica una vez.

**Sin culpa, no permisivo.** Nunca reta, nunca castiga, nunca "fallaste". Tampoco miente: si el ritmo pedido
no es seguro, lo dice y propone otro.

| sí | no |
|---|---|
| "Te pasaste un poco hoy. Mañana es otro día." | "¡Superaste tu límite!" en rojo |
| "Tu gatito se quedó dormido esperándote." | "Perdiste tu racha 💔" |
| "Para tu cuerpo, lo más seguro son 0,5 kg por semana." | "No podés elegir eso." |
| "¿Te olvidaste de anotar algo de ayer? Podés hacerlo ahora." | "Ya no se puede editar este día." |
| "Ver todo" (todo es gratis) | candados sobre tus propios datos |

### Los 10 textos que más se ven

| dónde | texto |
|---|---|
| Bienvenida | **Hola, soy tu gatito.** Te ayudo a comer mejor y a llegar a tu peso, sin dietas raras ni culpa. **Empezamos** |
| Aviso de salud | Nathor Fit te orienta, pero no reemplaza a tu médico ni a tu nutricionista. Si tenés alguna condición de salud, consultales antes de empezar. |
| Botón principal del onboarding | **Seguir** |
| Plan listo | **Tu plan está listo.** Comiendo unas {kcal} kcal por día, llegás a {meta} kg cerca del {fecha}. **Arrancar** |
| Inicio vacío | Todavía no anotaste nada hoy. ¿Qué comiste? |
| Botón de registrar | **Anotar {kcal} kcal** |
| Confirmación | ¡Anotado! Te quedan {n} kcal para hoy. |
| Pasado de la meta | Hoy comiste {n} kcal más que tu meta. No pasa nada: lo que cuenta es la semana. |
| Racha cortada | Tu gatito durmió la siesta mientras no estabas. ¿Arrancamos de nuevo? |
| Error | Algo no salió bien y no se guardó. Probá de nuevo; si sigue, avisanos desde Perfil. |
| Estadísticas con pocos datos | Con {n} días ya se ve algo. Cuantos más anotes, más claro el panorama. |

Ningún texto copia la redacción de la competencia; todos se escribieron de cero.

## 5. Barrido

`python3 ~/.claude/skills/replica-brand/sweep.py www --config replica/brand.json`

Resultado en el resumen de la fase. El barrido no mira `replica/` (es material de estudio que no se publica).
Tampoco mira `docs/PLAN.md`, que nombra a la competencia como referencia pero no forma parte de la app.
