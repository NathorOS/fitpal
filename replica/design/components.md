# Componentes de Nathor Fit

Medidos en las capturas de BitePal (C05, C46, C56, C57, C63) y reescritos con tokens propios
(`www/css/tokens.css`). El código está en `www/css/componentes.css`; la muestra viva, en `www/dev/diseno.html`.
Ningún componente usa colores sueltos: solo variables.

Reglas para todos:
- Área de toque mínima de 44 px.
- Foco visible: anillo de 3 px con `--accent`.
- Con `prefers-reduced-motion` se apagan las animaciones.
- **Texto apagado con contraste AA (5,45:1).** BitePal usa `#a7a7a7`, que da 2,41:1 y no pasa AA; acá se corrige.

```
Botón (.btn)
  variantes  principal (tinta), secundario (superficie), acento, fantasma
  tamaño     alto 52 px, píldora, ancho completo
  estados    normal, apretado (escala .97), foco, deshabilitado (40 %), cargando (aria-busy + ruedita)
  tokens     bg ink, texto on-ink, radio pill, fuente sans 18/800
  a11y       <button> real; "cargando" conserva el texto
  usado en   onboarding (Seguir), hoja de alimento (Registrar X kcal), resultado (Listo)
  ojo        el texto blanco sobre el acento solo va desde 19 px en negrita (paleta A: 3,58:1)

Botón de ícono (.icono-btn)
  tamaños    44 px (atrás, cerrar, guardar, −/+) y 64 px (+ de las tarjetas)
  tokens     bg surface, texto text
  a11y       aria-label obligatorio

Progreso en tramos (.tramos)
  3 tramos de 7 px, uno por bloque del onboarding; se llena con --accent
  a11y       el contenedor lleva role="progressbar" y aria-valuenow

Pregunta con gatito (.pregunta + .burbuja)
  gatito SVG de 84 px + burbuja gris con pico; título Fredoka 22/700
  a11y       la burbuja es el <h1> de la pantalla

Opción de lista (.opcion)
  variantes  una sola (role=radio, aria-checked) o varias (aria-pressed)
  estados    normal (borde 2 px border), elegida (borde accent + fondo accent-soft), foco
  medidas    alto mín. 60 px, radio 18, separación 8, emoji o ícono de 32 px, subtítulo opcional
  a11y       flechas para moverse dentro del radiogroup

Chip (.chip)
  píldora gris, 14/700; kcal y macros del alimento, filtros

Tarjeta (.tarjeta) y tarjeta de métrica (.metrica__*)
  radio 28, relleno 20, margen lateral 8 sobre la escena
  métrica: título apagado 16/700, número Fredoka 44/700 con cifras tabulares, pie con meta y "•••"
  estados    vacía ("Todavía no registraste nada hoy"), con datos, pasada de la meta (sin rojo ni culpa)

Anillo con + (.anillo)
  círculo de 64 px con el progreso del día en --accent alrededor del botón +

Barras de macros (.macros)
  3 columnas: nombre, pista de 8 px, "62 / 120 g"
  colores    carbos ámbar, grasas turquesa, proteínas coral (distintos de BitePal)
  gratis     siempre visibles, sin candado

Control segmentado (.seg)
  pista gris con píldora blanca para la opción elegida; aria-pressed

Contador (.contador)
  − cantidad +; número Fredoka 28/700, unidad apagada; también se puede escribir el número

Hoja inferior (.hoja)
  radio superior 28, agarre de 40×5, sombra hacia arriba; fondo de atrás atenuado
  a11y       role="dialog", aria-modal, foco atrapado, Escape y deslizar hacia abajo cierran

Menú del + (.menu-mas)
  panel color tinta; 2 filas de 3 (Actividad, Peso, Agua / Rápido, Describir, Buscar) + "Sacar foto" en acento
  se abre con el FAB, que gira 45° (aria-expanded)

Barra inferior (.barra-inferior)
  píldora flotante con 3 secciones (Inicio, Retos, Estadísticas) + FAB redondo de 64 px aparte
  a11y       <nav> con aria-current="page"
```

Pendientes para `/replica-build`: rueda de números (peso, altura, edad), tarjeta de agua con vasos,
insignia de reto, puntaje 0–100, calendario de la semana, aviso flotante ("+15 puntos").
