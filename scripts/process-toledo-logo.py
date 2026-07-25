"""Reprocesa Toledo con silueta blanca más visible."""

from __future__ import annotations

import os
from collections import deque

from PIL import Image, ImageFilter

SRC = r"C:\Users\gino2\.cursor\projects\e-LISTAFACILAPP-lista-compras-scanner\assets\c__Users_gino2_AppData_Roaming_Cursor_User_workspaceStorage_53326fa3d049bc2609f691fa9f46a9f6_images_Toledo-44632eb6-fdd6-4ea3-b5dd-5db2fddc9d09.png"
OUT = r"E:\LISTAFACILAPP\lista-compras-scanner\assets\supermarkets\toledo.png"
NAVY = (11, 31, 63)


def is_navy_bg(r: int, g: int, b: int) -> bool:
    return (b >= r and b >= g and r < 70 and g < 90 and b < 120) or (
        r < 40 and g < 50 and b < 70
    )


def flood_remove_navy(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h or seen[y][x]:
            return
        r, g, b, a = px[x, y]
        if a == 0 or not is_navy_bg(r, g, b):
            return
        seen[y][x] = True
        q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            push(nx, ny)
    return im


def crop_alpha(im: Image.Image, pad: int = 6) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    return im.crop(
        (
            max(0, x0 - pad),
            max(0, y0 - pad),
            min(im.width, x1 + pad),
            min(im.height, y1 + pad),
        )
    )


def dark_with_white_outline(im: Image.Image) -> Image.Image:
    alpha = im.split()[-1]
    # Letras originales (blancas) → máscara
    glyph = alpha.point(lambda a: 255 if a > 30 else 0)

    # Contorno más grueso y visible (MaxFilter impar)
    ring = glyph.filter(ImageFilter.MaxFilter(9))
    gp = glyph.load()
    rp = ring.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if gp[x, y] > 0:
                rp[x, y] = 0

    canvas = Image.new("RGBA", im.size, (0, 0, 0, 0))
    white = Image.new("RGBA", im.size, (255, 255, 255, 255))
    white.putalpha(ring)
    canvas = Image.alpha_composite(canvas, white)

    navy = Image.new("RGBA", im.size, (*NAVY, 255))
    navy.putalpha(glyph)
    return Image.alpha_composite(canvas, navy)


def fit_square(im: Image.Image, size: int = 256, pad: int = 44) -> Image.Image:
    im = im.copy()
    im.thumbnail((size - pad, size - pad), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
    return canvas


def main() -> None:
    im = Image.open(SRC)
    im = flood_remove_navy(im)
    im = crop_alpha(im)
    im = dark_with_white_outline(im)
    im = crop_alpha(im, pad=8)
    im = fit_square(im, 256, pad=44)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT, "PNG")
    whiteish = sum(1 for r, g, b, a in im.getdata() if a > 100 and r > 230)
    navy = sum(1 for r, g, b, a in im.getdata() if a > 100 and r < 40 and b > 40)
    print("OK", OUT, "white", whiteish, "navy", navy)


if __name__ == "__main__":
    main()
