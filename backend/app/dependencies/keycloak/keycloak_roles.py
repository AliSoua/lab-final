# app/dependencies/keycloak/keycloak_roles.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from keycloak.exceptions import KeycloakInvalidTokenError, KeycloakConnectionError
from app.config.connection.keycloak_client import KEYCLOAK_SERVER, KEYCLOAK_REALM
import logging
import requests
import jwt as pyjwt
from jwt import PyJWKClient

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=True)

# Cache JWKS client
_jwks_client = None

def get_jwks_client():
    global _jwks_client
    if _jwks_client is None:
        # Add validation
        if not KEYCLOAK_SERVER or not KEYCLOAK_REALM:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Keycloak configuration missing"
            )
        jwks_url = f"{KEYCLOAK_SERVER.rstrip('/')}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs"
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client

def require_role(required_role: str):
    """
    FastAPI dependency to check if the JWT has a specific Keycloak realm role.
    Decodes the token locally to access realm_access roles.
    """
    def role_checker(credentials: HTTPAuthorizationCredentials = Depends(security)):
        if not credentials or credentials.scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid auth scheme"
            )
        
        token = credentials.credentials
        
        try:
            # Decode token locally using JWKS
            jwks_client = get_jwks_client()
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            
            payload = pyjwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience="account",  # Keycloak default audience
                issuer=f"{KEYCLOAK_SERVER}/realms/{KEYCLOAK_REALM}"
            )
            
            # Extract realm roles from token payload (not userinfo)
            realm_access = payload.get("realm_access", {})
            roles = realm_access.get("roles", []) if isinstance(realm_access, dict) else []
            
            logger.debug(f"Token payload realm_access: {realm_access}")
            logger.debug(f"User {payload.get('preferred_username')} has roles: {roles}")
            
            if required_role not in roles:
                logger.warning(
                    f"User {payload.get('preferred_username')} lacks role '{required_role}'. "
                    f"Has: {roles}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: requires '{required_role}' role"
                )
            
            # Return userinfo-like dict for downstream use
            # UPDATED: Added given_name, family_name, name
            return {
                "sub": payload.get("sub"),
                "preferred_username": payload.get("preferred_username"),
                "email": payload.get("email"),
                "realm_access": realm_access,
                "resource_access": payload.get("resource_access", {}),
                # ADDED: Name fields for profile sync
                "given_name": payload.get("given_name"),
                "family_name": payload.get("family_name"),
                "name": payload.get("name"),
            }
            
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
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Role check error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail=f"Token validation failed: {str(e)}"
            )
    
    return role_checker


def require_any_role(required_roles: list[str]):
    """
    FastAPI dependency to check if JWT has ANY of the specified Keycloak realm roles.
    Similar to require_role but accepts multiple roles (OR logic).
    """
    def role_checker(credentials: HTTPAuthorizationCredentials = Depends(security)):
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
            
            realm_access = payload.get("realm_access", {})
            user_roles = realm_access.get("roles", []) if isinstance(realm_access, dict) else []
            
            # Check if user has ANY of the required roles
            if not any(role in user_roles for role in required_roles):
                logger.warning(
                    f"User {payload.get('preferred_username')} lacks required roles. "
                    f"Has: {user_roles}, Needs one of: {required_roles}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: requires one of {required_roles} roles"
                )
            
            # UPDATED: Added given_name, family_name, name
            return {
                "sub": payload.get("sub"),
                "preferred_username": payload.get("preferred_username"),
                "email": payload.get("email"),
                "realm_access": realm_access,
                "roles": user_roles,
                # ADDED: Name fields for profile sync
                "given_name": payload.get("given_name"),
                "family_name": payload.get("family_name"),
                "name": payload.get("name"),
            }
            
        except pyjwt.ExpiredSignatureError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
        except pyjwt.InvalidTokenError as e:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        except Exception as e:
            logger.error(f"Role check error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail=f"Token validation failed: {str(e)}"
            )
    
    return role_checker