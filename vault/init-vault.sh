#!/bin/sh

export VAULT_ADDR=http://127.0.0.1:8200

# Start Vault in background with production config
vault server -config=/vault/config/vault-config.hcl &
VAULT_PID=$!

echo "[vault-init] Waiting for Vault API..."
until wget -qO- http://127.0.0.1:8200/v1/sys/init > /dev/null 2>&1; do
  sleep 1
done
echo "[vault-init] Vault API is reachable."

# Check initialization status via HTTP API
INIT_CHECK=$(wget -qO- http://127.0.0.1:8200/v1/sys/init)
IS_INITIALIZED=$(echo "$INIT_CHECK" | grep -o '"initialized":true' || true)

if [ -z "$IS_INITIALIZED" ]; then
  echo "[vault-init] Vault not initialized. Initializing now..."
  
  vault operator init \
    -key-shares=1 \
    -key-threshold=1 \
    -format=json > /vault/file/init.json
  
  if [ $? -ne 0 ]; then
    echo "[vault-init] ERROR: Vault initialization failed"
    exit 1
  fi
  echo "[vault-init] Vault initialized."
else
  echo "[vault-init] Vault already initialized (persisted data found)."
fi

# Extract unseal key and root token
UNSEAL_KEY=$(cat /vault/file/init.json | tr -d '[:space:]' | grep -o '"unseal_keys_b64":\["[^"]*"\]' | sed 's/.*\["\([^"]*\)".*/\1/')
ROOT_TOKEN=$(cat /vault/file/init.json | tr -d '[:space:]' | grep -o '"root_token":"[^"]*"' | sed 's/"root_token":"\([^"]*\)"/\1/')

if [ -z "$UNSEAL_KEY" ] || [ -z "$ROOT_TOKEN" ]; then
  echo "[vault-init] ERROR: Failed to extract unseal key or root token"
  cat /vault/file/init.json
  exit 1
fi

echo "$ROOT_TOKEN" > /vault/file/.root-token
export VAULT_TOKEN="$ROOT_TOKEN"

# Check seal status via HTTP API
SEAL_STATUS=$(wget -qO- http://127.0.0.1:8200/v1/sys/seal-status)
IS_SEALED=$(echo "$SEAL_STATUS" | grep -o '"sealed":true' || true)

if [ -n "$IS_SEALED" ]; then
  echo "[vault-init] Vault is sealed. Unsealing..."
  vault operator unseal "$UNSEAL_KEY"
  if [ $? -ne 0 ]; then
    echo "[vault-init] ERROR: Failed to unseal Vault"
    exit 1
  fi
  echo "[vault-init] Vault unsealed."
else
  echo "[vault-init] Vault already unsealed."
fi

# ── Ensure KV v2 secrets engine is enabled ──
MOUNT_CHECK=$(vault secrets list 2>/dev/null | grep "^secret/" || true)
if [ -z "$MOUNT_CHECK" ]; then
  echo "[vault-init] Enabling KV v2 secrets engine at secret/"
  vault secrets enable -path=secret kv-v2
  if [ $? -ne 0 ]; then
    echo "[vault-init] WARNING: Failed to enable KV v2 at secret/ (may already exist)"
  fi
else
  echo "[vault-init] KV v2 secrets engine already enabled."
fi

# ── Ensure JWT auth is enabled ──
AUTH_CHECK=$(vault auth list 2>/dev/null | grep "jwt/" || true)
if [ -z "$AUTH_CHECK" ]; then
  echo "[vault-init] Enabling JWT auth..."
  vault auth enable jwt
  if [ $? -ne 0 ]; then
    echo "[vault-init] ERROR: Failed to enable JWT auth"
    exit 1
  fi
else
  echo "[vault-init] JWT auth already enabled."
fi

# ── Wait for Keycloak BEFORE configuring JWT (critical) ──
echo "[vault-init] Waiting for Keycloak OIDC discovery..."
until wget -qO- http://keycloak:8080/realms/lab-orchestration/.well-known/openid-configuration > /dev/null 2>&1; do
  sleep 2
done
echo "[vault-init] Keycloak ready."

# ── Configure JWT auth (strict: fail if Keycloak not reachable) ──
echo "[vault-init] Configuring JWT auth..."
vault write auth/jwt/config \
  oidc_discovery_url="http://keycloak:8080/realms/lab-orchestration" \
  default_role="lab-trainee"
if [ $? -ne 0 ]; then
  echo "[vault-init] ERROR: Failed to write JWT auth config. Keycloak may be unreachable."
  exit 1
fi

# ── Write policies (idempotent) ──
echo "[vault-init] Writing Vault policies..."

vault policy write lab-trainee - <<'EOF'
path "secret/data/credentials/lab_connections/*" {
  capabilities = ["read", "list"]
}
path "secret/metadata/credentials/lab_connections/*" {
  capabilities = ["list"]
}
EOF

vault policy write lab-moderator - <<'EOF'
# Lab connections (full CRUD)
path "secret/data/credentials/lab_connections/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "secret/metadata/credentials/lab_connections/*" {
  capabilities = ["read", "update", "delete", "list"]
}

# Moderator's own ESXi credentials (full CRUD)
path "secret/data/credentials/moderators/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "secret/metadata/credentials/moderators/*" {
  capabilities = ["read", "update", "delete", "list"]
}

# Admin credentials (read-only for vCenter template discovery)
path "secret/data/credentials/admin/*" {
  capabilities = ["read"]
}
path "secret/metadata/credentials/admin/*" {
  capabilities = ["read", "list"]
}
EOF

vault policy write lab-admin - <<'EOF'
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "secret/metadata/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
EOF

# ── Create/update JWT roles via API ──
echo "[vault-init] Creating/updating JWT roles..."

wget -qO- \
  --post-data='{
    "role_type": "jwt",
    "bound_audiences": ["lab-backend"],
    "user_claim": "sub",
    "token_policies": ["lab-trainee"],
    "token_ttl": "1h",
    "bound_claims": {"/realm_access/roles": ["trainee"]}
  }' \
  --header="Content-Type: application/json" \
  --header="X-Vault-Token: $VAULT_TOKEN" \
  http://127.0.0.1:8200/v1/auth/jwt/role/lab-trainee

wget -qO- \
  --post-data='{
    "role_type": "jwt",
    "bound_audiences": ["lab-backend"],
    "user_claim": "sub",
    "token_policies": ["lab-moderator"],
    "token_ttl": "2h",
    "bound_claims": {"/realm_access/roles": ["moderator"]}
  }' \
  --header="Content-Type: application/json" \
  --header="X-Vault-Token: $VAULT_TOKEN" \
  http://127.0.0.1:8200/v1/auth/jwt/role/lab-moderator

wget -qO- \
  --post-data='{
    "role_type": "jwt",
    "bound_audiences": ["lab-backend"],
    "user_claim": "sub",
    "token_policies": ["lab-admin"],
    "token_ttl": "4h",
    "bound_claims": {"/realm_access/roles": ["admin"]}
  }' \
  --header="Content-Type: application/json" \
  --header="X-Vault-Token: $VAULT_TOKEN" \
  http://127.0.0.1:8200/v1/auth/jwt/role/lab-admin

echo "[vault-init] Configuration complete."
echo "[vault-init] Vault is ready and unsealed."

# Keep Vault in foreground so Docker tracks the process
wait $VAULT_PID