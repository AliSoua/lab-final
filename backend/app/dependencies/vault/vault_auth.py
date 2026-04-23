# app/dependencies/vault/vault_auth.py
from fastapi import Request, Depends, HTTPException, status
import hvac

from app.config.connection.vault_client import VaultClient
from app.dependencies.keycloak.keycloak_roles import require_any_role


def _resolve_vault_role(userinfo: dict) -> str:
    roles = userinfo.get("realm_access", {}).get("roles", [])
    if "admin" in roles:
        return "lab-admin"
    if "moderator" in roles:
        return "lab-moderator"
    if "trainee" in roles:
        return "lab-trainee"
    raise PermissionError("User has no valid Vault role mapping.")


def require_vault_client(
    request: Request,
    userinfo: dict = Depends(require_any_role(["trainee", "moderator", "admin"])),
):
    """Yield an hvac.Client authenticated as the Keycloak user."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer token for Vault authentication",
        )

    jwt = auth_header[7:].strip()
    role = _resolve_vault_role(userinfo)

    try:
        return VaultClient().authenticate_user(jwt, role)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vault authentication failed: {e}",
        )