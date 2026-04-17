# app/config/connection/keycloak_client.py
from keycloak import KeycloakOpenID, KeycloakAdmin
from keycloak.exceptions import KeycloakConnectionError, KeycloakError
from dotenv import load_dotenv
import os
import logging

logger = logging.getLogger(__name__)
load_dotenv()

KEYCLOAK_SERVER = os.getenv("KEYCLOAK_SERVER")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID")
KEYCLOAK_CLIENT_SECRET = os.getenv("KEYCLOAK_CLIENT_SECRET")
KEYCLOAK_ADMIN_USER = os.getenv("KEYCLOAK_ADMIN_USER")
KEYCLOAK_ADMIN_PASSWORD = os.getenv("KEYCLOAK_ADMIN_PASSWORD")


class KeycloakConnection:
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if KeycloakConnection._initialized:
            return
            
        self._openid_client = None
        self._admin_client = None
        self._connected = False
        self._error_message = None
        self._config = {
            "server_url": KEYCLOAK_SERVER,
            "realm": KEYCLOAK_REALM,
            "client_id": KEYCLOAK_CLIENT_ID,
        }
        KeycloakConnection._initialized = True
    
    def _initialize_clients(self):
        """Lazy initialization of Keycloak clients."""
        if self._openid_client is not None:
            return True
            
        try:
            if not all([KEYCLOAK_SERVER, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID]):
                missing = [
                    var for var, val in [
                        ("KEYCLOAK_SERVER", KEYCLOAK_SERVER),
                        ("KEYCLOAK_REALM", KEYCLOAK_REALM),
                        ("KEYCLOAK_CLIENT_ID", KEYCLOAK_CLIENT_ID),
                    ] if not val
                ]
                raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
            
            server_url = KEYCLOAK_SERVER.rstrip("/") + "/"
            
            # OIDC client for authentication
            self._openid_client = KeycloakOpenID(
                server_url=server_url,
                client_id=KEYCLOAK_CLIENT_ID,
                realm_name=KEYCLOAK_REALM,
                client_secret_key=KEYCLOAK_CLIENT_SECRET,
                verify=True
            )
            
            # Admin client for user management (optional - only if admin creds provided)
            if KEYCLOAK_ADMIN_USER and KEYCLOAK_ADMIN_PASSWORD:
                self._admin_client = KeycloakAdmin(
                    server_url=server_url,
                    username=KEYCLOAK_ADMIN_USER,
                    password=KEYCLOAK_ADMIN_PASSWORD,
                    realm_name=KEYCLOAK_REALM,
                    user_realm_name="master",
                    verify=True
                )
            
            logger.info(f"Keycloak clients initialized for realm: {KEYCLOAK_REALM}")
            return True
            
        except Exception as e:
            self._error_message = str(e)
            logger.error(f"Failed to initialize Keycloak clients: {e}")
            return False
    
    def check_connection(self) -> dict:
        """Check if Keycloak connection is working."""
        if not self._initialize_clients():
            return {
                "connected": False,
                "error": self._error_message or "Failed to initialize clients",
                **self._config
            }
        
        try:
            well_known = self._openid_client.well_known()
            if well_known:
                self._connected = True
                return {
                    "connected": True,
                    **self._config,
                    "client_id": KEYCLOAK_CLIENT_ID
                }
        except Exception as e:
            self._connected = False
            self._error_message = str(e)
            logger.error(f"Keycloak connection check failed: {e}")
        
        return {
            "connected": False,
            "error": self._error_message,
            **self._config
        }
    
    def get_all_users(self, brief_representation=True):
        """Get all users in the realm. Requires admin credentials."""
        if not self._initialize_clients():
            raise RuntimeError("Failed to initialize Keycloak clients")
            
        if not self._admin_client:
            raise RuntimeError("Admin client not initialized - check KEYCLOAK_ADMIN_USER and KEYCLOAK_ADMIN_PASSWORD")
        
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
                        "enabled": u.get("enabled")
                    }
                    for u in users
                ]
            return users
            
        except Exception as e:
            logger.error(f"Failed to get users: {e}")
            raise
    
    def get_user_roles(self, user_id):
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
            raise RuntimeError(f"Keycloak OpenID client not initialized: {self._error_message}")
        return self._openid_client
    
    @property
    def admin(self) -> KeycloakAdmin:
        """Get the KeycloakAdmin client (for management)."""
        if not self._initialize_clients():
            raise RuntimeError(f"Keycloak Admin client not initialized: {self._error_message}")
        if not self._admin_client:
            raise RuntimeError("Admin client not available - admin credentials not configured")
        return self._admin_client
    
    @property
    def is_connected(self) -> bool:
        return self._connected
    
    @property
    def is_configured(self) -> bool:
        """Check if minimum required config is present."""
        return all([KEYCLOAK_SERVER, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID])


# Global instance - lazy initialization
_keycloak_connection = None

def get_keycloak_connection() -> KeycloakConnection:
    """Get or create the Keycloak connection singleton."""
    global _keycloak_connection
    if _keycloak_connection is None:
        _keycloak_connection = KeycloakConnection()
    return _keycloak_connection


# Convenience properties for backward compatibility
def get_keycloak_openid() -> KeycloakOpenID:
    """Get the KeycloakOpenID client."""
    return get_keycloak_connection().openid


def get_keycloak_admin() -> KeycloakAdmin:
    """Get the KeycloakAdmin client."""
    return get_keycloak_connection().admin


# For backward compatibility - these will lazy-load on first access
keycloak_connection = get_keycloak_connection()
keycloak_openid = property(get_keycloak_openid)  # Use as: keycloak_openid.fget()