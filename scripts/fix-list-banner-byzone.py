"""Actualiza list_banner: general sin imagen remota; byZone listo por ciudad (null = default local)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
import subprocess

GIST_ID = "385d2f581dfeea93ee3c35ddcd1314ed"
OUT = r"E:\LISTAFACILAPP\lista-compras-scanner\tmp-banners-app.json"

MAIL = "mailto:listafacilgr@gmail.com"

# Plantilla: imageUrl null → app muestra el banner local programado.
# Cuando vendas una ciudad, poné solo esa clave con imageUrl real, ej:
#   "rosario": { "imageUrl": "https://.../ecosueno.png", "targetUrl": "https://..." }
ZONE_KEYS = [
    "rosario",
    "santa-fe",
    "caba",
    "la-plata",
    "mar-del-plata",
    "bahia-blanca",
    "cordoba",
    "rio-cuarto",
    "mendoza",
    "san-juan",
    "san-luis",
    "tucuman",
    "salta",
    "neuquen",
    "parana",
    "resistencia",
    "posadas",
    "default",
]

# Publicidad vendida por zona (solo entradas con imagen real).
# Vacío = todas las zonas usan el banner general local de la app.
LIST_BY_ZONE_ADS: dict[str, dict[str, str | None]] = {}


def empty_zone() -> dict[str, str | None]:
    return {"imageUrl": None, "targetUrl": MAIL}


def main() -> None:
    raw = subprocess.check_output(
        ["gh", "gist", "view", GIST_ID, "-f", "banners-app.json"],
        text=True,
    )
    data = json.loads(raw)

    by_zone = {key: empty_zone() for key in ZONE_KEYS}
    for key, override in LIST_BY_ZONE_ADS.items():
        by_zone[key] = {
            "imageUrl": override.get("imageUrl"),
            "targetUrl": override.get("targetUrl") or MAIL,
        }

    data["banners"]["list_banner"] = {
        "enabled": True,
        # null = banner general programado en la app (ListCyberBanner / sin señal)
        "imageUrl": None,
        "targetUrl": MAIL,
        "byZone": by_zone,
    }

    data["updatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    data["version"] = int(data.get("version") or 3) + 1

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("OK version", data["version"])
    print("list base imageUrl", data["banners"]["list_banner"]["imageUrl"])
    print("list byZone ads", list(LIST_BY_ZONE_ADS))
    print("zones", len(by_zone))


if __name__ == "__main__":
    main()
