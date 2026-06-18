"""Sync Logyx DTR employee roster from local SQLite to Render."""
from __future__ import annotations

import json
import sqlite3
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL_DB = ROOT / "data" / "logyx.db"
RENDER_ENV = ROOT.parent / "Logyx" / "render.env"
BASE_URL = "https://logyx-dtr.onrender.com/api"
LOGIN = {
    "email": "christopherrodriguez@magallonesgroup.com",
    "password": "naba6819",
}

EMP_FIELDS = (
    "emp_id", "first_name", "middle_name", "surname", "initials",
    "dob", "age", "gender", "civil_status", "blood_type",
    "present_address", "permanent_address", "mobile", "email", "corp_email",
    "hired_date", "share", "position", "title_initials", "emp_status",
)


def api(method: str, path: str, token: str | None = None, payload: dict | None = None):
    headers = {"Accept": "application/json"}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        try:
            detail = json.loads(body)
        except json.JSONDecodeError:
            detail = {"error": body[:300]}
        return exc.code, detail


def load_local_employees() -> list[dict]:
    if not LOCAL_DB.exists():
        sys.exit(f"Local database not found: {LOCAL_DB}")
    conn = sqlite3.connect(LOCAL_DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        f"SELECT {', '.join(EMP_FIELDS)} FROM employees ORDER BY emp_id"
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def main() -> None:
    employees = load_local_employees()
    print(f"Local roster: {len(employees)} employees")

    status, login = api("POST", "/auth/login", payload=LOGIN)
    if status != 200 or not login or not login.get("token"):
        sys.exit(f"Login failed ({status}): {login}")

    token = login["token"]
    status, remote = api("GET", "/employees", token=token)
    if status != 200:
        sys.exit(f"Could not list remote employees ({status}): {remote}")

    remote_ids = {e["emp_id"] for e in remote}
    inserted = updated = failed = 0

    for emp in employees:
        body = {k: emp.get(k) for k in EMP_FIELDS}
        if emp["emp_id"] in remote_ids:
            status, result = api("PUT", f"/employees/{emp['emp_id']}", token=token, payload=body)
            if status == 200:
                updated += 1
            else:
                failed += 1
                print(f"UPDATE failed {emp['emp_id']}: {result}")
        else:
            status, result = api("POST", "/employees", token=token, payload=body)
            if status == 201:
                inserted += 1
            else:
                failed += 1
                print(f"INSERT failed {emp['emp_id']}: {result}")

    status, final = api("GET", "/employees", token=token)
    count = len(final) if status == 200 and isinstance(final, list) else "?"
    print(f"Sync done: {inserted} added, {updated} updated, {failed} failed")
    print(f"Remote employee count: {count}")


if __name__ == "__main__":
    main()
