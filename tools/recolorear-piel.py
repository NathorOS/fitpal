#!/usr/bin/env python3
"""Pasa la piel color durazno (piel humana) a la piel amarilla del personaje, conservando sombras y brillos.
Gemini a veces dibuja la piel color durazno; esto la corrige sin tocar el fondo magenta, la camiseta
verde, el pelo ni el contorno.

Uso: python3 tools/recolorear-piel.py entrada.jpg salida.jpg
"""
import colorsys
import sys
from PIL import Image

TONO_AMARILLO = 48 / 360


def recolorear(origen, destino):
    img = Image.open(origen).convert('RGB')
    px = img.load()
    ancho, alto = img.size
    cambiados = 0
    for y in range(alto):
        for x in range(ancho):
            r, g, b = px[x, y]
            if r < g or g < b:          # la piel durazno cumple r > g > b
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if 15 / 360 <= h <= 42 / 360 and 0.18 <= s <= 0.72 and v >= 0.42:
                t = min(1.0, (s - 0.18) / 0.3)     # borde suave de la máscara
                h2 = h + (TONO_AMARILLO - h) * t
                s2 = s + (min(1.0, s * 1.95 + 0.1) - s) * t
                r2, g2, b2 = colorsys.hsv_to_rgb(h2, s2, v)
                px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255))
                cambiados += 1
    img.save(destino, quality=93)
    return cambiados / (ancho * alto)


if __name__ == '__main__':
    print(f'{recolorear(sys.argv[1], sys.argv[2]) * 100:.1f} % de píxeles recoloreados')
