#!/usr/bin/env python3
"""Preprocesa las imágenes de Gemini del personaje: saca el fondo magenta (misma regla que
recortarFondo en www/js/personaje.js), borra la tele de e1-sillon, achica y guarda WebP con transparencia.
La camiseta queda verde: la app la pinta del equipo elegido (pintarCamiseta).

Uso: python3 tools/preprocesar-personaje.py [origen] [destino]
     (por defecto docs/personaje/originales → www/img/personaje)
Hace falta Pillow. Solo procesa los personajes; los demás .jpg se ignoran.
"""
import re
import sys
from pathlib import Path
from PIL import Image

ORIGEN = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/personaje/originales')
DESTINO = Path(sys.argv[2] if len(sys.argv) > 2 else 'www/img/personaje')
ANCHO_FINAL = 560          # 896 × 0,625; el alto sale en proporción (3:4 → 750)
CALIDAD = 88

# Solo se procesan los personajes (e1-…, e3-…, e5-…); cuartos y hojas de objetos van aparte.
ES_PERSONAJE = re.compile(r'^e[135]-')


def recortar_fondo(img):
    """Igual que recortarFondo(): transparente donde min(r,b)-g > 30, borde suave hasta 120."""
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
                px[x, y] = (r, g, b, 0)
                continue
            exceso = max(0, min(r, b) - g)
            px[x, y] = (r - exceso, g, b - exceso, round(a * alfa))


def procesar(src, nombre):
    img = Image.open(src).convert('RGBA')
    # Se achica primero (las de Gemini vienen de 896 o de 1792 de ancho, siempre 3:4): es mucho más
    # rápido y recortarFondo ya suaviza el borde mezclado con el magenta.
    alto_final = round(img.height * ANCHO_FINAL / img.width)
    img = img.resize((ANCHO_FINAL, alto_final), Image.LANCZOS)
    recortar_fondo(img)
    DESTINO.mkdir(parents=True, exist_ok=True)
    out = DESTINO / f'{nombre}.webp'
    img.save(out, 'WEBP', quality=CALIDAD, method=6)
    print(f'{src.name} → {out}  ({out.stat().st_size // 1024} KB)')


def main():
    for src in sorted(ORIGEN.glob('*.jpg')):
        if ES_PERSONAJE.match(src.stem):
            procesar(src, src.stem)


if __name__ == '__main__':
    main()
