# Encargo: meter el personaje en Nathor Fit

> De: frontend (diseño e imágenes) · Para: quien implementa la lógica y las pantallas.
> Fecha: 2026-11-24 · Rama: `personaje-imagenes` (no está en `main`, la app online no cambió).
> Leé antes `docs/CONTEXTO-APP.md` y `docs/CONTEXTO-PERSONAJE.md`. Acá va solo lo que necesitás para construirlo.

---

## 1. La idea en una frase

**La app tiene que sentirse como un juego al que dan ganas de volver todos los días.** El gatito se va y entra
un personaje propio: un argentino de unos 40, pelo negro largo, piel amarilla, ojeras, camiseta de fútbol y
jogging. Vive en un cuarto. **Él y su cuarto reflejan cómo viene el usuario.**

La regla de oro de estilo, pedida por el dueño:

> **Si hacés las cosas bien, todo se ve limpio, lindo y brillante. La mugre aparece solo cuando venís mal.**

La app no castiga con culpa "seria", pero el dueño la usa solo y aceptó que el personaje se vea gordo, sucio o
empachado según lo anotado. Los íconos y menús, en cambio, **siempre** se ven limpios.

---

## 2. Cómo se ve el personaje: tres ejes independientes

| Eje | Qué lo decide | Valores | Cambia… |
| --- | --- | --- | --- |
| **Etapa (cuerpo)** | IMC con el que arrancó + avance de peso hacia la meta | `e1` muy gordo · `e3` a mitad · `e5` en su meta | Despacio (semanas) |
| **Pose** | Lo que pasó **hoy** | `contento`, `fiaca`, `empachado`, `entrenando`, `festejando` (+ extras) | Durante el día |
| **Limpieza** | Cómo viene la **última semana** | 0 a 100 | De a poco, día a día |

### 2.1 Etapa

**El personaje arranca con el cuerpo que corresponde a tu peso real.** Si la persona empieza con obesidad,
arranca en lo más gordo (`e1`); si empieza con unos kilos de más, arranca más arriba. Para eso hay una
"posición" `p` de 0 (lo más gordo) a 1 (en su meta):

```
imc_inicial = peso_inicial / (altura_cm / 100)²
p_inicial   = clamp((35 − imc_inicial) / 10, 0, 0.5)     // IMC ≥ 35 → 0 · IMC 30 → 0,5 · nunca más de 0,5
avance      = clamp((peso_inicial − peso_actual) / (peso_inicial − peso_meta), 0, 1)
p           = p_inicial + (1 − p_inicial) · avance

p < 0.34 → e1    ·    0.34 a 0.75 → e3    ·    ≥ 0.75 → e5
```

Ejemplos (1,75 m, meta 75 kg):

| Peso inicial | IMC | Arranca en | Pasa a e3 | Pasa a e5 |
| --- | --- | --- | --- | --- |
| 120 kg | 39 | `e1` | con 105 kg | con 86 kg |
| 100 kg | 32,7 | `e1` (p = 0,23) | con 97 kg | con 83 kg |
| 90 kg | 29,4 | `e3` (p = 0,5) | ya está | con 82,5 kg |

- El tope de 0,5 hace que **siempre se vea un cambio**: aunque tenga pocos kilos para bajar, arranca en `e3` y
  termina en `e5`; nunca arranca ya en la meta.
- `peso_inicial` y `altura_cm` ya se piden en el onboarding (`objetivo.js`). Guardar `p_inicial` en el perfil
  una sola vez, al terminar el onboarding, para que no cambie si después se corrige la altura.
- Si vuelve a subir por encima del peso inicial, `avance` queda en 0 y se ve como al principio (nunca peor).

- `peso_actual`: usar la **tendencia** (ya existe la recta de mínimos cuadrados en `adaptativo.js`) y no el
  último pesaje, para que no salte de etapa por un día de retención.
- **Histéresis:** para bajar de etapa (volver a engordar) exigir que el avance caiga 0,08 por debajo del corte.
  Así no titila entre dos etapas.
- Si el objetivo es "mantener": siempre `e5` mientras esté dentro de ±2 kg de la meta; si no, `e3`. Si el
  IMC es ≥ 35, `e1` aunque esté manteniendo.

### 2.2 Pose del día (orden de prioridad, gana la primera que se cumpla)

1. **`festejando`**: cumplió hoy un reto o subió un hito (racha, kilos). Dura el resto del día.
2. **`empachado`**: kcal del día > 115 % de la meta.
3. **`entrenando`**: anotó actividad o entrenamiento hoy (o pasos ≥ meta).
4. **`fiaca`**: después de las 14 h y no anotó **nada** hoy.
5. **`contento`**: todo lo demás.

**Poses extra** (solo etapa 3 por ahora; en e1 y e5 usar la pose normal más cercana):

| Pose extra | Cuándo |
| --- | --- |
| `durmiendo` | Ayuno en curso y hora entre 23 h y 7 h |
| `tomando-agua` | Animación corta de 3 s al tocar "Agua +250" |
| `pesandose` | Pantalla de anotar peso |
| `saludando` | Bienvenida / onboarding / primera apertura del día |
| `con-un-trofeo` | Pantalla de logro o insignia nueva |
| `triste` | Se cortó la racha (solo ese día) |

### 2.3 Limpieza (0–100): la fórmula que propongo

Función pura, testeable como el resto (`limpieza.js`):

```
por cada uno de los últimos 7 días:
  puntos_dia = 50 · anotó comidas
             + 25 · cumplió agua
             + 25 · tuvo actividad (o pasos ≥ meta)
objetivo = promedio de los 7 días, con más peso los recientes (pesos 1..7)
limpieza_nueva = limpieza_ayer + clamp(objetivo − limpieza_ayer, −15, +10)
```

- **Sube de a poco (+10 por día como máximo) y baja un poco más rápido (−15).** Así un día malo se nota, pero no
  destruye una buena semana.
- Guardar el valor por día en IndexedDB (config o tabla nueva) para que sea estable al reabrir.
- Arranque: 50.

Tramos que uso en el diseño:

| Limpieza | Personaje | Cuarto | Manchas encima |
| --- | --- | --- | --- |
| 0–33 | versión normal (con mugre) | `desastre` | 3–4 manchas + moscas |
| 34–66 | versión normal | `normal` | 0–1 mancha |
| 67–100 | **versión `-limpio`** si existe | `ordenado` | ninguna, + brillos |

Las versiones `-limpio` existen para `contento`, `entrenando` y `festejando` en **e3 y e5** (e1 limpia no se
generó: usar la normal).

---

## 3. Dónde están los archivos

Todo dentro de `www/img/` (listo para usar) y los originales en `docs/personaje/originales/` (no se sirven).
**Para ver todo funcionando:** levantar el servidor local y abrir `http://localhost:8080/dev/galeria.html`.

### 3.1 Personaje: `www/img/personaje/`

WebP 560 × 750, fondo transparente, **camiseta en verde chillón** (se pinta por código, ver §4).

```
e{1|3|5}-{contento|fiaca|empachado|entrenando|festejando}.webp
e{3|5}-{contento|entrenando|festejando}-limpio.webp
e1-ojos-cerrados.webp                     ← para parpadear en e1
e3-{durmiendo|tomando-agua|pesandose|saludando|con-un-trofeo|triste}.webp
```

Todos comparten encuadre: personaje centrado, pies abajo. Se pueden superponer y hacer fundido sin saltos
(salvo `durmiendo`, que es acostado, y `fiaca`, que está sentado con su silla).

### 3.2 Cuarto: `www/img/cuarto/`

WebP 1200 × 896 (4:3), **sin** transparencia. Es el fondo.

```
cuarto-desastre.webp   cuarto-desastre-noche.webp
cuarto-normal.webp     (falta la de noche: usar la de día oscurecida con un filtro CSS)
cuarto-ordenado.webp   cuarto-ordenado-noche.webp
```

- Noche = de 20 h a 6 h: `momentoDelDia()` de `escena.js` ya devuelve `'noche'`; reutilizarlo.
- El centro del piso está libre: ahí va el personaje (alto ≈ 72 % de la escena, pies a 3 % del borde de abajo).
- La **bandera de la pared es verde chillón**: hay que pintarla del equipo igual que la camiseta (ojo, el
  cuarto tiene otros verdes: planta. Limitar la máscara a la zona de la bandera, arriba a la derecha).
- Abajo a la izquierda asoma el borde de una tele en todos los cuartos: taparlo con un objeto o recortar.

### 3.3 Objetos sueltos para la escena: `www/img/escena/` (256 × 256, transparentes)

| Prefijo | Para qué |
| --- | --- |
| `vicio-*` (cerveza, fernet, vino, alfajores, pizza, choripán, cenicero, papas, gaseosa) | Aparecen en el cuarto con limpieza baja o si se pasó de kcal |
| `sano-*` (agua, mate, mancuerna, zapatillas, ensalada, manzana, balanza, toalla, banana) | Aparecen con lo que anotó hoy (agua → botella, entrenó → mancuerna) |
| `mugre-*` (salsa, grasa, café, migas, moscas, olor, transpiración, mostaza, barro) | Se pegan **encima del personaje** según la limpieza |
| `premio-*` (rack, planta, bici, cinta, póster, trofeos, mate de oro, zapatillas, balanza) | **Desbloqueables**: quedan para siempre en el cuarto (ver §6) |

### 3.4 Íconos de interfaz: `www/img/iconos/` (256 × 256, transparentes)

Reemplazan a los emojis. Mapeo con lo que ya existe en la app:

| Dónde | Íconos |
| --- | --- |
| Barra inferior | `hoy`, `retos`, `progreso`, `perfil`, botón `agregar` |
| Menú "+" | `anotar-comida`, `foto-ia`, `codigo-barras`, `agua`, `peso`, `actividad`, `ayuno`, `entrenar` |
| Tarjetas de Hoy | `calorias`, `proteina`, `carbohidratos`, `grasas`, `pasos`, `agua`, `ayuno` |
| Comidas | `desayuno`, `almuerzo`, `merienda`, `cena`, `snack`, `favoritos`, `alimento-propio`, `registro-rapido`, `carrito` |
| Puntaje del día (0–40 / 41–65 / 66–85 / 86–100) | `puntaje-malo`, `puntaje-regular`, `puntaje-bueno`, `puntaje-excelente` |
| Estados vacíos y errores | `vacio-comidas`, `vacio-agua`, `sin-conexion`, `cargando` (el mate, ideal girando suave), `error` |
| Onboarding · actividad | `actividad-sedentario`, `-ligero`, `-moderado`, `-alto` (valores iguales a `onboarding.js`) |
| Onboarding · ritmo | `ritmo-025`, `ritmo-05`, `ritmo-075`, `ritmo-1` |
| Onboarding · equipo / objetivo / personalidad | `equipo-ninguno`, `-mancuernas`, `-gimnasio`, `objetivo-bajar`, `-mantener`, `personalidad-carinoso`, `-directo`, `-divertido`, `-tranqui`, `meta` |
| Ayuno | `ayuno-12`, `-14`, `-16`, `-18`, `ayuno-en-curso`, `-completo`, `-romper`, `-ventana`, `-pausa` |
| Entrenar (filtros) | `grupo-piernas`, `-cardio`, `-core`, `-espalda`, `-gluteos`, `-pecho`, `-movilidad`, `-brazos`, `-hombros` (iguales al campo `grupo` de `ejercicios.js`) |
| Buscar alimentos (filtros) | `alim-carnes`, `-lacteos`, `-verduras`, `-frutas`, `-panes`, `-legumbres`, `-bebidas`, `-dulces`, `-rapidas` (hoy los alimentos **no tienen categoría**: hay que agregarla) |
| Acciones y Perfil | `buscar`, `editar`, `borrar`, `guardar`, `respaldo-guardar`, `respaldo-restaurar`, `clave-ia`, `ajustes`, `mi-equipo` (camiseta verde: pintarla del equipo) |
| Progreso | `prog-grafico`, `prog-imc`, `prog-medidas`, `prog-sube`, `prog-baja`, `prog-calendario`, `prog-tabla`, `prog-antes-despues`, `prog-meta` |

### 3.5 Insignias: `www/img/insignias/`

- `reto-{id}`: **el id es el mismo que en `retos.js`** (`anotar3`, `agua`, `moverse`, `meta`, `racha7`, `dias5`,
  `enmeta3`, `agua5`, `act3`, `peso2`, `ayuno3`). Mostrar en gris/apagada si no está cumplido, a color si sí.
- `logro-*`: logros permanentes (primera comida, primera foto con IA, primer entreno, 100 vasos de agua,
  30 días anotando, racha de 30, primera semana completa). **No existen todavía** en el código.
- `racha-3`, `-7`, `-14`, `-30`: la llama que crece con la racha.
- `hito-1kg`, `-5kg`, `-10kg`, `-15kg`, `-20kg`, `hito-mejor-peso`, `-llegada`, `-meta`, `-mantener`.
- `cofre-cerrado`, `cofre-abierto`, `escudo-racha`: para el sistema de §6. `moneda` y `estrella` quedan sin usar.

### 3.6 Efectos: `www/img/efectos/`

`burbuja-dialogo`, `burbuja-pensamiento`, `confeti`, `fuegos`, `cinta-premio`, `brillos`, `corazones`,
`gotas-sudor`, `nube-polvo`. Ver §5.

### 3.7 Marca: `www/img/marca/`

Íconos de la app con la cara del personaje sobre `--ink`: `icon-192/512.png`, `icon-maskable-192/512.png`,
`apple-touch-icon.png`, `favicon-32.png`. **Todavía no reemplazan a `www/icons/`**: al hacerlo, actualizar
`manifest.webmanifest` y `marca.js`.

---

## 4. Camiseta y equipo

- Ya resuelto en `www/js/personaje.js`: `prepararImagen(url, { equipo })` devuelve un `<canvas>` con la camiseta
  pintada (≈ 70 ms por imagen). Equipos en `EQUIPOS`: River, Boca, Racing, Independiente, San Lorenzo,
  Selección, Verde (sin pintar). Tests en `tests/personaje.test.js`.
- Ahora el recorte del fondo ya viene hecho en los WebP; `recortarFondo` no hace daño pero se puede saltear.
- **Cachear** el canvas por `(archivo, equipo)` en memoria; no repintar en cada render.
- Falta: **elegir el equipo en el onboarding** (decidido por el dueño): un paso nuevo "¿De qué cuadro sos?"
  con botones que muestran el personaje ya pintado con cada camiseta, más "Ninguno" (verde) y "Al azar" (elige
  uno de `EQUIPOS_AZAR` una vez y lo guarda). Después se puede cambiar en Perfil (ícono `mi-equipo`).
  Guardarlo en `perfil.equipo_futbol`, que no choque con `equipo` de entrenamiento.
- **Nunca escudos ni nombres de marcas en imágenes**: solo colores (el repo es público).

---

## 5. Cómo tiene que "actuar": animaciones (todo por código, nada cuadro a cuadro)

| Qué | Cómo | Cuándo |
| --- | --- | --- |
| Respirar | `scaleY(1.015)` desde los pies, 3,2 s, infinito | Siempre |
| Parpadeo | e1: superponer `e1-ojos-cerrados` 120 ms. e3/e5: dibujar párpados (dos elipses color piel) sobre los ojos | Cada 3–6 s al azar |
| Saltito | `translateY(-6 %)` con rebote | Al entrar en `festejando` |
| Fundido de pose | crossfade 400 ms entre canvas | Al cambiar de pose o de limpieza |
| Gotas de sudor | `gotas-sudor` cerca de la cabeza, caen y se desvanecen | `entrenando` |
| Moscas | `mugre-moscas` girando lento alrededor | Limpieza < 34 |
| Olor | `mugre-olor` subiendo y desvaneciéndose | Limpieza < 20 |
| Brillos | `brillos` titilando a los costados | Limpieza ≥ 67 |
| Confeti / fuegos | arriba de la escena, 2 s | Reto cumplido, insignia nueva, hito |
| Humo | partículas sobre el `vicio-cenicero` | Si el cenicero está en escena |
| Nube de polvo | `nube-polvo` 300 ms | Cuando aparece o se va un objeto del cuarto |
| Hablar | `burbuja-dialogo` con una frase corta, se va a los 4 s | Al abrir Hoy y al anotar algo |

- **Respetar `prefers-reduced-motion`**: sin respiración, sin partículas; solo cambios de imagen.
- **El personaje habla** (decidido por el dueño), con frases **crudas y bien argentinas** que te empujen a
  hacer las cosas. El banco completo y sus reglas están en [`FRASES.md`](FRASES.md). Reemplaza a `FRASES` de
  `hoy.js`, que habla "del gatito" y tiene la regla "nunca retan": ahora bardea, se burla y te dice qué no comer (nunca "no comas").

---

## 6. Para que sea un juego (funciones nuevas)

Las imágenes ya están; la lógica **no existe**. Propuesta, de lo más importante a lo menos:

1. **Racha visible con llama que crece** (`racha-3/7/14/30`) en Hoy. `racha()` ya existe en `estadisticas.js`.
2. **Insignias**: pantalla "Mis logros" dentro de Retos; al ganar una, pantalla con `e3-con-un-trofeo` + confeti.
3. **Hitos de peso** (`hito-*`) calculados con la tendencia.
4. **Cuarto que progresa**: cada hito o cada 7 días de racha desbloquea un `premio-*`, que queda en el cuarto
   para siempre (en una posición fija por objeto). Lo que se ganó no se pierde.
5. **Cofre semanal, sin monedas** (decidido: las monedas sin tienda no sirven, y una tienda no vale la pena):
   si cumplió ≥ 4 retos en la semana, el domingo aparece `cofre-cerrado`; al tocarlo se abre (`cofre-abierto`
   + confeti) y sale un `premio-*` nuevo para el cuarto. `moneda` y `estrella` quedan sin usar.
6. **Escudo de racha** (opcional): 1 por semana; si un día no anota, se consume en vez de cortar la racha.

Todo como funciones puras con tests, igual que `retos.js`.

---

## 7. Cómo armar la escena de Hoy (capas, de atrás hacia adelante)

1. Cuarto (según limpieza y hora).
2. Premios desbloqueados (`premio-*`).
3. Objetos del día (`sano-*` / `vicio-*`), máximo 3–4, a los costados.
4. Personaje (etapa + pose + limpio/no) con la camiseta del equipo.
5. Manchas sobre el personaje (`mugre-*`, con `mix-blend-mode: multiply` y recortadas a la silueta).
6. Efectos (brillos, moscas, gotas, confeti, burbuja).

Contenedor 4:3, ancho completo arriba en Hoy. La galería (`www/dev/galeria.html`) tiene una versión mínima
funcionando de las capas 1, 3 y 4: usala de referencia y reemplazala por algo prolijo.

Reemplaza a `gatoSVG` y `escenaSVG` en `ui/hoy.js`. El gatito se nombra en muchos archivos; para encontrarlos
todos: `grep -rl gato www/` (hoy son 23, entre ellos `onboarding.js`, `perfil.js`, `retos.js`, `racha.js`,
`resultado.js`, `estilos.css` y `sw.js`). Hay que barrer textos, SVG y estilos.

---

## 8. Reglas técnicas que no se negocian

- PWA sin framework ni compilación: módulos ES, igual que el resto.
- **Subir la versión del caché en `www/sw.js`** y agregar los archivos nuevos. Ojo: 4,7 MB de imágenes. Propongo
  **precachear solo** lo de Hoy (cuartos, personaje de la etapa actual, íconos de la barra) y el resto con
  caché "al usar".
- Accesibilidad: los íconos decorativos con `alt=""`; los que son botón, con `aria-label`. La escena tiene un
  texto alternativo que describe el estado ("Tu personaje está contento, el cuarto está ordenado").
- Contraste: los íconos llevan contorno negro, se leen bien sobre fondo claro y oscuro.
- Mantener los pisos de kcal, el ritmo máximo y el aviso médico.
- Tests: todo cálculo nuevo (etapa, pose, limpieza, logros) con tests en `tests/`.

---

## 9. Herramientas para regenerar imágenes

Si llegan imágenes nuevas de Gemini (fondo magenta, camiseta verde chillón):

```bash
python3 tools/preprocesar-personaje.py                                   # personajes de originales/
python3 tools/preprocesar-personaje.py docs/personaje/originales/ilustraciones www/img/personaje   # poses extra
python3 tools/recortar-iconos.py [parte-del-nombre]                       # hojas 3×3 → íconos sueltos
python3 tools/recolorear-piel.py entrada.jpg salida.jpg                   # piel durazno → amarilla
```

Los nombres de cada celda de cada hoja están en la lista `HOJAS` de `recortar-iconos.py`.

---

## 10. Pendientes conocidos

- Cuarto medio ordenado de noche (no se generó).
- Etapa 1 limpia (opcional).
- `prog-medidas` tiene piel color durazno (recolorear o dejar).
- Las poses extra tienen la cara un poco más fina que el resto.
- La hoja de ayuno: el reloj de 14:10 no está pintado en proporción.
- Pintar la bandera del cuarto por equipo.

---

## 11. Preguntas abiertas para el dueño

Ya respondidas:

1. **Equipo:** se elige en el onboarding (y se cambia en Perfil). Ver §4.
2. **Monedas:** por ahora no; sin tienda no sirven. Queda el cofre semanal. Cuando haya tienda, ver §12.
3. **Habla:** sí, con frases crudas bien argentinas: se burla y te dice qué no comer. Ver [`FRASES.md`](FRASES.md).
4. **Cortes de etapa:** 34 % y 75 %, aprobados.
5. **Agregado por el dueño:** el cuerpo arranca según el peso real (IMC). Ver §2.1.

---

## 12. Tienda (para más adelante)

El dueño la quiere sumar en el futuro. Esto es lo que propongo para que sea linda y no canse. Los pedidos de
imágenes para Gemini están en [`pedidos-tienda.md`](pedidos-tienda.md) y en `checklist-tienda.html`.

### 12.1 Monedas: solo se ganan haciendo las cosas bien, y nunca se pierden

| Acción | Monedas |
| --- | --- |
| Día completo anotado (3 comidas o más) | +10 |
| Meta de agua | +5 |
| Actividad anotada | +5 |
| Pesarse (una vez por semana cuenta) | +5 |
| Reto cumplido | +15 |
| Cada 7 días de racha | +30 |

Una semana buena da unas 200–250 monedas. Precios: **chico 150** (se compra con una semana buena),
**mediano 400**, **grande 1000** (un mes). Las monedas no se pierden nunca: si va mal, ya lo castiga el cuarto
sucio y la chicana del personaje. Se usa la imagen `moneda` que ya existe; reemplaza al cofre semanal de §6.5
como fuente de premios (el cofre puede seguir y dar monedas extra).

### 12.2 Qué se vende

1. **Cosas para el cuarto**: los `premio-*` que ya existen y la hoja nueva de objetos. Van en una posición fija.
2. **Accesorios para la cabeza** (gorra, vincha, anteojos…). Se dibujan sueltos y de frente, y se superponen
   sobre la cabeza por código. Para eso hace falta una tabla con la posición de la cabeza en cada imagen del
   personaje (`x`, `y`, `ancho`, en porcentaje): 28 imágenes, se mide una vez.
3. **Camiseta suplente**: no lleva imágenes; es otra paleta en `EQUIPOS` (colores de la alternativa del club).
4. **Fondos nuevos** en vez del cuarto: balcón con parrilla, patio con pileta, gimnasio, plaza.
5. **Escudo de racha** (`escudo-racha`): caro (400) y como máximo uno guardado.
6. **Paquetes de frases** para el personaje (modo abuela, modo DT, modo relator): solo texto, baratos de hacer.
7. **Festejos**: otro efecto al cumplir un reto (globos, serpentinas, papelitos) y la pose `bailando`.

### 12.3 Para que sea llevadero

- **Vidriera que rota cada lunes**: 3 o 4 cosas, elegidas con una semilla por semana (todos los días la misma).
- **Cosas que no se compran**: algunas solo se ganan con hitos (−5 kg, 30 días de racha). Se muestran con candado.
- **Siempre mostrar el precio y lo que falta** ("te faltan 40"), con una barra.
- **Nada con plata real.**

### 12.4 Qué no se vende

- Nada que cambie números (calorías extra, borrar un día, bajar la meta).
- Comida chatarra "de premio" para el personaje.
- Limpieza: el cuarto se limpia solo haciendo las cosas bien.

### 12.5 Datos

Store nuevo en IndexedDB `tienda`: `{ monedas, comprados: [id], equipado: { cabeza, fondo, frases, festejo } }`.
Movimientos en `monedas_mov` (`fecha`, `motivo`, `cantidad`) para no dar dos veces lo mismo el mismo día.
Funciones puras con tests (`monedasDelDia`, `vidrieraDeLaSemana`, `puedeComprar`).

### 12.6 Imágenes de la tienda (ya hechas)

- `www/img/tienda/` (36, 256 × 256): accesorios `acc-*`, objetos para el cuarto `cuarto-*`, festejos `fest-*`
  e íconos de la pantalla (`tienda`, `monedas-bolsa`, `monedas-pila`, `candado-cerrado`, `candado-abierto`,
  `precio`, `tiempo`, `regalo`, `frases`).
- `www/img/fondos/` (1200 × 896): `fondo-balcon`, `fondo-patio`, `fondo-gimnasio`, `fondo-plaza`. Cada uno tiene
  una bandera verde chillón para pintar con el equipo (igual que el cuarto). **Ojo:** el gimnasio tiene un
  segundo rectángulo verde en la ventana; al pintar la bandera, limitar la zona a la de la pared.
- `www/img/personaje/e3-bailando.webp`: festejo que se compra.
- Todo se ve en `www/dev/galeria.html`.
