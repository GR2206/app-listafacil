"""Repara banners-app.json del Gist (newline ilegal en targetUrl de Mendoza)."""

from __future__ import annotations

import json
import re
import subprocess

GIST_ID = "385d2f581dfeea93ee3c35ddcd1314ed"
OUT = r"E:\LISTAFACILAPP\lista-compras-scanner\tmp-banners-app.json"


def sanitize_json_control_chars(raw: str) -> str:
    """Reemplaza control chars ilegales DENTRO de strings JSON."""
    out: list[str] = []
    in_str = False
    esc = False
    for ch in raw:
        if in_str:
            if esc:
                out.append(ch)
                esc = False
            elif ch == "\\":
                out.append(ch)
                esc = True
            elif ch == '"':
                out.append(ch)
                in_str = False
            elif ch == "\n":
                out.append(" ")
            elif ch == "\r":
                continue
            elif ch == "\t":
                out.append(" ")
            else:
                out.append(ch)
        else:
            if ch == '"':
                in_str = True
            out.append(ch)
    return "".join(out)


def clean_url(value: object) -> object:
    if not isinstance(value, str):
        return value
    return re.sub(r"\s+", "", value.strip())


def main() -> None:
    raw = subprocess.check_output(
        ["gh", "gist", "view", GIST_ID, "-f", "banners-app.json"],
        text=True,
    )
    data = json.loads(sanitize_json_control_chars(raw))

    top = data["banners"]["top_banner"]
    mendoza = top["byZone"]["mendoza"]
    mendoza["targetUrl"] = clean_url(mendoza.get("targetUrl") or "")
    if not mendoza.get("imageUrl"):
        mendoza["imageUrl"] = (
            "https://raw.githubusercontent.com/GR2206/app-listafacil/refs/heads/main/"
            "photo_2026-07-25_10-36-57.jpg"
        )

    # Limpiar todos los targetUrl por las dudas
    for zone_cfg in top.get("byZone", {}).values():
        if isinstance(zone_cfg, dict) and "targetUrl" in zone_cfg:
            zone_cfg["targetUrl"] = clean_url(zone_cfg["targetUrl"])

    list_banner = data["banners"].get("list_banner") or {}
    for zone_cfg in (list_banner.get("byZone") or {}).values():
        if isinstance(zone_cfg, dict) and "targetUrl" in zone_cfg:
            zone_cfg["targetUrl"] = clean_url(zone_cfg["targetUrl"])

    data["updatedAt"] = "2026-07-25T10:50:00.000Z"
    data["version"] = int(data.get("version") or 2) + 1

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    json.load(open(OUT, encoding="utf-8"))
    print("OK", OUT)
    print("version", data["version"])
    print("mendoza", data["banners"]["top_banner"]["byZone"]["mendoza"])


if __name__ == "__main__":
    main()
