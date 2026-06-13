#!/usr/bin/env python3
"""
Quita marcas de agua visibles de IA (p. ej. Gemini) en fondos verticales.

Estrategia:
1. Modo selective (default): reemplaza solo pixeles brillantes en la zona inferior
   derecha, clonando textura oscura desde una franja limpia a la izquierda.
2. Modo patch: cubre un rectangulo fijo clonando un bloque adyacente (fallback).

Uso:
  python scripts/remove-background-watermark.py
  python scripts/remove-background-watermark.py --mode patch --width 108 --height 82
  python scripts/remove-background-watermark.py --input assets/home/foo.png --output assets/home/foo.png
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image

DEFAULT_INPUT = Path(__file__).resolve().parent.parent / "assets/home/home-main-background.png"
DEFAULT_OUTPUT = DEFAULT_INPUT


def _brightness(rgb: np.ndarray) -> np.ndarray:
    return rgb[:, :, 0].astype(np.float32) + rgb[:, :, 1].astype(np.float32) + rgb[:, :, 2].astype(np.float32)


def remove_selective(
    pixels: np.ndarray,
    y_start: int = 860,
    x_start: int = 280,
    src_x_start: int = 20,
    src_x_end: int = 130,
    threshold: int = 38,
) -> np.ndarray:
    height, width = pixels.shape[:2]
    result = pixels.copy()

    for y in range(y_start, height):
        for x in range(x_start, width):
            pixel = result[y, x]
            bright = int(pixel[0]) + int(pixel[1]) + int(pixel[2])
            if bright > threshold:
                span = src_x_end - src_x_start
                sx = src_x_start + ((x - x_start) % span)
                result[y, x] = result[y, sx]

    return result


def remove_patch(
    pixels: np.ndarray,
    wm_width: int = 108,
    wm_height: int = 82,
    src_gap: int = 24,
    blend_cols: int = 10,
) -> np.ndarray:
    result = pixels.copy()
    height, width = result.shape[:2]

    y0 = height - wm_height
    x0 = width - wm_width
    src_x0 = max(0, x0 - wm_width - src_gap)

    patch = result[y0:height, src_x0 : src_x0 + wm_width].copy()
    if patch.shape[1] < wm_width:
        repeat = (wm_width // patch.shape[1]) + 1
        patch = np.tile(patch, (1, repeat, 1))[:, :wm_width]

    result[y0:height, x0 : x0 + wm_width] = patch

    for i in range(blend_cols):
        alpha = i / blend_cols
        col = x0 + i
        if col < width:
            result[y0:height, col] = (
                result[y0:height, col].astype(np.float32) * (1 - alpha)
                + patch[:, i].astype(np.float32) * alpha
            ).astype(np.uint8)

    return result


def remove_corner_watermark(
    input_path: Path,
    output_path: Path,
    mode: str = "selective",
    wm_width: int = 108,
    wm_height: int = 82,
    src_gap: int = 24,
    blend_cols: int = 10,
    threshold: int = 38,
) -> None:
    image = Image.open(input_path).convert("RGB")
    pixels = np.array(image, dtype=np.uint8)

    if mode == "patch":
        result = remove_patch(pixels, wm_width, wm_height, src_gap, blend_cols)
    else:
        result = remove_selective(pixels, threshold=threshold)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(result).save(output_path, optimize=True)

    height, width = result.shape[:2]
    corner = result[height - 90 :, width - 110 :]
    bright = _brightness(corner)
    print(
        f"Guardado: {output_path} ({width}x{height}) | "
        f"esquina max={bright.max():.0f} pix>45={int(np.sum(bright > 45))}"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Eliminar marca de agua en esquina inferior derecha.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="PNG de entrada")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="PNG de salida")
    parser.add_argument(
        "--mode",
        choices=("selective", "patch"),
        default="selective",
        help="selective=reemplaza pixeles brillantes; patch=cubre rectangulo",
    )
    parser.add_argument("--width", type=int, default=108, help="Ancho del parche (modo patch)")
    parser.add_argument("--height", type=int, default=82, help="Alto del parche (modo patch)")
    parser.add_argument("--gap", type=int, default=24, help="Separacion del parche fuente (modo patch)")
    parser.add_argument("--blend", type=int, default=10, help="Columnas de mezcla (modo patch)")
    parser.add_argument("--threshold", type=int, default=38, help="Umbral de brillo (modo selective)")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    remove_corner_watermark(
        input_path=args.input,
        output_path=args.output,
        mode=args.mode,
        wm_width=args.width,
        wm_height=args.height,
        src_gap=args.gap,
        blend_cols=args.blend,
        threshold=args.threshold,
    )
