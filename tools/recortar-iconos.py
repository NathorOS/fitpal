#!/usr/bin/env python3
"""Recorta las hojas de 3 × 3 íconos de Gemini (fondo magenta) en íconos sueltos con fondo transparente.

Cada celda de la grilla es un ícono. Se saca el fondo con la misma regla que recortarFondo()
(www/js/personaje.js), se borran los rótulos de texto que Gemini a veces agrega debajo del dibujo,
se recorta al contenido y se guarda en WebP cuadrado.

Uso: python3 tools/recortar-iconos.py        (lee docs/personaje/originales/ y escribe en www/img/)
Hace falta Pillow.
"""
from pathlib import Path
from PIL import Image

ORIG = Path('docs/personaje/originales')
ILU = ORIG / 'ilustraciones'
SALIDA = Path('www/img')
LADO = 256          # tamaño final de cada ícono
CELDA = 384         # tamaño de trabajo de cada celda

# (archivo, carpeta de salida, nombres de las 9 celdas; None = celda vacía, con_rotulos)
HOJAS = [
    (ILU / 'hoja-navegacion.jpg', 'iconos', ['hoy', 'retos', 'progreso', 'perfil', 'agregar', 'anotar-comida', 'foto-ia', 'codigo-barras', 'agua'], True),
    (ILU / 'hoja-funciones.jpg', 'iconos', ['peso', 'pasos', 'actividad', 'ayuno', 'entrenar', 'calorias', 'proteina', 'carbohidratos', 'grasas'], False),
    (ILU / 'hoja-comidas.jpg', 'iconos', ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack', 'favoritos', 'alimento-propio', 'registro-rapido', 'carrito'], False),
    (ILU / 'hoja-actividad-ritmo.jpg', 'iconos', ['actividad-sedentario', 'actividad-ligero', 'actividad-moderado', 'actividad-alto', 'ritmo-025', 'ritmo-05', 'ritmo-075', 'ritmo-1', 'meta'], False),
    (ILU / 'hoja-equipo-objetivo.jpg', 'iconos', ['equipo-ninguno', 'equipo-mancuernas', 'equipo-gimnasio', 'objetivo-bajar', 'objetivo-mantener', 'personalidad-carinoso', 'personalidad-directo', 'personalidad-divertido', 'personalidad-tranqui'], True),
    (ILU / 'hoja-ayuno.jpg', 'iconos', ['ayuno-12', 'ayuno-14', 'ayuno-16', 'ayuno-18', 'ayuno-en-curso', 'ayuno-completo', 'ayuno-romper', 'ayuno-ventana', 'ayuno-pausa'], False),
    (ILU / 'hoja-grupos-musculares-amarillo.jpg', 'iconos', ['grupo-piernas', 'grupo-cardio', 'grupo-core', 'grupo-espalda', 'grupo-gluteos', 'grupo-pecho', 'grupo-movilidad', 'grupo-brazos', 'grupo-hombros'], False),
    (ILU / 'hoja-grupos-alimentos.jpg', 'iconos', ['alim-carnes', 'alim-lacteos', 'alim-verduras', 'alim-frutas', 'alim-panes', 'alim-legumbres', 'alim-bebidas', 'alim-dulces', 'alim-rapidas'], False),
    (ILU / 'hoja-acciones-ajustes.jpg', 'iconos', ['buscar', 'editar', 'borrar', 'guardar', 'respaldo-guardar', 'respaldo-restaurar', 'clave-ia', 'ajustes', 'mi-equipo'], True),
    (ILU / 'hoja-progreso.jpg', 'iconos', ['prog-grafico', 'prog-imc', 'prog-medidas', 'prog-sube', 'prog-baja', 'prog-calendario', 'prog-tabla', 'prog-antes-despues', 'prog-meta'], False),
    (ILU / 'hoja-puntaje-estados.jpg', 'iconos', ['puntaje-malo', 'puntaje-regular', 'puntaje-bueno', 'puntaje-excelente', 'vacio-comidas', 'vacio-agua', 'sin-conexion', 'cargando', 'error'], True),
    (ILU / 'hoja-efectos.jpg', 'efectos', ['burbuja-dialogo', 'burbuja-pensamiento', 'confeti', 'fuegos', 'cinta-premio', 'brillos', 'corazones', 'gotas-sudor', 'nube-polvo'], False),
    # Insignias: los nombres de retos coinciden con los ids de www/js/retos.js
    (ILU / 'hoja-insignias-retos.jpg', 'insignias', ['reto-anotar3', 'reto-agua', 'reto-moverse', 'reto-meta', 'reto-racha7', 'reto-dias5', 'reto-enmeta3', 'reto-agua5', 'reto-act3'], False),
    (ILU / 'hoja-insignias-extra.jpg', 'insignias', ['reto-peso2', 'reto-ayuno3', 'logro-primera-foto', 'logro-primer-entreno', 'logro-primera-comida', 'logro-agua100', 'logro-30-dias', 'logro-racha30', 'logro-primera-semana'], False),
    (ILU / 'hoja-rachas-recompensas.jpg', 'insignias', ['racha-3', 'racha-7', 'racha-14', 'racha-30', 'cofre-cerrado', 'cofre-abierto', 'moneda', 'estrella', 'escudo-racha'], False),
    (ILU / 'hoja-hitos-peso.jpg', 'insignias', ['hito-1kg', 'hito-5kg', 'hito-10kg', 'hito-15kg', 'hito-20kg', 'hito-mejor-peso', 'hito-llegada', 'hito-meta', 'hito-mantener'], False),
    # Objetos de la escena (el cuarto)
    (ILU / 'hoja-objetos-desbloqueables.jpg', 'escena', ['premio-rack', 'premio-planta', 'premio-bici', 'premio-cinta', 'premio-poster', 'premio-trofeos', 'premio-mate-oro', 'premio-zapatillas', 'premio-balanza'], False),
    (ORIG / 'objetos-vicios.jpg', 'escena', ['vicio-cerveza', 'vicio-fernet', 'vicio-vino', 'vicio-alfajores', 'vicio-pizza', 'vicio-choripan', 'vicio-cenicero', 'vicio-papas', 'vicio-gaseosa'], False),
    (ORIG / 'objetos-sanos.jpg', 'escena', ['sano-agua', 'sano-mate', 'sano-mancuerna', 'sano-zapatillas', 'sano-ensalada', 'sano-manzana', 'sano-balanza', 'sano-toalla', 'sano-banana'], False),
    (ORIG / 'objetos-mugre.jpg', 'escena', ['mugre-salsa', None, None, 'mugre-migas', 'mugre-moscas', 'mugre-olor', None, 'mugre-mostaza', 'mugre-barro'], False),
    # La grasa, el café y la transpiración salieron rosados en la hoja original: se toman de la corrección
    # Esta hoja no respeta la grilla (las manchas son más grandes que una celda): se recorta por manchas,
    # de arriba a la izquierda hacia abajo a la derecha
    (ORIG / 'objetos-mugre-2.jpg', 'escena', ['mugre-grasa', 'mugre-cafe', 'mugre-transpiracion'], 'manchas'),
]


def recortar_fondo(img):
    """Misma regla que recortarFondo(): transparente donde min(r,b)-g > 30, borde suave hasta 120."""
    px = img.load()
    ancho, alto = img.size
    for y in range(alto):
        for x in range(ancho):
            r, g, b, a = px[x, y]
            m = min(r, b) - g
            if m <= 30:
                continue
            alfa = max(0.0, min(1.0, 1 - (m - 30) / 90))
            if alfa == 0:
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = (r - m, g, b - m, round(a * alfa))


def componentes(img, umbral=60):
    """Zonas conectadas de píxeles visibles: lista de (cantidad, x0, y0, x1, y1, píxeles)."""
    alfa = img.getchannel('A').load()
    ancho, alto = img.size
    visto = bytearray(ancho * alto)
    salida = []
    for y in range(alto):
        for x in range(ancho):
            k = y * ancho + x
            if visto[k] or alfa[x, y] < umbral:
                continue
            pila = [(x, y)]
            visto[k] = 1
            pix = []
            while pila:
                a, b = pila.pop()
                pix.append((a, b))
                for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    aa, bb = a + da, b + db
                    if 0 <= aa < ancho and 0 <= bb < alto:
                        kk = bb * ancho + aa
                        if not visto[kk] and alfa[aa, bb] >= umbral:
                            visto[kk] = 1
                            pila.append((aa, bb))
            xs = [p[0] for p in pix]
            ys = [p[1] for p in pix]
            salida.append((len(pix), min(xs), min(ys), max(xs), max(ys), pix))
    return salida


def procesar_celda(celda, con_rotulos):
    recortar_fondo(celda)
    comps = componentes(celda)
    if not comps:
        return None
    principal = max(comps, key=lambda c: c[0])
    borrar = []
    for c in comps:
        if c is principal:
            continue
        if c[0] < 12:                                   # ruido del JPEG
            borrar.append(c)
        elif con_rotulos and c[2] > principal[4] - 2:   # todo lo que está debajo del dibujo: el rótulo
            borrar.append(c)
        elif c[0] < principal[0] * 0.05 and (c[1] == 0 or c[2] == 0 or c[3] == celda.width - 1 or c[4] == celda.height - 1):
            borrar.append(c)                            # pedacito del ícono vecino que se coló en la celda
    px = celda.load()
    for c in borrar:
        for a, b in c[5]:
            px[a, b] = (0, 0, 0, 0)
    # el antialias del rótulo borrado puede quedar como píxeles casi transparentes: limpiar debajo del dibujo
    if con_rotulos:
        ancho, alto = celda.size
        for y in range(principal[4] + 3, alto):
            for x in range(ancho):
                px[x, y] = (0, 0, 0, 0)
    caja = celda.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if not caja:
        return None
    x0, y0, x1, y1 = caja
    m = 6
    recorte = celda.crop((max(0, x0 - m), max(0, y0 - m), min(celda.width, x1 + m), min(celda.height, y1 + m)))
    lado = max(recorte.size)
    lienzo = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    lienzo.paste(recorte, ((lado - recorte.width) // 2, (lado - recorte.height) // 2))
    return lienzo.resize((LADO, LADO), Image.LANCZOS)


def recortar_por_manchas(hoja, nombres, destino):
    """Para hojas sin grilla: cada mancha grande es un ícono, ordenadas por posición."""
    recortar_fondo(hoja)
    grandes = sorted(componentes(hoja), key=lambda c: -c[0])[:len(nombres)]
    grandes.sort(key=lambda c: c[1] + c[2])
    for nombre, c in zip(nombres, grandes):
        m = 12
        caja = (max(0, c[1] - m), max(0, c[2] - m), min(hoja.width, c[3] + m), min(hoja.height, c[4] + m))
        solo = Image.new('RGBA', hoja.size, (0, 0, 0, 0))
        hp, sp = hoja.load(), solo.load()
        for a, b in c[5]:                      # solo los píxeles de esta mancha, no las vecinas
            sp[a, b] = hp[a, b]
        celda = solo.crop(caja)
        lado = max(celda.size)
        lienzo = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
        lienzo.paste(celda, ((lado - celda.width) // 2, (lado - celda.height) // 2))
        lienzo.resize((LADO, LADO), Image.LANCZOS).save(destino / f'{nombre}.webp', 'WEBP', quality=88, method=6)
    return len(grandes)


def main():
    total = 0
    import sys
    filtro = sys.argv[1:]
    for archivo, carpeta, nombres, con_rotulos in HOJAS:
        if filtro and not any(f in archivo.name for f in filtro):
            continue
        if not archivo.exists():
            print(f'falta {archivo}')
            continue
        hoja = Image.open(archivo).convert('RGBA').resize((CELDA * 3, CELDA * 3), Image.LANCZOS)
        destino = SALIDA / carpeta
        destino.mkdir(parents=True, exist_ok=True)
        if con_rotulos == 'manchas':
            total += recortar_por_manchas(Image.open(archivo).convert('RGBA').resize((CELDA * 2, CELDA * 2), Image.LANCZOS), nombres, destino)
            print(f'{archivo.name} → {destino}')
            continue
        for i, nombre in enumerate(nombres):
            if not nombre:
                continue
            fila, col = divmod(i, 3)
            celda = hoja.crop((col * CELDA, fila * CELDA, (col + 1) * CELDA, (fila + 1) * CELDA))
            icono = procesar_celda(celda, con_rotulos)
            if icono is None:
                print(f'  ⚠ {nombre}: celda vacía')
                continue
            icono.save(destino / f'{nombre}.webp', 'WEBP', quality=88, method=6)
            total += 1
        print(f'{archivo.name} → {destino}')
    print(f'{total} íconos')


if __name__ == '__main__':
    main()
