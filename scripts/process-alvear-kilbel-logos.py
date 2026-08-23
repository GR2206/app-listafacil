"""Procesa logos Alvear / Kilbel: quita fondo exterior, centra en 256x256 para orbe."""

from __future__ import annotations

import os
from collections import deque

from PIL import Image

ASSETS = r"C:\Users\gino2\.cursor\projects\e-LISTAFACILAPP-lista-compras-scanner\assets"
OUT_DIR = r"E:\LISTAFACILAPP\lista-compras-scanner\assets\supermarkets"

SRC = {
    "alvear": os.path.join(
        ASSETS,
        "c__Users_gino2_AppData_Roaming_Cursor_User_workspaceStorage_53326fa3d049bc2609f691fa9f46a9f6_images_alvear-57dc5c69-23a3-45bc-a8f8-059d6d4ab154.png",
    ),
    "kilbel": os.path.join(
        ASSETS,
        "c__Users_gino2_AppData_Roaming_Cursor_User_workspaceStorage_53326fa3d049bc2609f691fa9f46a9f6_images_kilbel-dd6e2a5e-9b49-4d4b-9b64-a6a13627a42c.png",
    ),
}

# Margen interno: wordmarks horizontales / badge Alvear
PAD = {
    "alvear": 40,
    "kilbel": 28,
}


def nearly_white(r: int, g: int, b: int, thr: int = 235) -> bool:
    return r >= thr and g >= thr and b >= thr


def nearly_green_bg(r: int, g: int, b: int) -> bool:
    """Verde oscuro del canvas exterior de Kilbel."""
    return g > r + 15 and g > b + 10 and g < 120 and r < 70 and b < 70


def flood_remove(im: Image.Image, pred) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h or seen[y][x]:
            return
        r, g, b, a = px[x, y]
        if a == 0 or not pred(r, g, b):
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


def crop_alpha(im: Image.Image, pad: int = 4) -> Image.Image:
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


def fit_square(im: Image.Image, size: int, pad: int) -> Image.Image:
    im = im.copy()
    max_side = size - pad
    im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
    return canvas


def process_alvear(src: str) -> Image.Image:
    # Quita canvas blanco; conserva badge naranja + tipografía blanca.
    im = flood_remove(Image.open(src), nearly_white)
    return crop_alpha(im, pad=6)


def process_kilbel(src: str) -> Image.Image:
    # Quita verde exterior; conserva círculo marca (texto + arco).
    im = flood_remove(Image.open(src), nearly_green_bg)
    # Por si quedó halo claro en esquinas
    im = flood_remove(im, nearly_white)
    return crop_alpha(im, pad=4)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    processors = {"alvear": process_alvear, "kilbel": process_kilbel}
    for name, fn in processors.items():
        im = fn(SRC[name])
        im = fit_square(im, 256, PAD[name])
        out = os.path.join(OUT_DIR, f"{name}.png")
        im.save(out, "PNG")
        opaque = sum(1 for *_, a in im.getdata() if a > 20)
        print("OK", name, out, "opaque", opaque)


if __name__ == "__main__":
    main()
