# Pedidos para el chef

Chat NUEVO de Gemini (no el del entrenador, así no los mezcla). Solo el paso 0 lleva adjunto. Él aparece en Registrar, en el resultado de una comida y en la IA de comidas, dando consejos. Su ropa no se pinta por equipo.

## Paso 0 · Preparar el chat

### 0. PRESENTAR EL ESTILO → `(no genera imagen)`

**Adjuntar:** `e3-contento-limpio.jpg`

```
Te adjunto una imagen de un personaje original de dibujo animado, de una aplicación móvil para bajar de peso. Ahora vamos a crear OTRO personaje nuevo para la misma aplicación: el cocinero que da consejos de comida. Tiene que tener EXACTAMENTE el mismo estilo de dibujo que la imagen adjunta (piel amarilla, ojos grandes y saltones, trazo negro grueso, colores intensos, limpio y brillante), pero es un hombre distinto, con otra cara y otro cuerpo. No copies a ningún personaje de series, películas ni dibujos existentes, ni a cocineros famosos: es un personaje original. Cada pedido empieza con un título entre corchetes. Respondé solo "listo", sin generar ninguna imagen todavía.
```

## Paso 1 · Ficha

### 1. FICHA DEL CHEF → `chef-ficha`

**Adjuntar:** nada.

> No sigas al paso 2 hasta que te guste.

```
[FICHA DEL CHEF]
Hoja de referencia del personaje nuevo: el mismo hombre dibujado 3 veces, de cuerpo entero, parado, en fila: 1) de frente, 2) de costado, 3) de espaldas. Las 3 figuras del mismo tamaño y bien separadas.

Cómo es: hombre de unos 60 años, piel amarilla, un poco panzón pero sano y alegre, cachetes redondos y colorados, pelo y barba candado canosos, cejas canosas gruesas, cara de abuelo bonachón que sabe mucho de cocina. Ropa: gorro de cocinero blanco alto, chaqueta de cocinero blanca cruzada con botones negros, pañuelo rojo atado al cuello, delantal azul marino, pantalón a cuadros blanco y negro y zapatos negros. Siempre lleva una cuchara de madera en la mano o en el bolsillo del delantal.

Estilo: el mismo de la imagen adjunta del primer mensaje: limpio, lindo y brillante. Sin textos, sin letras, sin logos y sin marcas. La ropa del personaje no usa verde, magenta, rosa ni violeta.
Imagen horizontal 3:2. Fondo de un solo color magenta puro (#FF00FF), plano, sin sombras, sin piso, sin degradé y sin ningún otro objeto.
```

## Paso 2 · Poses

### 2. HOJA DE POSES → `chef-poses`

**Adjuntar:** nada (mismo chat, después de la ficha).

```
[HOJA DE POSES DEL CHEF]
El MISMO chef de la ficha anterior (misma cara, misma barba, mismo gorro y misma ropa, sin cambiar nada). 6 dibujos de cuerpo entero, en orden:
1) Saludando con una mano levantada y una sonrisa grande, con la cuchara de madera en la otra mano
2) Presentando con orgullo un plato con comida sana y colorida (pollo a la plancha, verduras y ensalada), sosteniéndolo con las dos manos
3) Haciendo el gesto de "exquisito": besándose la punta de los dedos juntos, con los ojos cerrados
4) Pensando: con una mano en el mentón, mirando hacia arriba, con la cuchara de madera en la otra mano
5) Con cara de desaprobación, moviendo el dedo índice de un lado al otro como diciendo "eso no", al lado de una hamburguesa grasosa con papas fritas
6) Explicando un consejo: con el dedo índice levantado y la boca abierta, como dando una clase

Hoja horizontal 3:2, grilla de 3 columnas por 2 filas (se lee de izquierda a derecha y de arriba hacia abajo). Todas las figuras del mismo tamaño, de pies a cabeza, bien separadas, sin tocarse ni superponerse y sin salirse de su lugar. Sin textos ni números.

Estilo: el mismo de la imagen adjunta del primer mensaje: limpio, lindo y brillante. La ropa del personaje no usa verde, magenta, rosa ni violeta.
Fondo de un solo color magenta puro (#FF00FF), plano, sin sombras, sin piso, sin degradé y sin ningún otro objeto.
```

## Si algo sale mal

- **Cambió la ropa o la cara en las poses:** `La cara, la barba y la ropa tienen que ser iguales a la ficha. Repetí la hoja de poses corrigiendo eso.`
- **Se parece a un cocinero famoso o a un personaje existente:** `Se parece demasiado a alguien conocido. Hacelo más original: otra forma de cara y de barba.`
- **Fondo con piso o sombra:** `El fondo tiene que ser magenta puro (#FF00FF) plano, sin piso ni sombras. Repetila igual.`
