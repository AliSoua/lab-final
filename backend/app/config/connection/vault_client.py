# app/config/connection/vault_client.py
import hvac
import os
import logging
import json
from dotenv import load_dotenv
from typing import List, Optional

load_dotenv()

logger = logging.getLogger(__name__)

VAULT_URL = os.getenv("VAULT_ADDR", "http://vault:8200")
VAULT_TOKEN = os.getenv("VAULT_TOKEN", "root")

if not VAULT_URL:
    raise RuntimeError("VAULT_ADDR environment variable is not set")

client = hvac.Client(url=VAULT_URL, token=VAULT_TOKEN)

# Best-effort auth check on import; do not crash so unit tests can patch client.
try:
    if not client.is_authenticated():
        logger.warning("Vault token is invalid or Vault is unreachable")
except Exception as e:
    logger.warning("Could not verify Vault connection: %s", e)


def audit_log(action: str, actor: str, target: str, success: bool, detail: str = ""):
    """Emit a structured audit log entry for Vault operations."""
    audit_logger = logging.getLogger("vault.audit")
    audit_logger.info(
        json.dumps({
            "action": action,
            "actor": actor,
            "target": target,
            "success": success,
            "detail": detail,
        })
    )


def create_or_update_credentials(
    path: str,
    esxi_host: str,
    username: str,
    password: str,
    actor: str,
    cas: Optional[int] = None,
) -> str:
    """Create or update moderator credentials in Vault at the specified path.

    Args:
        cas: Check-and-set value.
             0  = create-only (fail if secret already exists).
             N  = update-only if the secret's current version == N.
             None = unconditional write (not recommended).
    """
    try:
        client.secrets.kv.v2.create_or_update_secret(
            path=path,
            secret={
                "host": esxi_host,
                "username": username,
                "password": password,
            },
            cas=cas,
        )

        # Write non-sensitive metadata so listings never need to decrypt the secret.
        try:
            client.secrets.kv.v2.update_metadata(
                path=path,
                custom_metadata={
                    "host": esxi_host,
                    "username": username,
                },
            )
        except Exception as meta_err:
            # Non-fatal: metadata is a performance/convenience optimisation.
            logger.warning("Failed to write metadata for %s: %s", path, meta_err)

        audit_log("credentials_write", actor, path, True)
        return path

    except hvac.exceptions.InvalidRequest as e:
        err_msg = str(e).lower()
        if cas is not None and ("check-and-set" in err_msg or "cas" in err_msg):
            audit_log("credentials_write", actor, path, False, "CAS mismatch")
            raise FileExistsError(
                f"Secret at {path} already exists or version mismatch"
            ) from e
        audit_log("credentials_write", actor, path, False, str(e))
        raise RuntimeError(f"Vault write rejected: {e}") from e

    except hvac.exceptions.Forbidden as e:
        audit_log("credentials_write", actor, path, False, str(e))
        raise PermissionError(f"Vault permission denied: {e}") from e

    except Exception as e:
        audit_log("credentials_write", actor, path, False, str(e))
        raise RuntimeError(f"Failed to store credentials in Vault: {e}") from e


def read_credentials(path: str) -> dict:
    """Read moderator credentials (including password) from Vault."""
    try:
        secret = client.secrets.kv.v2.read_secret_version(path=path)
        return secret["data"]["data"]
    except hvac.exceptions.InvalidPath:
        raise FileNotFoundError(f"No credentials found at {path}")
    except hvac.exceptions.Forbidden as e:
        raise PermissionError(f"Vault permission denied: {e}")
    except Exception as e:
        raise RuntimeError(f"Failed to read credentials from Vault: {e}")


def read_secret_metadata(path: str) -> dict:
    """Read metadata for a secret without decrypting its value."""
    try:
        return client.secrets.kv.v2.read_secret_metadata(path=path)
    except hvac.exceptions.InvalidPath:
        raise FileNotFoundError(f"No credentials found at {path}")
    except hvac.exceptions.Forbidden as e:
        raise PermissionError(f"Vault permission denied: {e}")
    except Exception as e:
        raise RuntimeError(f"Failed to read secret metadata from Vault: {e}")


def delete_credentials(path: str, actor: str) -> None:
    """Permanently delete moderator credentials and metadata from Vault."""
    try:
        client.secrets.kv.v2.delete_metadata_and_all_versions(path=path)
        audit_log("credentials_delete", actor, path, True)
    except hvac.exceptions.InvalidPath:
        audit_log("credentials_delete", actor, path, True, "already_deleted")
        return
    except hvac.exceptions.Forbidden as e:
        audit_log("credentials_delete", actor, path, False, str(e))
        raise PermissionError(f"Vault permission denied: {e}")
    except Exception as e:
        audit_log("credentials_delete", actor, path, False, str(e))
        raise RuntimeError(f"Failed to delete credentials from Vault: {e}")


def exists_credentials(path: str) -> bool:
    """Check if credentials exist via metadata (no secret decryption)."""
    try:
        client.secrets.kv.v2.read_secret_metadata(path=path)
        return True
    except hvac.exceptions.InvalidPath:
        return False
    except Exception:
        return False


def list_moderator_hosts(user_id: str) -> List[str]:
    """Return a list of ESXi host names stored under this moderator."""
    try:
        result = client.secrets.kv.v2.list_secrets(
            path=f"credentials/moderators/{user_id}"
        )
        keys = result["data"]["keys"]
        # Vault returns folder keys with trailing slashes; strip them.
        return [k.rstrip("/") for k in keys]
    except hvac.exceptions.InvalidPath:
        return []
    except Exception as e:
        raise RuntimeError(f"Failed to list hosts from Vault: {e}")