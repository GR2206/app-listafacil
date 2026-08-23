"""Actualiza app-update.json del Gist tras una build EAS (avisos in-app).

Uso:
  python scripts/bump-app-update-gist.py 31
  python scripts/bump-app-update-gist.py 31 --force
  python scripts/bump-app-update-gist.py 31 --url https://expo.dev/artifacts/eas/....aab
"""

from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

GIST_ID = "385d2f581dfeea93ee3c35ddcd1314ed"
FILE_NAME = "app-update.json"
DEFAULT_URL = "https://play.google.com/store/apps/details?id=com.listafacil.app"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("version_code", type=int, help="androidVersionCode de la build nueva")
    parser.add_argument(
        "--min",
        type=int,
        default=None,
        help="androidMinVersionCode (default: deja el actual o version-1)",
    )
    parser.add_argument("--force", action="store_true", help="forceUpdate=true")
    parser.add_argument("--url", default=DEFAULT_URL, help="URL del botón Actualizar")
    args = parser.parse_args()

    raw = subprocess.check_output(
        ["gh", "gist", "view", GIST_ID, "-f", FILE_NAME],
        text=True,
    )
    data = json.loads(raw)

    prev_min = data.get("androidMinVersionCode")
    data["androidLatestVersionCode"] = args.version_code
    data["androidMinVersionCode"] = (
        args.min if args.min is not None else (prev_min if isinstance(prev_min, int) else max(1, args.version_code - 1))
    )
    data["forceUpdate"] = bool(args.force)
    data["title"] = data.get("title") or "Nueva versión de Lista Fácil"
    data["message"] = (
        data.get("message")
        or "Hay una actualización disponible. Tocá Actualizar para instalarla."
    )
    data["updateUrl"] = args.url

    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False) as tmp:
        json.dump(data, tmp, ensure_ascii=False, indent=2)
        tmp.write("\n")
        tmp_path = tmp.name

    subprocess.check_call(
        ["gh", "gist", "edit", GIST_ID, "--filename", FILE_NAME, tmp_path]
    )
    Path(tmp_path).unlink(missing_ok=True)

    print("OK app-update.json")
    print(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
