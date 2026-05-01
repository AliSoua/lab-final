# app/dependencies/keycloak/keycloak_roles.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from keycloak.exceptions import KeycloakInvalidTokenError, KeycloakConnectionError
from app.config.connection.keycloak_client import KEYCLOAK_SERVER, KEYCLOAK_REALM
import logging
import jwt as pyjwt
from jwt import PyJWKClient

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=True)

# Cache JWKS client
_jwks_client = None


def get_jwks_client():
    global _jwks_client
    if _jwks_client is None:
        if not KEYCLOAK_SERVER or not KEYCLOAK_REALM:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Keycloak configuration missing"
            )
        jwks_url = f"{KEYCLOAK_SERVER.rstrip('/')}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs"
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def _authenticate(credentials: HTTPAuthorizationCredentials) -> dict:
    """
    Shared helper: validates Bearer scheme, decodes JWT via JWKS,
    maps exceptions to HTTPExceptions, and returns a normalized user context.
    """
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid auth scheme"
        )

    token = credentials.credentials

    try:
        jwks_client = get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience="account",
            issuer=f"{KEYCLOAK_SERVER}/realms/{KEYCLOAK_REALM}"
        )

    except HTTPException:
        raise  # e.g. missing Keycloak config — don't wrap
    except pyjwt.ExpiredSignatureError:
        logger.error("Token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except pyjwt.InvalidTokenError as e:
        logger.error(f"Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    except KeycloakConnectionError as e:
        logger.error(f"Keycloak connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable"
        )
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}"
        )

    realm_access = payload.get("realm_access", {})
    roles = realm_access.get("roles", []) if isinstance(realm_access, dict) else []

    return {
        "sub": payload.get("sub"),
        "preferred_username": payload.get("preferred_username"),
        "email": payload.get("email"),
        "realm_access": realm_access,
        "resource_access": payload.get("resource_access", {}),
        "roles": roles,
        "given_name": payload.get("given_name"),
        "family_name": payload.get("family_name"),
        "name": payload.get("name"),
    }


def require_role(required_role: str):
    """
    FastAPI dependency: user must have the exact Keycloak realm role.
    """
    def role_checker(credentials: HTTPAuthorizationCredentials = Depends(security)):
        user = _authenticate(credentials)

        if required_role not in user["roles"]:
            logger.warning(
                f"User {user.get('preferred_username')} lacks role '{required_role}'. "
                f"Has: {user['roles']}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: requires '{required_role}' role"
            )

        return user

    return role_checker


def require_any_role(required_roles: list[str]):
    """
    FastAPI dependency: user must have at least one of the specified roles (OR logic).
    """
    def role_checker(credentials: HTTPAuthorizationCredentials = Depends(security)):
        user = _authenticate(credentials)

        if not any(role in user["roles"] for role in required_roles):
            logger.warning(
                f"User {user.get('preferred_username')} lacks required roles. "
                f"Has: {user['roles']}, Needs one of: {required_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: requires one of {required_roles} roles"
            )

        return user

    return role_checker

def verify_token(token: str) -> dict:
    """
    Standalone token verification for non-HTTP contexts (SSE, WebSockets, etc.)
    that don't use FastAPI's Depends() system.
    """
    from fastapi.security import HTTPAuthorizationCredentials
    
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token,
    )
    return _authenticate(credentials)