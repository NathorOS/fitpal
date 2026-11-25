#!/usr/bin/env python3
"""Recorta las hojas de poses del entrenador (del Giudice) y del chef en imágenes sueltas con fondo transparente.

Las hojas no respetan una grilla exacta: cada pose se toma de una zona (en fracciones de la hoja),
se saca el fondo magenta con la misma regla que recortarFondo() y se recorta al contenido.
Todas las poses de una hoja salen a la MISMA escala y con la misma altura de lienzo, con los pies
abajo: así en la app se muestran con una altura fija y el personaje no cambia de tamaño entre poses.

Uso: python3 tools/recortar-ayudantes.py    (lee docs/personaje/originales/ y escribe en www/img/ayudantes/)
Hace falta Pillow.
"""
import importlib.util
from pathlib import Path
from PIL import Image

_spec = importlib.util.spec_from_file_location('iconos', Path(__file__).with_name('recortar-iconos.py'))
iconos = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(iconos)

ORIG = Path('docs/personaje/originales')
SALIDA = Path('www/img/ayudantes')
ALTO = 480          # alto final del lienzo de cada pose
TRABAJO = 0.5       # se trabaja a la mitad del tamaño original (más rápido)

# (hoja, prefijo, [(nombre, (x0, y0, x1, y1) en fracciones de la hoja)])
HOJAS = [
    (ORIG / 'entrenador/entrenador-poses.jpg', 'entrenador', [
        ('saludando',     (0.00, 0.00, 0.34, 0.50)),
        ('silbato',       (0.34, 0.00, 0.67, 0.50)),
        ('reloj',         (0.67, 0.00, 1.00, 0.50)),
        ('decepcionado',  (0.00, 0.50, 0.34, 1.00)),
        ('aplaudiendo',   (0.34, 0.50, 0.67, 1.00)),
        ('festejando',    (0.67, 0.50, 1.00, 1.00)),
    ]),
    (ORIG / 'chef/chef-poses.jpg', 'chef', [
        ('saludando',     (0.00, 0.00, 0.26, 0.51)),
        ('plato',         (0.26, 0.00, 0.51, 0.51)),
        ('exquisito',     (0.51, 0.00, 0.755, 0.51)),
        ('exquisito-2',   (0.755, 0.00, 1.00, 0.51)),
        ('pensando',      (0.00, 0.51, 0.33, 1.00)),
        ('eso-no',        (0.33, 0.51, 0.70, 1.00)),
        ('explicando',    (0.70, 0.51, 1.00, 1.00)),
    ]),
]


def figura(hoja, caja):
    """Recorta la zona, saca el fondo y deja solo las manchas grandes (la figura y lo que tiene en la mano)."""
    w, h = hoja.size
    zona = hoja.crop((round(caja[0] * w), round(caja[1] * h), round(caja[2] * w), round(caja[3] * h)))
    iconos.recortar_fondo(zona)
    comps = iconos.componentes(zona)
    if not comps:
        return None
    mayor = max(c[0] for c in comps)
    px = zona.load()
    for c in comps:
        # ruido del JPEG o pedacitos de la pose vecina que se colaron por el borde de la zona
        borde = c[1] == 0 or c[2] == 0 or c[3] == zona.width - 1 or c[4] == zona.height - 1
        if c[0] < 150 or (borde and c[0] < mayor * 0.1):
            for a, b in c[5]:
                px[a, b] = (0, 0, 0, 0)
    caja = zona.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return zona.crop(caja) if caja else None


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    total = 0
    for archivo, prefijo, poses in HOJAS:
        hoja = Image.open(archivo).convert('RGBA')
        hoja = hoja.resize((round(hoja.width * TRABAJO), round(hoja.height * TRABAJO)), Image.LANCZOS)
        figuras = [(n, figura(hoja, c)) for n, c in poses]
        alto_max = max(f.height for _, f in figuras if f)
        escala = (ALTO - 8) / alto_max
        for nombre, f in figuras:
            if f is None:
                print(f'  ⚠ {prefijo}-{nombre}: vacía')
                continue
            f = f.resize((round(f.width * escala), round(f.height * escala)), Image.LANCZOS)
            lienzo = Image.new('RGBA', (f.width + 8, ALTO), (0, 0, 0, 0))
            lienzo.paste(f, (4, ALTO - 4 - f.height))         # pies abajo
            lienzo.save(SALIDA / f'{prefijo}-{nombre}.webp', 'WEBP', quality=88, method=6)
            total += 1
        print(f'{archivo.name} → {SALIDA}')
    print(f'{total} poses')


if __name__ == '__main__':
    main()
