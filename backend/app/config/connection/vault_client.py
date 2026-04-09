# app/config/connection/vault_client.py
import hvac
import os
from dotenv import load_dotenv
from typing import List

load_dotenv()

VAULT_URL = os.getenv("VAULT_ADDR")
VAULT_TOKEN = os.getenv("VAULT_TOKEN")

client = hvac.Client(url=VAULT_URL, token=VAULT_TOKEN)

def check_resource_access(requester_sub: str, requester_roles: List[str], target_user_id: str) -> bool:
    """
    Validate if requester can access target user's credentials.
    Returns True if:
    - Requester is accessing their own resources (self-service)
    - Requester has 'admin' role (full access)
    """
    if requester_sub == target_user_id:
        return True
    if "admin" in requester_roles:
        return True
    return False

def validate_moderator_access(requester_info: dict, target_user_id: str) -> None:
    """
    Validate and raise exception if moderator tries to access other user's credentials.
    Call this at the start of each router function.
    
    Args:
        requester_info: The userinfo dict from Keycloak (contains 'sub' and 'realm_access')
        target_user_id: The user_id being accessed in the request
    
    Raises:
        PermissionError: If access is denied
    """
    requester_id = requester_info.get("sub")
    roles = requester_info.get("realm_access", {}).get("roles", [])
    
    if not check_resource_access(requester_id, roles, target_user_id):
        raise PermissionError(
            f"Access denied: Cannot manage credentials for user {target_user_id}. "
            f"Users can only manage their own credentials unless they have admin role."
        )

def create_or_update_credentials(user_id: str, esxi_host: str = "", username: str = "", password: str = "") -> str:
    """Create or update moderator credentials in Vault."""
    path = f"secret/credentials/moderators/{user_id}/esxi"
    data = {
        "host": esxi_host,
        "username": username,
        "password": password
    }
    try:
        client.secrets.kv.v2.create_or_update_secret(path=path, secret=data)
        return path
    except hvac.exceptions.Forbidden as e:
        raise PermissionError(f"Vault permission denied: {e}")
    except Exception as e:
        raise RuntimeError(f"Failed to store credentials in Vault: {e}")

def read_credentials(user_id: str) -> dict:
    """Read moderator credentials from Vault."""
    path = f"secret/credentials/moderators/{user_id}/esxi"
    try:
        secret = client.secrets.kv.v2.read_secret_version(path=path)
        return secret['data']['data']
    except hvac.exceptions.InvalidPath:
        raise FileNotFoundError(f"No credentials found for user {user_id}")
    except hvac.exceptions.Forbidden as e:
        raise PermissionError(f"Vault permission denied: {e}")
    except Exception as e:
        raise RuntimeError(f"Failed to read credentials from Vault: {e}")

def delete_credentials(user_id: str) -> str:
    """Delete moderator credentials from Vault."""
    path = f"secret/credentials/moderators/{user_id}/esxi"
    try:
        client.secrets.kv.v2.delete_metadata_and_all_versions(path=path)
        return path
    except hvac.exceptions.InvalidPath:
        # Already deleted or never existed
        return path
    except hvac.exceptions.Forbidden as e:
        raise PermissionError(f"Vault permission denied: {e}")
    except Exception as e:
        raise RuntimeError(f"Failed to delete credentials from Vault: {e}")

def exists_credentials(user_id: str) -> bool:
    """Check if credentials exist for user."""
    path = f"secret/credentials/moderators/{user_id}/esxi"
    try:
        client.secrets.kv.v2.read_secret_version(path=path)
        return True
    except hvac.exceptions.InvalidPath:
        return False
    except Exception:
        return False