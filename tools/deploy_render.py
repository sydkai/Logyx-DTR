"""Deploy Logyx DTR to Render."""
from __future__ import annotations

import json
import os
import secrets
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RENDER_ENV = ROOT.parent / "Logyx" / "render.env"
LOCAL_RENDER_ENV = ROOT / "render.env"
API_BASE = "https://api.render.com/v1"
REPO = "https://github.com/sydkai/Logyx-DTR"
SERVICE_NAME = "logyx-dtr"


def load_render_key() -> str:
    for path in (LOCAL_RENDER_ENV, RENDER_ENV):
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                if line.startswith("RENDER_API_KEY="):
                    return line.split("=", 1)[1].strip()
    return os.environ.get("RENDER_API_KEY", "")


def api(api_key: str, method: str, path: str, payload: dict | None = None):
    headers = {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(
        f"{API_BASE}{path}", data=data, headers=headers, method=method
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        print(f"HTTP {exc.code} {method} {path}")
        print(exc.read().decode("utf-8")[:2000])
        sys.exit(1)


def find_service(api_key: str) -> dict | None:
    _, services = api(api_key, "GET", "/services?limit=50")
    for item in services or []:
        service = item.get("service", item)
        if service.get("name") == SERVICE_NAME:
            return service
    return None


def create_service(api_key: str, owner_id: str, jwt_secret: str) -> dict:
    payload = {
        "type": "web_service",
        "name": SERVICE_NAME,
        "ownerId": owner_id,
        "repo": REPO,
        "branch": "main",
        "autoDeploy": "yes",
        "serviceDetails": {
            "runtime": "node",
            "plan": "free",
            "region": "singapore",
            "buildCommand": "bash build.sh",
            "startCommand": "cd server && node index.js",
            "envSpecificDetails": {"buildCommand": "bash build.sh", "startCommand": "cd server && node index.js"},
            "envVars": [
                {"key": "NODE_VERSION", "value": "20.18.0"},
                {"key": "NODE_ENV", "value": "production"},
                {"key": "HOST", "value": "0.0.0.0"},
                {"key": "JWT_SECRET", "value": jwt_secret},
                {"key": "CLIENT_ORIGIN", "value": f"https://{SERVICE_NAME}.onrender.com"},
                {"key": "SQLITE_PATH", "value": "/opt/render/project/src/data/logyx.db"},
            ],
        },
    }
    _, created = api(api_key, "POST", "/services", payload)
    return created.get("service", created)


def update_env_vars(api_key: str, service_id: str, jwt_secret: str) -> None:
    _, existing = api(api_key, "GET", f"/services/{service_id}/env-vars")
    merged = {}
    for item in existing or []:
        env = item.get("envVar", item)
        merged[env["key"]] = env.get("value", "")
    merged.update(
        {
            "NODE_VERSION": "20.18.0",
            "NODE_ENV": "production",
            "HOST": "0.0.0.0",
            "JWT_SECRET": jwt_secret,
            "CLIENT_ORIGIN": f"https://{SERVICE_NAME}.onrender.com",
            "SQLITE_PATH": "/opt/render/project/src/data/logyx.db",
        }
    )
    payload = [{"key": k, "value": v} for k, v in merged.items()]
    api(api_key, "PUT", f"/services/{service_id}/env-vars", payload)


def main() -> None:
    api_key = load_render_key()
    if not api_key:
        sys.exit("RENDER_API_KEY not found in render.env")

    jwt_secret = secrets.token_urlsafe(48)
    _, owners = api(api_key, "GET", "/owners?limit=5")
    owner_id = owners[0]["owner"]["id"]

    service = find_service(api_key)
    if service:
        service_id = service["id"]
        print(f"Updating existing service: {service_id}")
        api(
            api_key,
            "PATCH",
            f"/services/{service_id}",
            {
                "serviceDetails": {
                    "envSpecificDetails": {
                        "buildCommand": "bash build.sh",
                        "startCommand": "cd server && node index.js",
                    }
                }
            },
        )
        update_env_vars(api_key, service_id, jwt_secret)
    else:
        print("Creating Render service...")
        service = create_service(api_key, owner_id, jwt_secret)
        service_id = service["id"]

    api(api_key, "POST", f"/services/{service_id}/deploys", {})
    print(f"Deploy triggered for https://{SERVICE_NAME}.onrender.com")
    print(f"Dashboard: https://dashboard.render.com/web/{service_id}")


if __name__ == "__main__":
    main()
