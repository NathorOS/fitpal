# Nathor Fit — Plan de trabajo (v2)

App para bajar de peso: calorías, macros, agua, ayuno, pasos, peso, entrenamientos y foto con IA.
**Objetivo de esta versión del plan:** que Nathor Fit funcione y se use **como BitePal** (mismas
pantallas, mismo flujo, mismas funciones), pero con identidad propia para poder venderla.

- **Arquitectura (sin cambios):** PWA *local-first* en JavaScript puro → APK con Capacitor.
- **Datos:** IndexedDB en el teléfono. Sin servidor propio. Único "backend": proxy de Apps Script para la foto con IA.
- **Publicación de prueba:** https://nathoros.github.io/fitpal/ (GitHub Pages, se publica solo al subir a `main`).
- **Nombre:** Nathor Fit. Paquete Android previsto: `com.nathoros.nathorfit`.

> **Cómo trabajamos:** antes de cada fase, Claude resume qué hizo y qué va a hacer, y espera tu OK.

---

## 1. Qué copiamos de BitePal y qué no

Copiar **cómo funciona** está bien y es lo que buscan los usuarios. Copiar **cómo se ve tal cual** hace que
Google Play la rechace por imitación y le da a BitePal motivo para pedir que la bajen. Por eso:

| Igual que BitePal (lo copiamos) | Propio de Nathor Fit (no lo copiamos) |
|---|---|
| Pantallas, orden de las pestañas, flujos y cantidad de toques | Logo, ícono, ilustraciones y la mascota: el mapache se reemplaza por **un gatito propio** |
| Funciones: registro, foto IA, agua, ayuno, pasos, peso, rachas | Colores de marca (mismo *rol*, otro tono) |
| Tipo de componentes: tarjetas redondeadas, anillos, barra inferior, botón "+" | Todos los textos y mensajes (los escribimos de cero) |
| Escala de tamaños, espaciado y jerarquía visual | Fuentes pagas (usamos una libre equivalente) |
| Onboarding largo con resumen y "compromiso" | Capturas de BitePal: solo de referencia, nunca dentro de la app |

---

## 2. Skills de replica-skill: cuáles usamos

### Imprescindibles (sin estas no seguimos)
| Skill | Para qué en Nathor Fit | Cuándo |
|---|---|---|
| `/replica-recon` | Mapear BitePal: lista de pantallas, flujos, funciones y su modelo de datos. Es la "lista de lo que hay que igualar". | Fase R1 |
| `/replica-design` | Medir de las capturas tamaños, espaciados, radios y componentes, y pasarlos a variables de diseño. Trae el chequeo de contraste. | Fase R3 |
| `/replica-build` | Método de construcción en cada fase: pantalla por pantalla, con todos sus estados (vacío, cargando, error, texto largo, celular). | Fases 1 a 7 |
| `/replica-test` | Plan de pruebas por flujo y reporte de errores con gravedad. Cierra cada fase. | Final de cada fase |
| `/replica-brand` | Nombre Nathor Fit, paleta propia, brief del logo, tono de los textos y el barrido final que busca restos de "BitePal" en el código. | Fase R3 + Fase 8 |

### Recomendadas (suman mucho, no bloquean)
| Skill | Para qué | Cuándo |
|---|---|---|
| `/replica-entrepreneur` | Leer reseñas reales de BitePal y encontrar qué odian sus usuarios. Eso es lo que hace que Nathor Fit sea **mejor** y no una copia. | Fase R2 |
| `/replica-diff` | Puntaje de cuánto se parece (funciones y distribución en pantalla). Mide el "lo más parecida posible". | Después de Fase 3, 5 y 8 |
| `/replica-launch` | Ficha de Google Play, precios y página de venta. | Fase 9 |

### No las usamos
| Skill | Por qué no |
|---|---|
| `/replica-architect` | El stack ya está decidido (PWA local-first) y ella recomienda Next.js + Supabase, que contradice el plan. Tomamos el modelo de datos del recon y lo pasamos a IndexedDB. |
| `/replica-backend` | No hay servidor, login ni pagos online. Solo el proxy de IA, que ya está diseñado. |
| `/replica-deploy` | Está pensada para Vercel, dominios y Stripe. Publicamos con GitHub Pages y el APK con Capacitor. Si vendemos por suscripción, se revisa. |

---

## 3. Fases

Cada fase de construcción termina con: `/replica-test` → checklist en verde → actualizar `replica/features.csv` → commit → publicar.

### ✅ Fase 0 — Esqueleto (hecha)
PWA instalable con 5 pestañas, IndexedDB, cálculos, offline y publicación automática en GitHub Pages.

### ✅ Fase R1 — Recon de BitePal · `/replica-recon`
- Fuentes: ficha de Google Play y App Store (capturas y descripción), web y ayuda de BitePal, videos públicos.
  **Si tenés BitePal instalada**, lo mejor son tus propias capturas de cada pantalla (vos las sacás, yo no entro a tu cuenta).
- Resultado: `replica/recon.md` (pantallas S01…, flujos F01…, componentes, datos) y `replica/features.csv`
  (cada función con prioridad: imprescindible / conviene / opcional).
- El mapache se marca `skip`; sus funciones (nombre, personalidad, reacciones) las cumple **el gatito**.
- Las capturas van a `replica/screens/` y **no se suben** al repo (es público).
- **Al terminar, se reajustan las Fases 1 a 7** según lo que tenga BitePal.

### ✅ Fase R2 — Qué odian los usuarios de BitePal · `/replica-entrepreneur`
- 100+ reseñas reales de Google Play, App Store y Reddit, citadas textualmente y con link.
- Resultado: tres listas (lo que odian, lo que falta, lo que no resuelve), 5 a 8 mejoras para Nathor Fit
  y el "ángulo" de venta. Las mejoras entran a `features.csv`.

### ✅ Fase R3 — Diseño y marca · `/replica-design` + `/replica-brand`
- Variables de diseño medidas de las capturas: colores por rol, tipografía, espaciados, radios, sombras.
- Paleta propia de Nathor Fit (otro tono que BitePal), con contraste AA verificado.
- Componentes base: botón, tarjeta, anillo, barra inferior, botón "+", hoja inferior, campos.
- Brief del logo e ícono, y guía de tono (cercano, sin culpa).
- Se reemplaza `estilos.css` por estas variables. *(Queda para el arranque de la Fase 1, junto con guardar Fredoka y Nunito Sans dentro de la app.)*
- Hecho: paleta Esmeralda, títulos Fredoka, `replica/design/`, `replica/brand.md`, barrido de la app limpio.

### ✅ Fase 1 — Onboarding, perfil y meta calórica · `/replica-build`
- Onboarding con los mismos pasos y orden que BitePal (según el recon), incluido nombrar al gatito y elegir su personalidad.
- Propuestas pendientes de tu OK: **edad mínima 18** y **sin pedir clave de Gemini** acá (va en Fase 6).
- Guardar perfil y primera meta; Perfil para editar y recalcular.
- Checklist: el perfil sobrevive a recargar · nunca baja de 1200 / 1500 kcal · ritmo máx. 1 %/semana · 3 perfiles verificados a mano.

### ✅ Fase 2 — Alimentos, registro y pantalla Hoy · `/replica-build`
- ~150 alimentos argentinos, buscador, cantidades, comidas del día, favoritos y comidas propias.
- Hoy con la misma distribución que BitePal: anillo principal de calorías, macros, tarjetas por comida.
- Checklist: el anillo se actualiza al instante · ayer no aparece hoy · comidas propias reutilizables · funciona offline.

### ✅ Fase 3 — Agua, peso, pasos y Progreso · `/replica-build` · luego `/replica-diff`
- Agua (+250/+500), peso con línea real y suavizada, pasos manuales e importación CSV, gráficos semanales.
- **Control de parecido #1** con `/replica-diff`.

### ✅ Fase 4 — Entrenamiento · `/replica-build`
- ~60 ejercicios, plantillas por nivel y equipo, pantalla de sesión con descanso, progresión simple.
- (Si BitePal no tiene entrenamiento, esta fase es un **extra** de Nathor Fit y se diseña con el mismo estilo.)

### ✅ Fase 5 — Ayuno, puntaje y rachas · `/replica-build` · luego `/replica-diff`
- Ventanas 16/8, 14/10 y personalizada; puntaje diario; racha con comodín semanal, sin culpa.
- Las rachas y los retos de BitePal se adaptan al gatito: festeja la racha y nunca pierde vidas.
- **Control de parecido #2.**

### ✅ Fase 6 — Código de barras, voz y foto con IA · `/replica-build`
- Open Food Facts, `BarcodeDetector`, voz con fallback a texto, foto → proxy de Apps Script → Gemini.
- Siempre se confirma antes de guardar; resultado como rango de kcal.
- La clave nunca dentro de la app ni del repo.

### ✅ Fase 7 — Meta adaptativa y sugerencias · `/replica-build`
- Recalcular cada domingo con 28 días; sugerencias de ajuste, nunca cambios automáticos.

### Fase 8 — Pulido, respaldo y APK · `/replica-brand` (barrido) + `/replica-diff` (final)
- Modo oscuro, accesibilidad, estados vacíos, exportar/importar respaldo, aviso legal.
- Barrido de marca: ningún "BitePal", color o texto suyo en el código.
- **Control de parecido final** y veredicto: "lista para vender" = todas las funciones imprescindibles hechas.
- APK con Capacitor (`com.nathoros.nathorfit`), probado en 2 celulares.

### Fase 9 — Lanzamiento · `/replica-launch`
- Ficha de Google Play (verificada contra límites y reglas de imitación), precios, página de venta,
  política de privacidad y declaración de datos de salud.

---

## 4. La mascota: un gatito (decidido el 2026-11-23)
- Diseño **100 % propio**, dibujado en SVG con código (`www/js/gato.js`): naranja, panza crema, collar verde
  de Nathor Fit. Nada de mapache, antifaz ni cola rayada.
- Estados: normal, contento, saluda, siesta y festeja. Se suman más a medida que haga falta (comiendo, pensando).
- **Nunca castiga**: no tiene vidas ni pasa hambre. Si no registrás, duerme la siesta. No juzga comidas como "malas".
- Antes de vender, si se quiere, se reemplaza por ilustraciones profesionales con las mismas poses.

## 5. Reglas de seguridad (no negociables, sin cambios)
1. Mínimo calórico (1200 mujeres / 1500 hombres) y ritmo máximo 1 %/semana siempre activos.
2. Sin lenguaje de culpa; lenguaje neutro.
3. Aviso visible: no reemplaza a un médico ni a un nutricionista.
4. Sin comparaciones corporales ni fotos de "antes y después".
5. No apta para menores ni personas con trastornos alimentarios; recomendar consultar a un profesional.
6. **Nuevo:** nada de BitePal (logos, imágenes, textos, colores de marca) dentro de la app.

## 6. Orden
0 ✅ → R1 ✅ → R2 ✅ → R3 ✅ → 1 → 2 → 3 (+diff) → 4 → 5 (+diff) → 6 → 7 → 8 (+brand, +diff) → 9.
