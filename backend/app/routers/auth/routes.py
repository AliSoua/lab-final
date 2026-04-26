# app/routers/auth/routes.py
from fastapi import APIRouter, HTTPException, status, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from keycloak.exceptions import (
    KeycloakAuthenticationError,
    KeycloakConnectionError,
    KeycloakInvalidTokenError,
    KeycloakPostError,
)
import logging
import time
from collections import defaultdict
from sqlalchemy.orm import Session
import jwt as pyjwt

from app.config.connection.postgres_client import get_db
from app.services.user_service import user_service
from app.schemas.user import UserSyncRequest
from app.schemas.auth import LoginRequest, TokenResponse, CheckAuthResponse, LogoutRequest, RefreshRequest
from app.config.connection.keycloak_client import (
    get_keycloak_connection,
    get_keycloak_openid,
    KEYCLOAK_SERVER,
    KEYCLOAK_REALM,
)
from app.dependencies.keycloak.keycloak_roles import get_jwks_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

# ── Rate Limiting (in-memory per process) ────────────────────────────────────
_login_attempts: defaultdict[str, list[float]] = defaultdict(list)


def _check_rate_limit(identifier: str, max_attempts: int = 20, window_seconds: int = 900) -> None:
    """
    Simple sliding-window rate limiter.
    Defaults: 5 attempts per 15 minutes.
    """
    now = time.time()
    attempts = _login_attempts[identifier]
    attempts[:] = [t for t in attempts if now - t < window_seconds]

    if len(attempts) >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again in 15 minutes.",
        )
    attempts.append(now)


def _extract_role_from_payload(payload: dict) -> str:
    """Extract primary role from a locally-decoded JWT payload."""
    realm_access = payload.get("realm_access", {})
    roles = realm_access.get("roles", []) if isinstance(realm_access, dict) else []
    if not roles:
        return "trainee"
    if "admin" in roles:
        return "admin"
    elif "moderator" in roles:
        return "moderator"
    elif "trainee" in roles:
        return "trainee"
    return roles[0]


# ── LOGIN ────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    # Rate limit by client IP (fallback to "unknown" behind some proxies)
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    kc_conn = get_keycloak_connection()
    if not kc_conn.is_connected:
        conn_status = kc_conn.check_connection()
        if not conn_status["connected"]:
            logger.error(f"Keycloak unavailable: {conn_status.get('error')}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable",
            )

    try:
        kc_openid = get_keycloak_openid()
        token = kc_openid.token(data.username, data.password)

        # ── Auto-sync user profile to local DB ─────────────────────────────
        try:
            access_token = token["access_token"]

            # Decode locally via JWKS — realm_access is guaranteed here,
            # whereas Keycloak userinfo may omit roles depending on mapper config.
            jwks_client = get_jwks_client()
            signing_key = jwks_client.get_signing_key_from_jwt(access_token)

            payload = pyjwt.decode(
                access_token,
                signing_key.key,
                algorithms=["RS256"],
                audience="account",
                issuer=f"{KEYCLOAK_SERVER}/realms/{KEYCLOAK_REALM}",
            )

            keycloak_id = payload.get("sub")
            email = payload.get("email")

            if keycloak_id and email:
                sync_data = UserSyncRequest(
                    keycloak_id=keycloak_id,
                    email=email,
                    username=payload.get("preferred_username") or email,
                    first_name=payload.get("given_name"),
                    last_name=payload.get("family_name"),
                    role=_extract_role_from_payload(payload),
                )
                user_service.sync_from_keycloak(db, sync_data)
                logger.info(f"User profile synced on login: {keycloak_id}")
        except Exception as sync_err:
            # Non-blocking: login must succeed even if sync fails
            logger.warning(f"Profile sync on login failed: {sync_err}")
        # ───────────────────────────────────────────────────────────────────

        logger.info(f"Login successful: {data.username}")
        return TokenResponse(
            access_token=token["access_token"],
            refresh_token=token["refresh_token"],
            expires_in=token["expires_in"],
            refresh_expires_in=token["refresh_expires_in"],
            token_type=token.get("token_type", "Bearer"),
            scope=token.get("scope", ""),
        )
    except HTTPException:
        raise
    except KeycloakAuthenticationError:
        logger.warning(f"Failed login: {data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    except KeycloakConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable",
        )
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error",
        )


# ── REFRESH TOKEN ────────────────────────────────────────────────────────────
@router.post("/refresh", response_model=TokenResponse)
def refresh_token(data: RefreshRequest):
    kc_conn = get_keycloak_connection()
    if not kc_conn.is_connected:
        conn_status = kc_conn.check_connection()
        if not conn_status["connected"]:
            logger.error(f"Keycloak unavailable: {conn_status.get('error')}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable",
            )

    try:
        kc_openid = get_keycloak_openid()
        token = kc_openid.refresh_token(data.refresh_token)
        logger.info("Token refreshed successfully")
        return TokenResponse(
            access_token=token["access_token"],
            refresh_token=token["refresh_token"],
            expires_in=token["expires_in"],
            refresh_expires_in=token["refresh_expires_in"],
            token_type=token.get("token_type", "Bearer"),
            scope=token.get("scope", ""),
        )
    except KeycloakInvalidTokenError:
        logger.warning("Refresh failed - invalid or expired refresh token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token. Please log in again.",
        )
    except KeycloakAuthenticationError as e:
        logger.warning(f"Refresh authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    except KeycloakConnectionError:
        logger.error("Keycloak connection error during token refresh")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable",
        )
    except Exception as e:
        logger.error(f"Unexpected error during token refresh: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token",
        )


# ── CHECK AUTH ───────────────────────────────────────────────────────────────
@router.get("/check", response_model=CheckAuthResponse)
def check_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or credentials.scheme.lower() != "bearer":
        return CheckAuthResponse(logged_in=False, user=None)

    token = credentials.credentials

    try:
        kc_openid = get_keycloak_openid()

        # FIX: validate token is active before fetching userinfo
        introspect = kc_openid.introspect(token)
        if not introspect.get("active", False):
            return CheckAuthResponse(logged_in=False, user=None)

        userinfo = kc_openid.userinfo(token)
        return CheckAuthResponse(logged_in=True, user=userinfo)
    except KeycloakInvalidTokenError:
        return CheckAuthResponse(logged_in=False, user=None)
    except KeycloakConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable",
        )
    except Exception:
        return CheckAuthResponse(logged_in=False, user=None)


# ── LOGOUT ───────────────────────────────────────────────────────────────────
@router.post("/logout")
def logout(
    data: LogoutRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token in Authorization header",
        )

    refresh_token = data.refresh_token

    try:
        kc_openid = get_keycloak_openid()
        kc_openid.logout(refresh_token)
        logger.info("User logged out successfully")
        return {"message": "Logged out successfully"}
    except KeycloakPostError as e:
        error_msg = str(e)
        if "invalid_grant" in error_msg:
            logger.warning(f"Logout failed - invalid refresh token: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired refresh token",
            )
        logger.error(f"Keycloak error during logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Logout failed",
        )
    except KeycloakInvalidTokenError:
        logger.warning("Logout attempted with invalid token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    except KeycloakConnectionError:
        logger.error("Keycloak connection error during logout")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable",
        )
    except Exception as e:
        logger.error(f"Unexpected error during logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


# ── GUACAMOLE SSO ────────────────────────────────────────────────────────────
@router.get("/guacamole-sso")
def guacamole_sso(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Validates the user's JWT and returns X-Remote-User for Nginx auth_request.
    Called internally by Nginx before proxying to Guacamole.
    """
    token = None

    logger.info(f"Guacamole SSO headers: {dict(request.headers)}")
    logger.info(f"Guacamole SSO cookies: {request.cookies}")

    # 1. Try Bearer header (Swagger UI / API calls)
    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
        logger.info(f"Guacamole SSO: found Bearer token (len={len(token)})")

    # 2. Fallback to access_token cookie (iframe browser requests)
    if not token:
        token = request.cookies.get("access_token")
        if token:
            logger.info(f"Guacamole SSO: found cookie token (len={len(token)})")

    if not token:
        logger.info("Guacamole SSO: no token found in header or cookie")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing token",
        )

    try:
        kc_openid = get_keycloak_openid()

        introspect = kc_openid.introspect(token)
        logger.info(
            f"Guacamole SSO introspect: active={introspect.get('active')}, sub={introspect.get('sub')}"
        )

        if not introspect.get("active", False):
            logger.info("Guacamole SSO: token inactive")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is not active",
            )

        userinfo = kc_openid.userinfo(token)
        username = userinfo.get("preferred_username")
        logger.info(f"Guacamole SSO userinfo: preferred_username={username}")

        if not username:
            logger.info("Guacamole SSO: preferred_username missing in token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username not found in token",
            )

        logger.info(f"Guacamole SSO validated for user: {username}")

        response = Response(status_code=status.HTTP_200_OK)
        response.headers["X-Remote-User"] = username
        return response

    except KeycloakInvalidTokenError as e:
        logger.info(f"Guacamole SSO: invalid token - {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    except KeycloakConnectionError as e:
        logger.info(f"Guacamole SSO: Keycloak connection error - {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.info(f"Guacamole SSO unexpected error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error during SSO validation",
        )


# ── HEALTH CHECK ─────────────────────────────────────────────────────────────
@router.get("/health")
def auth_health():
    kc_conn = get_keycloak_connection()
    status_info = kc_conn.check_connection()
    if status_info["connected"]:
        return {"status": "healthy", "service": "keycloak"}
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "unhealthy", "error": status_info.get("error")},
        )