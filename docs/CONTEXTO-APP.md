# Nathor Fit — Contexto de la aplicación

> Para retomar el trabajo en una conversación nueva. Leer entero antes de tocar código.
> El personaje y las imágenes de Gemini tienen su propio archivo: [`CONTEXTO-PERSONAJE.md`](CONTEXTO-PERSONAJE.md).
> Actualizado: 2026-11-23.

## 1. Qué es

App para bajar de peso, en español rioplatense: calorías, macros, agua, ayuno, pasos, peso,
entrenamientos, foto de la comida con IA y código de barras.

- **Para quién:** solo para uso personal del dueño. **No va a Google Play ni a la venta** (cambio de
  rumbo del 2026-11-23; antes el plan era venderla).
- **Origen:** se armó imitando el funcionamiento de la app BitePal (pantallas, flujos, funciones), con
  identidad propia. Las capturas y reseñas de BitePal están en `replica/`, fuera del repo público.
- **Online:** https://nathoros.github.io/fitpal/ (GitHub Pages).
- **Repo:** `NathorOS/fitpal` en GitHub, **público**. Se sube con `gh` (sesión iniciada como NathorOS).
- **Forma de trabajo pedida por el dueño:** antes de cada fase, contar qué se hizo y qué se va a hacer, y
  esperar su OK.

## 2. Cómo correrla, probarla y publicarla

```bash
python3 -m http.server 8080 --directory www   # servidor local (también está en .claude/launch.json)
npm test                                      # 71 tests unitarios (node --test tests/)
npm run e2e                                   # 39 pruebas de punta a punta (Playwright 1.47 + axe)
```

- La compu tiene **Node 18**: por eso Playwright quedó fijo en la versión **1.47.2** (las nuevas piden Node 20).
- **En localhost el service worker NO se registra** (para no ver archivos viejos al desarrollar). Para probar
  el modo sin conexión en local: agregar `?sw=1` a la dirección.
- **Publicar:** `git push` a `main` → GitHub Actions (`.github/workflows/`) publica `www/` en Pages. El
  despliegue suele fallar la primera vez con "No artifacts named github-pages": se arregla con
  `gh run rerun <id> --repo NathorOS/fitpal`.
- **Cada vez que se cambian archivos de `www/`, subir la versión del caché en `www/sw.js`** (`nathorfit-v14`
  hoy) y sumar a su lista `ARCHIVOS` cualquier módulo nuevo. Un test (`tests/fase8.test.js`) falla si falta
  algún `.js`.
- Barrido de marca (que no quede nada de BitePal): `python3 ~/.claude/skills/replica-brand/sweep.py www --config replica/brand.json`.

## 3. Arquitectura

- **PWA "local-first"** en JavaScript puro con módulos ES, **sin framework y sin compilación**.
- **Datos:** IndexedDB en el teléfono (`www/js/db.js`). No hay servidor propio.
- **Rutas:** hash router en `www/js/app.js` (`#/hoy`, `#/registrar?fecha=…`). Cada vista de `www/js/ui/` exporta
  `montar(contenedor, params)` y crea su propio nodo raíz (si no, se acumulan listeners entre pantallas).
- **Estilos:** variables en `www/css/tokens.css` (fuente de verdad: `replica/design/tokens.json`),
  componentes en `componentes.css`, pantallas en `estilos.css`. Fuentes propias: Fredoka (títulos) y
  Nunito Sans (texto), en `www/fonts/`.
- **APK:** prevista con Capacitor (`com.nathoros.nathorfit`), **en pausa** hasta terminar el rediseño.

### Carpetas

| Ruta | Qué hay |
| --- | --- |
| `www/index.html` | Cascarón: barra inferior (Hoy, Retos, Progreso, Perfil) y botón "+" con su menú |
| `www/js/app.js` | Router, menú "+", registro del service worker |
| `www/js/*.js` | Lógica pura (cálculos, base de datos, IA…) |
| `www/js/ui/*.js` | Pantallas |
| `www/js/datos/` | 135 alimentos argentinos y 62 ejercicios |
| `www/sw.js` | Service worker (caché para usar sin conexión) |
| `tests/` | Tests unitarios de la lógica |
| `e2e/` | Pruebas de punta a punta (Playwright) |
| `docs/PLAN.md` | Plan por fases (menciona a BitePal) |
| `docs/personaje/`, `docs/prototipos/` | Trabajo del personaje nuevo (ver el otro archivo) |
| `replica/` | Investigación de BitePal, diseño, paridad, plan y registro de pruebas |

## 4. Cómo funciona (por partes)

**Onboarding** (`ui/onboarding.js`): 13 preguntas en 3 bloques. El borrador queda en `sessionStorage`.
- **Ruedas de números** (`ui/rueda.js`) para altura, peso y peso meta. Son `spinbutton` accesibles con
  teclado.
- **Barra de IMC** en vivo (`ui/imc.js`): tramos de la OMS.
- **Plan final:** kcal, macros, agua, pasos, proteína, IMC y "Nuestro trato".
- Edad mínima 18.

**Cálculo del plan** (`objetivo.js`, `calculos.js`):
- Mifflin-St Jeor × factor de actividad.
- **Pisos de seguridad: 1200 kcal (mujeres) / 1500 kcal (hombres).**
- **Ritmo máximo: 1 % del peso por semana.**
- Meta de pasos por nivel de actividad: 6000 / 7500 / 9000 / 10000.
- `guardarPerfil(datos, hoy, { registrarPeso })`: al editar datos no se anota un peso falso.

**Hoy** (`ui/hoy.js`):
- Escena de arriba ilustrada, que cambia con la hora (`escena.js`), con el gatito encima.
- Tarjetas:
  - calorías (anillo y macros);
  - ajuste de meta propuesto;
  - ideas para cerrar el día;
  - comidas, con la miniatura de la foto si se anotó con IA;
  - actividad, con la meta de pasos;
  - agua;
  - ayuno con reloj en vivo;
  - puntaje del día.
- Flechas para ver días pasados.

**Registrar comida** (`ui/registrar.js`, `registro.js`):
- Búsqueda sin tildes en 135 alimentos, que son valores aproximados por 100 g.
- Hoja con porciones o gramos y favoritos.
- Registro rápido (solo kcal) y alimentos propios.
- Editar y borrar comidas; anotar en días pasados.
- Al guardar va a "Resultado" (puntaje 0–100 y consejos) y, si es la primera comida del día, a "Racha".

**Foto o texto con IA** (`ia.js`, `ui/ia.js`):
- Usa Gemini con la **clave propia del dueño**, guardada **solo en el teléfono** (IndexedDB, config
  `gemini_clave`). **Nunca va al código, al repo ni a los respaldos.** Se envía en el encabezado
  `x-goog-api-key`, nunca en la dirección.
- Primero busca cada plato en la base propia y, si no lo encuentra, usa la estimación de la IA.
- Todo pasa por el carrito para revisarlo antes de guardar.
- Guarda una miniatura de 160 px de la foto.

**Código de barras** (`codigo.js`, `ui/codigo.js`): Open Food Facts (sin clave), con la cámara
(`BarcodeDetector`) o el número escrito a mano.

**Agua, peso, actividad, pasos** (`actividad.js`, `ui/peso.js`, `ui/actividad.js`):
- **Agua:** meta de 35 ml/kg, entre 2 y 3,5 L.
- **Actividad:** kcal = (MET−1) × kg × h.
- **Pasos:** los que superan 5000 suman a la meta del día.
- **Peso:** se anota con rueda.

**Ayuno** (`ayuno.js`, `ui/ayuno.js`): protocolos de 12 a 18 h, con inicio editable.

**Entrenamiento** (`entrenamiento.js`, `ui/entrenar.js`, `ui/sesion.js`): 62 ejercicios, rutinas por equipo
y nivel, sesión guiada con descanso y progresión.

**Progreso, retos y racha** (`ui/progreso.js`, `retos.js`, `estadisticas.js`):
- Gráficos SVG con vista de tabla.
- 4 retos diarios y 7 semanales.
- Racha de días anotados.

**Meta adaptativa** (`adaptativo.js`):
- Calcula el gasto real con una recta de mínimos cuadrados sobre los pesos de 28 días.
- Necesita al menos 14 días y 10 días completos.
- Propone cambios de ±50 a ±150 kcal en Hoy y **nunca los aplica sola**. Respeta los pisos.

**Perfil** (`ui/perfil.js`, `ui/datos.js`):
- **Editar datos y recalcular el plan**, con vista previa de la nueva meta.
- **Clave de Gemini.**
- **Respaldo:** guardar (compartir o descargar el JSON) y restaurar (reemplaza todo, con confirmación). La
  clave de la IA se conserva y nunca se exporta.
- **Borrar todos mis datos.**

**Seguridad de datos de respaldos:** las miniaturas solo se muestran si son `data:image/...base64`
válidas (un respaldo editado no puede inyectar HTML).

## 5. Historia por fases (todo commiteado y online hasta la Fase 8)

| Fase | Qué se hizo | Commit |
| --- | --- | --- |
| 0 | Esqueleto de la PWA | e6def78 |
| R1–R3 | Investigación de BitePal, diseño (paleta Esmeralda, Fredoka), marca | a7edd3c |
| 1 | Onboarding y plan | a7edd3c |
| 2 | Registro de comidas | a7edd3c |
| 3 | Agua, peso, actividad, progreso | a7edd3c |
| 5 | Ayuno, puntaje, resultado, racha, retos | a7edd3c |
| 4 | Entrenamiento | a7edd3c |
| 6 | IA con clave propia y código de barras | a7edd3c |
| 7 | Meta adaptativa e ideas para cerrar el día | 570e51a |
| 8 | Ruedas, IMC, editar datos, respaldo, miniaturas, ícono, escena por hora, pruebas e2e | aaee37a |

**Fase 8 — quedó afuera:** modo oscuro, página de aviso legal y la APK.

**Errores corregidos en la Fase 8:** están en `replica/bugs.md`.

**Para revisar:** una vez apareció en la consola
`showModal on element not in Document` en `registrar.js` (registro rápido) después de navegar. No se
reprodujo en las pruebas.

## 6. Reglas vigentes

- **Se mantienen:**
  - pisos de 1200 / 1500 kcal y ritmo máximo del 1 % semanal;
  - edad mínima de 18 años;
  - aviso de que no reemplaza a un médico ni a un nutricionista.
- **Cambió (2026-11-23):** como es de uso personal, el dueño **dejó sin efecto la regla de "sin culpa"
  para el personaje**. Puede verse gordo, sucio o empachado según lo que se anote.
- **Claves y datos privados:** la clave de Gemini nunca va al repo. No escribir contraseñas ni claves por el
  dueño: él las pega en Perfil.
- **Nada de BitePal dentro de `www/`:** ni logos, ni imágenes, ni textos.
- **Marcas reales:** el repo y el link son públicos, así que se evitan escudos de clubes, marcas y caras de
  famosos en las imágenes. Los equipos se representan solo con sus colores.

## 7. Lo que vamos a cambiar (próximo trabajo)

**Rediseño total del aspecto.** Al dueño la app le parece "muy genérica".

1. **El gatito se reemplaza por el personaje nuevo:** un gordo argentino desarreglado, dibujado como
   caricatura sucia con piel amarilla. Cambia con lo que se anota. El detalle está en
   [`CONTEXTO-PERSONAJE.md`](CONTEXTO-PERSONAJE.md).
2. **La escena de Hoy pasa a ser el cuarto del personaje en capas:** cuarto, personaje y objetos. Se mueve
   según tres ejes:
   - **peso** → etapa del cuerpo;
   - **lo de hoy** → pose;
   - **la última semana** → nivel de limpieza de 0 a 100.
3. **Calcular el nivel de limpieza:** días anotados, agua cumplida y actividad de los últimos 7 días. Sube y
   baja de a poco. Hay que definir la fórmula y testearla (función pura, como el resto).
4. **Elegir equipo en Perfil:** River, Boca, Racing, Independiente, San Lorenzo, Selección o al azar. La
   camiseta y la bandera del cuarto se pintan por código (`www/js/personaje.js`).
5. **Estilo de toda la app acorde al personaje:**
   - colores, tarjetas, íconos propios en vez de emojis, tipografía;
   - reemplazar el ícono y el logo del gatito (`www/js/marca.js`, `www/icons/`);
   - repasar los textos que nombran al "gatito" (onboarding, Hoy, Perfil, `gato.js`).
6. **Después:** APK con Capacitor, y modo oscuro si sigue teniendo sentido.

## 8. Estado del repo

Todo commiteado y subido el 2026-11-23, después de la Fase 8: el trabajo inicial del personaje
(`www/js/personaje.js`, `tests/personaje.test.js`, `www/dev/personaje.html`, `docs/personaje/`,
`docs/prototipos/`) y estos dos archivos de contexto. Caché del service worker en `nathorfit-v14`.
Las copias de prueba de `www/dev/pj/` no se suben (están en `.gitignore`).

Tests: 71 unitarios y 39 e2e, todos pasando al cierre de esta conversación.

**Si se trabaja en dos conversaciones a la vez:** la del personaje toca `www/js/personaje.js`,
`docs/personaje/` y las imágenes. La de la app toca el resto de `www/`. Las dos editan `www/sw.js`
(lista de archivos y versión del caché), así que hay que coordinar ese archivo.
