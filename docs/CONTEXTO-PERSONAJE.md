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

Numeración igual a la de la guía. Los originales están en `docs/personaje/originales/`. Para la página de
prueba local hacen falta copias en `www/dev/pj/` (no se suben al repo): `mkdir -p www/dev/pj && cp docs/personaje/originales/*.jpg www/dev/pj/`.

| # | Archivo | Estado |
| --- | --- | --- |
| 1 | `personaje-ficha` | ✅ |
| 2 | `e1-contento` | ✅ |
| — | `e1-ojos-cerrados` | ✅ Extra (ya no está en la guía): idéntica a `e1-contento` con los ojos cerrados. Sirve para parpadear. |
| 3 | `e1-fiaca` | ✅ Es `e1-sillon.jpg`: salió con la pose vieja (sillón + borde de una tele abajo a la izquierda, que hay que borrar). Se usa como fiaca. |
| 4–6 | `e1-empachado`, `e1-entrenando`, `e1-festejando` | ✅ |
| 7 | `e3-contento` | ✅ |
| 8 | `e3-fiaca` | ⏳ Falta |
| 9–11 | `e3-empachado`, `e3-entrenando`, `e3-festejando` | ✅ |
| 12–16 | Etapa 5 completa | ❌ Gemini rechazó la 12, la 14 y la 15. El pedido ya se cambió a un cambio más leve sobre la etapa 3. La 13 y la 16 no se sabe si salieron. |
| 17–19 | `cuarto-desastre`, `cuarto-normal`, `cuarto-ordenado` | ⏳ Faltan |
| 20–22 | `objetos-vicios`, `objetos-sanos`, `objetos-mugre` | ⏳ Faltan. Son hojas de 3 × 3 sobre magenta; los objetos se recortan uno por uno. |
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

## 5. Próximos pasos del personaje

1. Terminar de generar lo que falta (tabla de arriba).
2. **Preprocesar** las imágenes, recortarlas y guardarlas como PNG o WebP con transparencia y en menor tamaño
   en `www/img/personaje/`. Así el celular no recorta en cada carga; solo pinta la camiseta, o se guardan
   pintadas por equipo.
3. Borrar el borde de la tele en `e1-sillon` (abajo a la izquierda).
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
