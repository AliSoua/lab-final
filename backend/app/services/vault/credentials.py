# app/services/vault/credentials.py
from typing import List, Optional

import hvac

from app.config.connection.vault_client import VaultClient
from app.core.vault_audit import audit_log


def create_or_update_credentials(
    path: str,
    esxi_host: str,
    username: str,
    password: str,
    actor: str,
    cas: Optional[int] = None,
    user_client: Optional[hvac.Client] = None,
) -> str:
    """Store ESXi/vCenter credentials. Writes secret + non-sensitive metadata."""
    vault = VaultClient()

    vault.write_secret(
        path=path,
        secret={"host": esxi_host, "username": username, "password": password},
        user_client=user_client,
        cas=cas,
    )

    vault.update_metadata(
        path=path,
        custom_metadata={"host": esxi_host, "username": username},
        user_client=user_client,
    )

    audit_log("credentials_write", actor, path, True)
    return path


def read_credentials(path: str, user_client: Optional[hvac.Client] = None) -> dict:
    return VaultClient().read_secret(path, user_client)


def read_secret_metadata(path: str, user_client: Optional[hvac.Client] = None) -> dict:
    return VaultClient().read_metadata(path, user_client)


def delete_credentials(path: str, actor: str, user_client: Optional[hvac.Client] = None) -> None:
    VaultClient().delete_secret(path, user_client)
    audit_log("credentials_delete", actor, path, True)


def exists_credentials(path: str, user_client: Optional[hvac.Client] = None) -> bool:
    return VaultClient().secret_exists(path, user_client)


def list_moderator_hosts(user_id: str, user_client: Optional[hvac.Client] = None) -> List[str]:
    return VaultClient().list_secrets(f"credentials/moderators/{user_id}", user_client)


def list_admin_vcenters(user_id: str, user_client: Optional[hvac.Client] = None) -> List[str]:
    return VaultClient().list_secrets(f"credentials/admin/{user_id}", user_client)