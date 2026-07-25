"""Actualiza list_banner: byZone solo con publicidad real; general = sin imagen remota."""

from __future__ import annotations

import json
import subprocess

GIST_ID = "385d2f581dfeea93ee3c35ddcd1314ed"
OUT = r"E:\LISTAFACILAPP\lista-compras-scanner\tmp-banners-app.json"

# Plantilla vacía: cuando vendas una ciudad, agregás solo esa clave en byZone.
# Ejemplo:
#   "rosario": { "imageUrl": "https://.../lista-rosario.png", "targetUrl": "https://..." }
LIST_BY_ZONE_ADS: dict[str, dict[str, str]] = {
    # Por ahora ninguna ciudad tiene publicidad propia de lista.
    # El general programado (list_banner_300x50) se muestra automáticamente.
}


def main() -> None:
    raw = subprocess.check_output(
        ["gh", "gist", "view", GIST_ID, "-f", "banners-app.json"],
        text=True,
    )
    data = json.loads(raw)

    data["banners"]["list_banner"] = {
        "enabled": True,
        # null = banner general programado en la app (ListCyberBanner)
        "imageUrl": None,
        "targetUrl": "mailto:listafacilgr@gmail.com",
        "byZone": LIST_BY_ZONE_ADS,
    }

    data["updatedAt"] = "2026-07-25T11:05:00.000Z"
    data["version"] = int(data.get("version") or 3) + 1

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("OK version", data["version"])
    print("list byZone ads", list(LIST_BY_ZONE_ADS))
    print("preserved top mendoza", data["banners"]["top_banner"]["byZone"]["mendoza"]["imageUrl"][-40:])


if __name__ == "__main__":
    main()
