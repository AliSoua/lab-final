The goal is to move from a single shared root token to per-user Vault sessions authenticated via Keycloak JWT. This is done using Vault's JWT/OIDC auth method .
Here's the full integration.
1. One-Time Vault Configuration
Run these in your Vault container (or via Terraform) to enable JWT auth with Keycloak as the identity provider.
bash
Copy

# 1. Enable JWT auth
vault auth enable jwt

# 2. Configure Keycloak as the OIDC provider
# Replace with your Keycloak realm URL
vault write auth/jwt/config \
    oidc_discovery_url="http://keycloak:8080/realms/lab-orchestration" \
    oidc_client_id="vault" \
    default_role="lab-trainee"

# 3. Create policies
vault policy write lab-trainee - <<EOF
path "secret/data/credentials/lab_connections/*" {
  capabilities = ["read", "list"]
}
EOF

vault policy write lab-moderator - <<EOF
path "secret/data/credentials/lab_connections/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "secret/metadata/credentials/lab_connections/*" {
  capabilities = ["read", "delete", "list"]
}
EOF

vault policy write lab-admin - <<EOF
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
EOF

# 4. Create Vault roles mapped to Keycloak realm roles
# Keycloak puts roles in: realm_access.roles (array)
vault write auth/jwt/role/lab-trainee \
    role_type="jwt" \
    bound_audiences="lab-backend" \
    user_claim="sub" \
    token_policies="lab-trainee" \
    token_ttl="1h" \
    bound_claims='{"realm_access.roles":"trainee"}'

vault write auth/jwt/role/lab-moderator \
    role_type="jwt" \
    bound_audiences="lab-backend" \
    user_claim="sub" \
    token_policies="lab-moderator" \
    token_ttl="2h" \
    bound_claims='{"realm_access.roles":"moderator"}'

vault write auth/jwt/role/lab-admin \
    role_type="jwt" \
    bound_audiences="lab-backend" \
    user_claim="sub" \
    token_policies="lab-admin" \
    token_ttl="4h" \
    bound_claims='{"realm_access.roles":"admin"}'

    Note: In Keycloak, go to Clients → vault → Mappers and ensure realm roles are included in the access token under realm_access.roles.