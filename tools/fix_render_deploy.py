"""Fix Logyx DTR Render deploy: env vars, build command, redeploy."""
from __future__ import annotations

import json
import secrets
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RENDER_ENV = ROOT.parent / "Logyx" / "render.env"
SERVICE_ID = "srv-d8pl8fgg4nts7383fk40"
API_BASE = "https://api.render.com/v1"


def load_key() -> str:
    for line in RENDER_ENV.read_text(encoding="utf-8").splitlines():
        if line.startswith("RENDER_API_KEY="):
            return line.split("=", 1)[1].strip()
    sys.exit("RENDER_API_KEY not found")


def api(key: str, method: str, path: str, payload: dict | None = None):
    headers = {"Authorization": f"Bearer {key}", "Accept": "application/json"}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(f"{API_BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        print(f"HTTP {exc.code} {method} {path}")
        print(exc.read().decode("utf-8")[:2000])
        sys.exit(1)


def main() -> None:
    key = load_key()
    jwt = secrets.token_urlsafe(48)

    build_command = (
        "export ELECTRON_SKIP_BINARY_DOWNLOAD=1 && "
        "cd server && npm install && "
        "cd ../client && rm -rf node_modules && npm install --include=dev && npm run build && "
        "mkdir -p ../data"
    )

    api(
        key,
        "PATCH",
        f"/services/{SERVICE_ID}",
        {
            "serviceDetails": {
                "envSpecificDetails": {
                    "buildCommand": build_command,
                    "startCommand": "cd server && node index.js",
                }
            }
        },
    )
    print("Updated build command")

    env_vars = [
        {"key": "NODE_VERSION", "value": "22.12.0"},
        {"key": "NODE_ENV", "value": "production"},
        {"key": "HOST", "value": "0.0.0.0"},
        {"key": "JWT_SECRET", "value": jwt},
        {"key": "CLIENT_ORIGIN", "value": "https://logyx-dtr.onrender.com"},
        {"key": "SQLITE_PATH", "value": "/opt/render/project/src/data/logyx.db"},
    ]
    api(key, "PUT", f"/services/{SERVICE_ID}/env-vars", env_vars)
    print("Set environment variables")

    _, deploy = api(key, "POST", f"/services/{SERVICE_ID}/deploys", {})
    deploy_id = (deploy or {}).get("id")
    print(f"Deploy triggered: {deploy_id}")
    print("URL: https://logyx-dtr.onrender.com")


if __name__ == "__main__":
    main()
