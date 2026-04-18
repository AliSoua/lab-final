#!/bin/sh
set -eu

ENV_FILE="/app/.env"
LOCK_FILE="/tmp/keycloak_bootstrap.done"
KEYCLOAK_URL="http://keycloak:8080"

wait_for_keycloak() {
  echo "[INFO] Waiting for Keycloak to be reachable at $KEYCLOAK_URL..."
  until python - <<'PY'
import sys
import urllib.request

url = "http://keycloak:8080"
try:
    with urllib.request.urlopen(url, timeout=2) as r:
        _ = r.read(1)
    sys.exit(0)
except Exception:
    sys.exit(1)
PY
  do
    echo "[INFO] Keycloak not ready yet, retrying in 5 seconds..."
    sleep 5
  done
}

update_env_secret() {
  SECRET_VALUE="$1"

  touch "$ENV_FILE"
  chmod u+rw "$ENV_FILE" || true

  python - "$ENV_FILE" "$SECRET_VALUE" <<'PY'
import sys
from pathlib import Path

env_file = Path(sys.argv[1])
secret = sys.argv[2]
key = "KEYCLOAK_CLIENT_SECRET="

if env_file.exists():
    lines = env_file.read_text(encoding="utf-8").splitlines()
else:
    lines = []

new_lines = []
replaced = False

for line in lines:
    if line.startswith(key):
        new_lines.append(f"{key}{secret}")
        replaced = True
    else:
        new_lines.append(line)

if not replaced:
    if new_lines and new_lines[-1] != "":
        new_lines.append("")
    new_lines.append(f"{key}{secret}")

env_file.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
PY
}

if [ -f "$LOCK_FILE" ]; then
  echo "[INFO] Keycloak bootstrap already completed for this container."
else
  wait_for_keycloak

  echo "[INFO] Running Keycloak setup..."
  python /app/app/scripts/setup_keycloak.py

  echo "[INFO] Reading Keycloak client secret..."
  SECRET="$(python /app/app/scripts/secret_keycloak.py | awk -F': ' '/Client Secret:/ {print $2; exit}')"

  if [ -z "${SECRET:-}" ] || [ "$SECRET" = "N/A" ]; then
    echo "[ERROR] Could not extract Keycloak client secret" >&2
    exit 1
  fi

  update_env_secret "$SECRET"
  touch "$LOCK_FILE"

  echo "[INFO] Keycloak secret written to $ENV_FILE"
fi

set -a
. "$ENV_FILE"
set +a

exec uvicorn app.main:app --host 0.0.0.0 --port 8000