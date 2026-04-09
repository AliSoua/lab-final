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
    def __init__(self):
        self._openid_client = None
        self._admin_client = None
        self._connected = False
        self._error_message = None
        self._initialize_clients()
    
    def _initialize_clients(self):
        try:
            if not all([KEYCLOAK_SERVER, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID]):
                missing = [var for var in ["KEYCLOAK_SERVER", "KEYCLOAK_REALM", "KEYCLOAK_CLIENT_ID"] 
                          if not globals()[var]]
                raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
            
            # OIDC client for authentication
            server_url = KEYCLOAK_SERVER.rstrip("/") + "/"
            self._openid_client = KeycloakOpenID(
                server_url=server_url,
                client_id=KEYCLOAK_CLIENT_ID,
                realm_name=KEYCLOAK_REALM,
                client_secret_key=KEYCLOAK_CLIENT_SECRET,
                verify=True
            )
            
            # Admin client for user management (requires admin credentials)
            self._admin_client = KeycloakAdmin(
                server_url=server_url,
                username=KEYCLOAK_ADMIN_USER,
                password=KEYCLOAK_ADMIN_PASSWORD,
                realm_name=KEYCLOAK_REALM,
                user_realm_name="master",
                verify=True
            )
            
            logger.info(f"Keycloak clients initialized for realm: {KEYCLOAK_REALM}")
        except Exception as e:
            self._error_message = str(e)
            logger.error(f"Failed to initialize Keycloak clients: {e}")
    
    def check_connection(self) -> dict:
        if not self._openid_client:
            return {
                "connected": False,
                "error": self._error_message or "Client not initialized",
                "server_url": KEYCLOAK_SERVER,
                "realm": KEYCLOAK_REALM
            }
        
        try:
            well_known = self._openid_client.well_known()
            if well_known:
                self._connected = True
                return {
                    "connected": True,
                    "server_url": KEYCLOAK_SERVER,
                    "realm": KEYCLOAK_REALM,
                    "client_id": KEYCLOAK_CLIENT_ID
                }
        except Exception as e:
            self._connected = False
            self._error_message = str(e)
            logger.error(f"Keycloak connection check failed: {e}")
        
        return {
            "connected": False,
            "error": self._error_message,
            "server_url": KEYCLOAK_SERVER,
            "realm": KEYCLOAK_REALM
        }
    
    def get_all_users(self, brief_representation=True):
        """
        Get all users in the realm.
        Requires admin credentials.
        """
        try:
            if not self._admin_client:
                raise RuntimeError("Admin client not initialized")
            
            users = self._admin_client.get_users({})
            
            if brief_representation:
                # Return minimal info
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
        try:
            return self._admin_client.get_realm_roles_of_user(user_id)
        except Exception as e:
            logger.error(f"Failed to get user roles: {e}")
            raise
    
    @property
    def openid(self):
        """Get the KeycloakOpenID client (for authentication)."""
        if not self._openid_client:
            raise RuntimeError("Keycloak OpenID client not initialized")
        return self._openid_client
    
    @property
    def admin(self):
        """Get the KeycloakAdmin client (for management)."""
        if not self._admin_client:
            raise RuntimeError("Keycloak Admin client not initialized")
        return self._admin_client
    
    @property
    def is_connected(self) -> bool:
        return self._connected

# Global instances
keycloak_connection = KeycloakConnection()
keycloak_openid = keycloak_connection.openid  # For backward compatibility