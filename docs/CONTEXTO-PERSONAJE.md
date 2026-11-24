# Nathor Fit — Contexto del personaje y las imágenes de Gemini

> Para retomar el trabajo del personaje en una conversación nueva. El resto de la app está en
> [`CONTEXTO-APP.md`](CONTEXTO-APP.md). Actualizado: 2026-11-23.

## 1. La idea

El gatito de la app se reemplaza por un **personaje gordo argentino, desarreglado**, dibujado como
**caricatura sucia**:
- piel amarilla, contorno negro grueso, ojos saltones con ojeras, pelo negro largo y barba de días;
- camiseta de fútbol, jogging azul oscuro manchado y zapatillas viejas.

La referencia que eligió el dueño fue una ilustración de un gordo tirado en un sillón, en un cuarto
argentino hecho un desastre (botellas, cajas de alfajores, cenicero). **Esa imagen tiene escudo de club y la
cara de un famoso: no se usa como referencia en Gemini**, porque la rechaza.

**El personaje y su cuarto cambian según tres ejes independientes:**

| Eje | Depende de | Cómo se ve |
| --- | --- | --- |
| **Cuerpo** | Peso hacia la meta | Etapa 1 (muy gordo) → etapa 3 (a mitad) → etapa 5 (en su meta) |
| **Pose** | Lo que hizo hoy | `contento`, `fiaca` (no anotó nada), `empachado` (se pasó), `entrenando`, `festejando` (cumplió una meta) |
| **Limpieza** (0–100) | Cómo viene la última semana: días anotados, agua, actividad | Mugriento con moscas → pocas manchas → limpio. El cuarto acompaña: desastre → normal → ordenado. Sube y baja de a poco. |

**Camiseta y bandera del cuarto:** se generan en **verde chillón** y la app las pinta del equipo que se elija
en Perfil: River, Boca, Racing, Independiente, San Lorenzo, Selección o al azar. **Sin escudos ni marcas:**
solo los colores.

**Animación por código**, sin cuadro a cuadro:
- respiración, balanceo y saltito al festejar;
- parpadeo y gotas de transpiración;
- humo del cenicero;
- objetos que aparecen o desaparecen;
- fundido entre poses y entre estados del cuarto.

## 2. Las imágenes que se piden a Gemini

- **Guía con todos los pedidos**, con botón de copiar y casillas para tildar:
  https://claude.ai/artifact/QxZGLRtec4czQTXEe6HMx3 (privada del dueño). Su fuente es
  `docs/personaje/pedidos-gemini.html`: para cambiar un pedido, se edita ese archivo y se vuelve a publicar
  en el mismo link.
- **Formato:** 3:4 vertical para el personaje (salen de 896 × 1200 en JPEG), 4:3 para el cuarto y 1:1 para
  las hojas de objetos.
- **Fondo:** magenta liso. En la práctica sale cerca de `rgb(238, 14, 225)`, con una sombra violeta bajo los
  pies.
- **Camiseta:** verde chillón, cerca de `rgb(91, 244, 16)`, con sombras más oscuras y algo de mugre encima.

### Estado de cada imagen

> **Ilustraciones, segundo lote (2026-11-24):** recibidas y subidas a Drive (carpeta *Ilustraciones del juego*, 20 archivos): ayuno, grupos de alimentos, grupos musculares, `cuarto-ordenado-noche`, poses `e3-triste`, `e3-saludando`, `e3-pesandose`. El `icono-app` se recoloreó por código a piel amarilla (`icono-app-amarillo.jpg`; el original durazno sigue en el repo). **Faltan:** `hoja-puntaje-estados`, pose `e3-con-un-trofeo`, `cuarto-normal-noche` y las 3 limpias de etapa 1 (opcionales). Detalles a corregir: en `hoja-ayuno` el reloj 14:10 no está pintado en proporción y el vapor del plato es rosado; `hoja-grupos-musculares` usa piel durazno y partes azules (se puede recolorear igual que el ícono); las poses extra tienen colita de caballo y cara algo distinta.

> **Ilustraciones del juego (2026-11-24):** 13 recibidas en `docs/personaje/originales/ilustraciones/` (hojas de 9 íconos de 2000 × 2000 sobre magenta, más `icono-app`, `e3-tomando-agua` y `e3-durmiendo`). Pendientes: `hoja-puntaje-estados`, poses `e3-pesandose`, `e3-saludando`, `e3-con-un-trofeo`, `e3-triste` y el grupo F. Problemas: `hoja-navegacion` y `hoja-equipo-objetivo` traen rótulos de texto (se cortan por código); `icono-app` salió con piel color durazno en vez de amarilla (hay que rehacerlo); en `hoja-equipo-objetivo` la colchoneta y el gimnasio salieron como cuadros con fondo.

> **Actualización 2026-11-24 (noche):** etapas rehechas y subidas a Drive (carpeta *Etapas 3 y 5 (nombradas)*). Ancho de camiseta: etapa 1 = 450, etapa 3 = ~294, etapa 5 = ~213: la progresión ya se nota. Hechas: `e3` (contento, fiaca, empachado, entrenando + limpios de contento y entrenando), `e5` completa (con limpios de contento, entrenando y festejando), `cuarto-ordenado`, `objetos-mugre-2`. `e3-festejando` y `e3-festejando-limpio` también están hechos (2026-11-24). Solo faltan los limpios de etapa 1 (opcionales: la app puede usar la versión con mugre). Las ilustraciones del juego (íconos, insignias, rachas, objetos del cuarto) están en `docs/personaje/pedidos-ilustraciones.md` y `checklist-ilustraciones.html`. Ojo: en `e5-empachado` y `e5-fiaca` la camiseta quedó casi como musculosa con degradé verde sobre la piel; hay que revisar cómo la pinta `pintarCamiseta`.

> **Hallazgo (2026-11-24): la progresión de peso casi no se notaba.** Ancho de la camiseta a la altura de la panza: etapa 1 = 450, etapa 3 vieja = 424, etapa 5 provisoria = 402 (apenas 6–11 % menos). Decisión: rehacer las etapas 3 y 5 mucho más flacas, directo sobre las poses de la etapa 1, con objetivo **450 → ~340 → ~260**. Las viejas quedaron en `originales/intermedias/` (como etapa 2, con `e2-fiaca`) y las 6 imágenes nuevas en `originales/provisorias/`. Para medir un resultado: ancho de píxeles verdes de la camiseta en y = 600 sobre la imagen de 896 × 1200.

Numeración igual a la de la guía. Los originales están en `docs/personaje/originales/`. Para la página de
prueba local hacen falta copias en `www/dev/pj/` (no se suben al repo): `mkdir -p www/dev/pj && cp docs/personaje/originales/*.jpg www/dev/pj/`.

| # | Archivo | Estado |
| --- | --- | --- |
| 1 | `personaje-ficha` | ✅ |
| 2 | `e1-contento` | ✅ |
| — | `e1-ojos-cerrados` | ✅ Extra (ya no está en la guía): idéntica a `e1-contento` con los ojos cerrados. Sirve para parpadear. |
| 3 | `e1-fiaca` | ✅ Ahora con la silla de plástico y el celular. El sillón viejo con la tele quedó en `originales/descartadas/`. |
| 4–6 | `e1-empachado`, `e1-entrenando`, `e1-festejando` | ✅ |
| 7 | `e3-contento` | 🔁 Se rehace más flaca (la vieja pasó a `intermedias/e2-contento`) |
| 8 | `e3-fiaca` | 🔁 Se rehace (hay una de etapa 2 en `intermedias/e2-fiaca`) |
| 9–11 | `e3-empachado`, `e3-entrenando`, `e3-festejando` | 🔁 Se rehacen más flacas (las viejas están en `intermedias/`) |
| 12–16 | Etapa 5 completa | ❌ Gemini rechazó la 12, la 14 y la 15. El pedido ya se cambió a un cambio más leve sobre la etapa 3. La 13 y la 16 no se sabe si salieron. |
| 17–18 | `cuarto-desastre`, `cuarto-normal` | ✅ (hay además `cuarto-desastre-noche`). Ojo: abajo a la izquierda asoma el borde de una tele en todos los cuartos. |
| 19 | `cuarto-ordenado` | ⏳ Falta: se pide editando `cuarto-normal` |
| 20–22 | `objetos-vicios`, `objetos-sanos`, `objetos-mugre` | ✅ Hojas de 3 × 3 sobre magenta; los objetos se recortan uno por uno. En `objetos-mugre` la grasa y el centro del café salieron rosados (se confundirían con el fondo): se rehacen en una hoja chica. |
| 23–31 | Versión limpia de `contento`, `entrenando` y `festejando` en las 3 etapas | ❌ La 23 salió **otro personaje** (piel natural, otra cara): no sirve. El pedido ya se cambió a "mismo dibujo exacto, solo sacale la mugre", subiendo la imagen original en el mismo mensaje. |

### Cómo se pasan las imágenes

El dueño las pega en el chat o las sube a su Drive, en **NATHOR FIT › Personaje**. El conector de Drive
puede bajarlas. Se guardan en `docs/personaje/originales/` con el nombre de la guía.

## 3. Lo que aprendimos de Gemini (importante)

- **Rechaza con** "No puedo generar la imagen… debido a intereses de proveedores de contenido de terceros"
  cuando:
  - el pedido **nombra una serie, un personaje, un equipo o una marca**: por eso los pedidos describen el
    estilo con palabras y nunca dicen "Los Simpson";
  - se le **sube una imagen con escudos o caras de famosos**;
  - **el resultado se parece demasiado a una serie conocida**. Le pasa sobre todo con el personaje
    **flaco y amarillo** (etapa 5) y con la escena "gordo amarillo en el sillón frente a la tele". Por eso
    la pose de fiaca se cambió a "silla de plástico mirando el celular".
- **Lo que mejor funciona: editar imágenes que ya aceptó, en cadena,** en vez de dibujar de cero:
  - ficha → `e1-contento` → el resto de las poses de la etapa 1;
  - `e1-contento` → `e3-contento` → etc.
- **Si se le piden muchos cambios juntos, redibuja** y sale otro personaje: pedir lo mínimo y subir la
  imagen original en el mismo mensaje.
- A veces rechaza por azar: "intentá de nuevo" una o dos veces.
- Las imágenes de ojos cerrados se sacaron de la guía, porque el parpadeo se puede hacer por código. Igual
  existe la de `e1`.
- **Si la etapa 5 no sale nunca:** hacerla todavía más parecida a la etapa 3 o cambiarle algún rasgo (peinado,
  barba).
- **Plan B de la limpieza** si la versión limpia sigue saliendo distinta: limpiar por código, tapando las
  manchas de piel y jogging con el color de alrededor y sumando un brillito.

## 4. Procesamiento en la app (ya hecho y probado)

`www/js/personaje.js`, con funciones puras sobre los píxeles (testeadas en `tests/personaje.test.js`):

- `recortarFondo(px)`:
  - transparente donde `min(r, b) − g > 30`, con un borde suave hasta 120;
  - saca el tinte magenta de los bordes;
  - también borra la sombra violeta;
  - no toca la piel, el contorno, el jogging, la lengua ni la vincha roja.
- `esCamiseta(r, g, b)`: tono 72–165°, saturación ≥ 0,3, brillo ≥ 0,12. Así detecta el verde, también en
  sombra, y no la piel amarilla, que tiene un tono de unos 48°.
- `pintarCamiseta(px, ancho, alto, equipo)`:
  - conserva arrugas y sombras: el brillo del verde multiplica el color del equipo;
  - ubica franjas y bandas con la caja de la camiseta (percentiles 2 y 98, para que las migas sueltas no la
    agranden);
  - dibujos: `banda-diagonal` (River), `franja` (Boca), `bastones` (Racing, San Lorenzo, Selección) o liso
    (Independiente).
- `EQUIPOS`, `EQUIPOS_AZAR`.
- `prepararImagen(url, { equipo })` (navegador): devuelve un canvas recortado y pintado, en unos 70 ms por
  imagen.

**Pruebas:**
- Página de prueba: `www/dev/personaje.html`. Con el servidor local, cargar la página y llamar a
  `prepararImagen('/dev/pj/e1-contento.jpg', { equipo: 'boca' })` desde la consola.
- Resultados guardados: `docs/personaje/prueba-camisetas.png` y `prueba-camisetas-2.png`. Se ven bien:
  River, Boca, Racing, San Lorenzo, Independiente y la Selección.

> Pedidos listos para pegar en un chat nuevo de Gemini: [`personaje/pedidos-pendientes.md`](personaje/pedidos-pendientes.md). Preprocesado de personajes: `python3 tools/preprocesar-personaje.py` (deja WebP en `www/img/personaje/`).

## 4 bis. Imágenes ya procesadas para la app (2026-11-24)

Todo listo en `www/img/`, con fondo transparente salvo los cuartos. Vista previa: `www/dev/galeria.html` (con el servidor local), que pinta las camisetas por equipo y arma una escena de Hoy por capas.

| Carpeta | Qué hay | Cómo se genera |
| --- | --- | --- |
| `personaje/` | 28 WebP de 560 × 750 (etapas 1, 3 y 5, versiones limpias, ojos cerrados y 6 poses extra de etapa 3) | `python3 tools/preprocesar-personaje.py` (y otra vez con `docs/personaje/originales/ilustraciones`) |
| `iconos/` | 99 íconos de 256 px: navegación, funciones, comidas, puntaje, estados vacíos, acciones, progreso, onboarding, ayuno, grupos musculares y de alimentos | `python3 tools/recortar-iconos.py [filtro]` |
| `insignias/` | 36: retos (ids iguales a `retos.js`), logros, rachas, cofres, monedas, hitos de peso | ídem |
| `escena/` | 36 objetos para el cuarto: premios desbloqueables, sanos, vicios y manchas | ídem |
| `efectos/` | 9: burbujas de diálogo, confeti, fuegos, brillos, gotas, polvo | ídem |
| `cuarto/` | 5 WebP de 1200 × 896: desastre, normal, ordenado, desastre-noche, ordenado-noche | script en la conversación (achicar y guardar WebP) |
| `marca/` | Íconos de la app con el personaje (192, 512, maskable, apple, favicon) sobre `--ink` | **todavía no reemplazan a `www/icons/`** |

- `tools/recolorear-piel.py`: pasa la piel color durazno a amarillo (se usó en `icono-app` y en la hoja de grupos musculares).
- Las hojas con rótulos de texto (`navegacion`, `equipo-objetivo`, `acciones-ajustes`, `puntaje-estados`) se recortan solas: el script borra lo que está debajo del dibujo.
- Todo en Drive: carpetas *Etapas 3 y 5 (nombradas)* e *Ilustraciones del juego*.

**Pendiente:** cuarto medio ordenado de noche (por ahora se usa el de día), etapa 1 limpia (opcional), pintar la bandera del cuarto por equipo, `prog-medidas` con piel durazno.

## 5. Próximos pasos del personaje

1. Terminar de generar lo que falta (tabla de arriba).
2. **Preprocesar** las imágenes, recortarlas y guardarlas como PNG o WebP con transparencia y en menor tamaño
   en `www/img/personaje/`. Así el celular no recorta en cada carga; solo pinta la camiseta, o se guardan
   pintadas por equipo.
3. Tapar o recortar el borde de la tele que asoma abajo a la izquierda en los cuartos.
4. Recortar los objetos de las hojas 3 × 3: buscar zonas conectadas sobre el magenta.
5. Hacer el **parpadeo**: superponer `e1-ojos-cerrados` en `e1`, y en el resto dibujar los párpados encima.
6. Armar la **escena por capas** en Hoy:
   - cuarto según la limpieza;
   - personaje según etapa y pose;
   - objetos según el día: agua o botellas, cajas, mancuernas;
   - manchas encima según la limpieza.
7. Agregar las **animaciones** y el selector de equipo en Perfil.
8. Si la versión limpia no sale en Gemini: probar el plan B de limpieza por código.

## 6. Lo que se probó y se descartó

- **Gatito naranja en SVG** (`www/js/gato.js`): es el que está hoy en la app. Se reemplaza.
- **Prototipo 3D con Three.js** (`docs/prototipos/tano-3d.html`): al dueño no le gustó.
- **"El Tano" en SVG plano estilo dibujo animado** (`docs/prototipos/tano-2d.html`): quedó corto frente a la
  referencia.
- **Higgsfield:** la cuenta tiene 0 créditos, así que se decidió usar Gemini.
