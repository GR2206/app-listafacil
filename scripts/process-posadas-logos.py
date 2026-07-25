"""Procesa logos Posadas: quita fondo blanco (flood desde bordes), centra en 256x256."""

from __future__ import annotations

import os
from collections import deque

from PIL import Image

SRC = {
    "maxiconsumo": r"C:\Users\gino2\.cursor\projects\e-LISTAFACILAPP-lista-compras-scanner\assets\c__Users_gino2_AppData_Roaming_Cursor_User_workspaceStorage_53326fa3d049bc2609f691fa9f46a9f6_images_maxiconsumo-b241dc62-4f6c-45a5-951e-f40135fe6e9a.png",
    "vital": r"C:\Users\gino2\.cursor\projects\e-LISTAFACILAPP-lista-compras-scanner\assets\c__Users_gino2_AppData_Roaming_Cursor_User_workspaceStorage_53326fa3d049bc2609f691fa9f46a9f6_images_vital-863b5add-f45f-401f-b6fd-9f2f96340273.png",
    "yaguar": r"C:\Users\gino2\.cursor\projects\e-LISTAFACILAPP-lista-compras-scanner\assets\c__Users_gino2_AppData_Roaming_Cursor_User_workspaceStorage_53326fa3d049bc2609f691fa9f46a9f6_images_yaguar-b80543f0-a71a-480f-b814-030b11b47245.png",
    "california": r"C:\Users\gino2\.cursor\projects\e-LISTAFACILAPP-lista-compras-scanner\assets\c__Users_gino2_AppData_Roaming_Cursor_User_workspaceStorage_53326fa3d049bc2609f691fa9f46a9f6_images_California-ee5fdddb-5ed9-4dcc-89b0-e24dc1f54280.png",
}

OUT_DIR = r"E:\LISTAFACILAPP\lista-compras-scanner\assets\supermarkets"

# pad interno: logos anchos necesitan más margen para no tocar el borde del orbe
PAD = {
    "maxiconsumo": 36,
    "vital": 40,
    "yaguar": 40,
    "california": 42,
}


def nearly_bg(r: int, g: int, b: int, thr: int = 242) -> bool:
    return r >= thr and g >= thr and b >= thr


def flood_remove_bg(im: Image.Image, thr: int = 242) -> Image.Image:
    """Solo quita blanco conectado a los bordes (preserva blanco interno del logo)."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h or seen[y][x]:
            return
        r, g, b, a = px[x, y]
        if a == 0 or not nearly_bg(r, g, b, thr):
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
        r, g, b, _a = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            push(nx, ny)

    return im


def crop_alpha(im: Image.Image, pad: int = 2) -> Image.Image:
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


def process(name: str, src: str) -> str:
    im = Image.open(src)
    im = flood_remove_bg(im, thr=242)
    im = crop_alpha(im, pad=4)
    im = fit_square(im, 256, PAD[name])
    out = os.path.join(OUT_DIR, f"{name}.png")
    im.save(out, "PNG")
    return out


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, src in SRC.items():
        if not os.path.isfile(src):
            raise SystemExit(f"Falta fuente: {src}")
        out = process(name, src)
        print(f"OK {name} -> {out}")


if __name__ == "__main__":
    main()
