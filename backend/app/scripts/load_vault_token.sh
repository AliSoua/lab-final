#!/bin/sh
set -e

TOKEN_FILE="/vault/file/.root-token"

if [ -z "$VAULT_TOKEN" ] && [ -r "$TOKEN_FILE" ]; then
  export VAULT_TOKEN=$(cat "$TOKEN_FILE" | tr -d '\n\r')
  echo "[$(basename "$0")] VAULT_TOKEN loaded from $TOKEN_FILE"
fi

if [ -z "$VAULT_TOKEN" ]; then
  echo "[$(basename "$0")] ERROR: VAULT_TOKEN is not set" >&2
  exit 1
fi

# Execute the real command
exec "$@"