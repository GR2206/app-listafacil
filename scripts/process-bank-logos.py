"""Procesa logos de bancos/billeteras → PNG 256x256 con fondo transparente."""

from __future__ import annotations

import glob
import os

from PIL import Image, ImageDraw

SRC = r"C:\Users\gino2\.cursor\projects\e-LISTAFACILAPP-lista-compras-scanner\assets"
OUT = r"E:\LISTAFACILAPP\lista-compras-scanner\assets\banks"

# (substring en filename, output, modo)
JOBS = [
    ("images_coinag-", "coinag.png", "white_bg"),
    ("images_hipotecario-", "hipotecario.png", "white_bg"),
    ("images_ICBC-", "icbc.png", "white_bg"),
    ("images_Santander-", "santander.png", "white_bg"),
    ("images_personalpay-", "personalpay.png", "white_corners"),
    ("images_Galicia-", "galicia.png", "white_corners"),
    ("images_uala-529", "uala.png", "white_bg"),
    ("images_Mercadopago-", "mercadopago.png", "white_bg"),
    ("images_municipal-", "municipal.png", "white_corners"),
    ("images_photo_7_2026-07-18_21-32-06-895", "nacion.png", "white_bg"),
    ("images_naranjaX-", "naranjax.png", "white_bg"),
    ("images_santafe-", "santafe.png", "circular_keep"),
    ("images_Supervielle-", "supervielle.png", "white_bg"),
    ("images_macro-ef", "macro.png", "white_bg"),
    # extras previos / alias
    ("images_photo_3_2026-07-18", "modo.png", "white_corners"),
    ("images_photo_4_2026-07-18", "bna-plus.png", "circular_keep"),
    ("images_photo_9_2026-07-18", "modo-purple.png", "white_corners"),
]


def find_src(token: str) -> str | None:
    matches = [
        p
        for p in glob.glob(os.path.join(SRC, "*" + token + "*"))
        if p.lower().endswith(".png")
    ]
    return matches[0] if matches else None


def nearly_white(r: int, g: int, b: int, thr: int = 248) -> bool:
    return r >= thr and g >= thr and b >= thr


def crop_alpha(im: Image.Image) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    pad = 4
    return im.crop(
        (
            max(0, x0 - pad),
            max(0, y0 - pad),
            min(im.width, x1 + pad),
            min(im.height, y1 + pad),
        )
    )


def fit_square(im: Image.Image, size: int = 256) -> Image.Image:
    im = im.copy()
    im.thumbnail((size - 20, size - 20), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
    return canvas


def process_white_bg(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _a = px[x, y]
            if nearly_white(r, g, b):
                px[x, y] = (r, g, b, 0)
            elif r > 235 and g > 235 and b > 235:
                alpha = max(0, 255 - int((r + g + b) / 3 - 220) * 8)
                px[x, y] = (r, g, b, alpha)
    return crop_alpha(im)


def process_circular_keep(im: Image.Image) -> Image.Image:
    im = process_white_bg(im)
    side = max(im.width, im.height)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    mask = Image.new("L", (side, side), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((1, 1, side - 2, side - 2), fill=255)
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.paste(square, (0, 0), mask)
    return out


def process_green_keep_white(im: Image.Image) -> Image.Image:
    """Logo blanco sobre verde (Santa Fe / BNA+ style) → blanco s/fondo."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _a = px[x, y]
            if nearly_white(r, g, b, thr=215):
                px[x, y] = (255, 255, 255, 255)
            elif g > 80 and g >= r + 10:
                px[x, y] = (0, 0, 0, 0)
            elif g > 70 and r < 200:
                px[x, y] = (0, 0, 0, 0)
    return crop_alpha(im)


HANDLERS = {
    "white_bg": process_white_bg,
    "white_corners": process_white_bg,
    "circular_keep": process_circular_keep,
    "green_keep_white": process_green_keep_white,
}


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for token, out_name, mode in JOBS:
        src = find_src(token)
        if not src:
            print("MISSING", token)
            continue
        im = Image.open(src)
        processed = HANDLERS[mode](im)
        final = fit_square(processed, 256)
        dest = os.path.join(OUT, out_name)
        final.save(dest, "PNG")
        print("OK", out_name, "<-", os.path.basename(src))

    print("files:", sorted(os.listdir(OUT)))


if __name__ == "__main__":
    main()
