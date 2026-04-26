# app/config/connection/keycloak_client.py
from keycloak import KeycloakOpenID, KeycloakAdmin
from keycloak.exceptions import KeycloakConnectionError, KeycloakError
from dotenv import load_dotenv
import os
import logging
from typing import Any, Optional
from threading import Lock

logger = logging.getLogger(__name__)
load_dotenv()

# ── Configuration ────────────────────────────────────────────────────────────
KEYCLOAK_SERVER = os.getenv("KEYCLOAK_SERVER")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID")
KEYCLOAK_CLIENT_SECRET = os.getenv("KEYCLOAK_CLIENT_SECRET")
KEYCLOAK_ADMIN_USER = os.getenv("KEYCLOAK_ADMIN_USER")
KEYCLOAK_ADMIN_PASSWORD = os.getenv("KEYCLOAK_ADMIN_PASSWORD")


class KeycloakConnection:
    """
    Singleton managing Keycloak OpenID and Admin clients.
    Lazy-initializes clients on first access and provides health-check capabilities.
    """

    _instance: Optional["KeycloakConnection"] = None
    _lock = Lock()

    def __new__(cls) -> "KeycloakConnection":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        # Guard against re-initialization in singleton
        if hasattr(self, "_openid_client"):
            return

        self._openid_client: Optional[KeycloakOpenID] = None
        self._admin_client: Optional[KeycloakAdmin] = None
        self._connected = False
        self._error_message: Optional[str] = None
        self._config = {
            "server_url": KEYCLOAK_SERVER,
            "realm": KEYCLOAK_REALM,
            "client_id": KEYCLOAK_CLIENT_ID,
        }

    def _initialize_clients(self) -> bool:
        """Lazy initialization of Keycloak clients. Thread-safe."""
        if self._openid_client is not None:
            return True

        try:
            missing = [
                var
                for var, val in [
                    ("KEYCLOAK_SERVER", KEYCLOAK_SERVER),
                    ("KEYCLOAK_REALM", KEYCLOAK_REALM),
                    ("KEYCLOAK_CLIENT_ID", KEYCLOAK_CLIENT_ID),
                ]
                if not val
            ]
            if missing:
                raise ValueError(
                    f"Missing required environment variables: {', '.join(missing)}"
                )

            server_url = KEYCLOAK_SERVER.rstrip("/") + "/"

            self._openid_client = KeycloakOpenID(
                server_url=server_url,
                client_id=KEYCLOAK_CLIENT_ID,
                realm_name=KEYCLOAK_REALM,
                client_secret_key=KEYCLOAK_CLIENT_SECRET,
                verify=True,
            )

            if KEYCLOAK_ADMIN_USER and KEYCLOAK_ADMIN_PASSWORD:
                self._admin_client = KeycloakAdmin(
                    server_url=server_url,
                    username=KEYCLOAK_ADMIN_USER,
                    password=KEYCLOAK_ADMIN_PASSWORD,
                    realm_name=KEYCLOAK_REALM,
                    user_realm_name="master",
                    verify=True,
                )

            logger.info(f"Keycloak clients initialized for realm: {KEYCLOAK_REALM}")
            return True

        except Exception as e:
            self._error_message = str(e)
            logger.error(f"Failed to initialize Keycloak clients: {e}")
            return False

    def check_connection(self) -> dict[str, Any]:
        """
        Verify Keycloak is reachable by fetching the well-known OIDC configuration.
        Resets internal error state on success so recovery is reflected immediately.
        """
        if not self._initialize_clients():
            return {
                "connected": False,
                "error": self._error_message or "Failed to initialize clients",
                **self._config,
            }

        try:
            well_known = self._openid_client.well_known()
            if well_known:
                self._connected = True
                self._error_message = None  # Clear stale errors on recovery
                return {
                    "connected": True,
                    **self._config,
                    "client_id": KEYCLOAK_CLIENT_ID,
                }
        except Exception as e:
            self._connected = False
            self._error_message = str(e)
            logger.error(f"Keycloak connection check failed: {e}")

        return {
            "connected": False,
            "error": self._error_message,
            **self._config,
        }

    def get_all_users(self, brief_representation: bool = True) -> list[dict[str, Any]]:
        """Get all users in the realm. Requires admin credentials."""
        if not self._initialize_clients():
            raise RuntimeError("Failed to initialize Keycloak clients")

        if not self._admin_client:
            raise RuntimeError(
                "Admin client not initialized - check KEYCLOAK_ADMIN_USER and KEYCLOAK_ADMIN_PASSWORD"
            )

        try:
            users = self._admin_client.get_users({})
            if brief_representation:
                return [
                    {
                        "id": u.get("id"),
                        "username": u.get("username"),
                        "email": u.get("email"),
                        "firstName": u.get("firstName"),
                        "lastName": u.get("lastName"),
                        "enabled": u.get("enabled"),
                    }
                    for u in users
                ]
            return users
        except Exception as e:
            logger.error(f"Failed to get users: {e}")
            raise

    def get_user_roles(self, user_id: str) -> list[dict[str, Any]]:
        """Get realm roles assigned to a specific user."""
        if not self._initialize_clients():
            raise RuntimeError("Failed to initialize Keycloak clients")

        if not self._admin_client:
            raise RuntimeError("Admin client not initialized")

        try:
            return self._admin_client.get_realm_roles_of_user(user_id)
        except Exception as e:
            logger.error(f"Failed to get user roles: {e}")
            raise

    @property
    def openid(self) -> KeycloakOpenID:
        """Get the KeycloakOpenID client (for authentication)."""
        if not self._initialize_clients():
            raise RuntimeError(
                f"Keycloak OpenID client not initialized: {self._error_message}"
            )
        return self._openid_client

    @property
    def admin(self) -> KeycloakAdmin:
        """Get the KeycloakAdmin client (for management)."""
        if not self._initialize_clients():
            raise RuntimeError(
                f"Keycloak Admin client not initialized: {self._error_message}"
            )
        if not self._admin_client:
            raise RuntimeError(
                "Admin client not available - admin credentials not configured"
            )
        return self._admin_client

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def is_configured(self) -> bool:
        """Check if minimum required config is present."""
        return all([KEYCLOAK_SERVER, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID])


# ── Module-level singleton accessor ──────────────────────────────────────────
_keycloak_connection: Optional[KeycloakConnection] = None
_connection_lock = Lock()


def get_keycloak_connection() -> KeycloakConnection:
    """Get or create the Keycloak connection singleton (thread-safe)."""
    global _keycloak_connection
    if _keycloak_connection is None:
        with _connection_lock:
            if _keycloak_connection is None:
                _keycloak_connection = KeycloakConnection()
    return _keycloak_connection


def get_keycloak_openid() -> KeycloakOpenID:
    """Get the KeycloakOpenID client."""
    return get_keycloak_connection().openid


def get_keycloak_admin() -> KeycloakAdmin:
    """Get the KeycloakAdmin client."""
    return get_keycloak_connection().admin


# ── Backward compatibility ───────────────────────────────────────────────────
# NOTE: Previous versions exposed `keycloak_openid = property(get_keycloak_openid)`
# which is invalid at module level (property is a class descriptor). Use the
# function imports above instead.
keycloak_connection = get_keycloak_connection()