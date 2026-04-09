# app/routers/auth.py
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from keycloak.exceptions import (
    KeycloakAuthenticationError,
    KeycloakConnectionError,
    KeycloakInvalidTokenError,
    KeycloakPostError,
    KeycloakError
)
import logging

from app.schemas.auth import LoginRequest, TokenResponse, CheckAuthResponse, LogoutRequest
from app.config.connection.keycloak_client import keycloak_connection, keycloak_openid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

# LOGIN - No auth required
@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest):
    if not keycloak_connection.is_connected:
        conn_status = keycloak_connection.check_connection()
        if not conn_status["connected"]:
            logger.error(f"Keycloak unavailable: {conn_status.get('error')}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable"
            )
    
    try:
        token = keycloak_openid.token(data.username, data.password)
        logger.info(f"Login successful: {data.username}")
        return TokenResponse(
            access_token=token["access_token"],
            refresh_token=token["refresh_token"],
            expires_in=token["expires_in"],
            refresh_expires_in=token["refresh_expires_in"],
            token_type=token.get("token_type", "Bearer"),
            scope=token.get("scope", "")
        )
    except KeycloakAuthenticationError:
        logger.warning(f"Failed login: {data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    except KeycloakConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable"
        )
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error"
        )

# CHECK AUTH - Requires Bearer token
@router.get("/check", response_model=CheckAuthResponse)
def check_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or credentials.scheme.lower() != "bearer":
        return CheckAuthResponse(logged_in=False, user=None)
    
    token = credentials.credentials
    
    try:
        keycloak_openid.introspect(token)
        userinfo = keycloak_openid.userinfo(token)
        return CheckAuthResponse(logged_in=True, user=userinfo)
    except KeycloakInvalidTokenError:
        return CheckAuthResponse(logged_in=False, user=None)
    except KeycloakConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable"
        )
    except Exception:
        return CheckAuthResponse(logged_in=False, user=None)

# LOGOUT - Requires refresh token in body + access token in header
@router.post("/logout")
def logout(
    data: LogoutRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token in Authorization header"
        )
    
    access_token = credentials.credentials
    refresh_token = data.refresh_token
    
    try:
        # Keycloak logout requires refresh token
        keycloak_openid.logout(refresh_token)
        logger.info("User logged out successfully")
        return {"message": "Logged out successfully"}
    except KeycloakPostError as e:
        # Handle specific Keycloak errors
        error_msg = str(e)
        if "invalid_grant" in error_msg:
            logger.warning(f"Logout failed - invalid refresh token: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired refresh token"
            )
        logger.error(f"Keycloak error during logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Logout failed"
        )
    except KeycloakInvalidTokenError:
        logger.warning("Logout attempted with invalid token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    except KeycloakConnectionError:
        logger.error("Keycloak connection error during logout")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable"
        )
    except Exception as e:
        logger.error(f"Unexpected error during logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

# HEALTH CHECK - No auth required
@router.get("/health")
def auth_health():
    status_info = keycloak_connection.check_connection()
    if status_info["connected"]:
        return {"status": "healthy", "service": "keycloak"}
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "unhealthy", "error": status_info.get("error")}
        )