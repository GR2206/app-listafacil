"""Procesa logo Cooperativa Obrera: sin fondo, sin leyenda inferior, centrado 256."""

from __future__ import annotations

import os
from collections import deque

from PIL import Image

SRC = r"C:\Users\gino2\.cursor\projects\e-LISTAFACILAPP-lista-compras-scanner\assets\c__Users_gino2_AppData_Roaming_Cursor_User_workspaceStorage_53326fa3d049bc2609f691fa9f46a9f6_images_cooperativa_obrera-475a43c5-cbfa-40a5-b2ba-9f7f54b6bc60.png"
OUT = r"E:\LISTAFACILAPP\lista-compras-scanner\assets\supermarkets\cooperativa-obrera.png"


def flood_remove_black(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def is_bg(r: int, g: int, b: int, a: int) -> bool:
        return a < 10 or (r < 40 and g < 40 and b < 40)

    def push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h or seen[y][x]:
            return
        r, g, b, a = px[x, y]
        if not is_bg(r, g, b, a):
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
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            push(nx, ny)
    return im


def main() -> None:
    im = flood_remove_black(Image.open(SRC))
    w, h = im.size
    px = im.load()
    red_ymax = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 40 and r > 150 and r > g + 40 and r > b + 40:
                red_ymax = max(red_ymax, y)
    cut = min(h, red_ymax + 8)
    bbox = im.getbbox()
    assert bbox
    im = im.crop((bbox[0], bbox[1], bbox[2], min(bbox[3], cut)))
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and r < 35 and g < 35 and b < 35:
                px[x, y] = (0, 0, 0, 0)
    bbox = im.getbbox()
    assert bbox
    im = im.crop(bbox)

    size, pad = 256, 22
    thumb = im.copy()
    thumb.thumbnail((size - pad, size - pad), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(thumb, ((size - thumb.width) // 2, (size - thumb.height) // 2), thumb)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    canvas.save(OUT)
    print("OK", OUT)


if __name__ == "__main__":
    main()
