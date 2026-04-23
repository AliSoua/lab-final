# app/config/connection/vault_client.py
import os
import logging
from typing import List, Optional, Dict

import hvac
from hvac.exceptions import InvalidPath, Forbidden, InvalidRequest

logger = logging.getLogger(__name__)

VAULT_URL = os.getenv("VAULT_ADDR")
VAULT_TOKEN = os.getenv("VAULT_TOKEN")

if not VAULT_URL:
    raise RuntimeError("VAULT_ADDR environment variable is not set")
if not VAULT_TOKEN:
    raise RuntimeError("VAULT_TOKEN environment variable is not set")


class VaultClient:
    """Thread-safe singleton for generic Vault KV v2 operations.
    
    Supports both service-token (background/system) and user-JWT (per-request)
    authentication patterns.
    """

    _instance: Optional["VaultClient"] = None
    _initialized: bool = False

    def __new__(cls) -> "VaultClient":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if VaultClient._initialized:
            return

        self.url = VAULT_URL
        self._service_client = hvac.Client(url=self.url, token=VAULT_TOKEN)

        # Best-effort health check; don't crash so tests can patch.
        try:
            if not self._service_client.is_authenticated():
                logger.warning("Vault service token is invalid or Vault is unreachable")
        except Exception as e:
            logger.warning("Could not verify Vault service connection: %s", e)

        VaultClient._initialized = True

    # ── Service client access ──

    @property
    def service_client(self) -> hvac.Client:
        return self._service_client

    # ── User authentication (JWT / OIDC) ──

    def authenticate_user(self, keycloak_jwt: str, role: str) -> hvac.Client:
        """Exchange a Keycloak JWT for a scoped Vault token via JWT auth."""
        temp = hvac.Client(url=self.url)
        try:
            resp = temp.auth.jwt.jwt_login(role=role, jwt=keycloak_jwt)
            token = resp["auth"]["client_token"]
            logger.info("Vault JWT login succeeded: role=%s", role)
            return hvac.Client(url=self.url, token=token)
        except InvalidRequest as e:
            logger.error("Vault JWT login rejected: %s", e)
            raise PermissionError("Vault rejected the authentication token.") from e
        except Exception as e:
            logger.error("Vault JWT login failed: %s", e)
            raise RuntimeError("Failed to authenticate to Vault.") from e

    # ── Generic KV v2 operations ──

    def _client(self, user_client: Optional[hvac.Client] = None) -> hvac.Client:
        return user_client or self._service_client

    def read_secret(self, path: str, user_client: Optional[hvac.Client] = None) -> Dict:
        vc = self._client(user_client)
        try:
            secret = vc.secrets.kv.v2.read_secret_version(path=path)
            return secret["data"]["data"]
        except InvalidPath:
            raise FileNotFoundError(f"No secret found at {path}")
        except Forbidden as e:
            raise PermissionError(f"Vault permission denied: {e}")
        except Exception as e:
            raise RuntimeError(f"Failed to read secret from Vault: {e}")

    def write_secret(
        self,
        path: str,
        secret: Dict,
        user_client: Optional[hvac.Client] = None,
        cas: Optional[int] = None,
    ) -> None:
        vc = self._client(user_client)
        try:
            vc.secrets.kv.v2.create_or_update_secret(
                path=path,
                secret=secret,
                cas=cas,
            )
        except InvalidRequest as e:
            err_msg = str(e).lower()
            if cas is not None and ("check-and-set" in err_msg or "cas" in err_msg):
                raise FileExistsError(
                    f"Secret at {path} already exists or version mismatch"
                ) from e
            raise RuntimeError(f"Vault write rejected: {e}") from e
        except Forbidden as e:
            raise PermissionError(f"Vault permission denied: {e}") from e
        except Exception as e:
            raise RuntimeError(f"Failed to write secret to Vault: {e}")

    def update_metadata(
        self,
        path: str,
        custom_metadata: Dict[str, str],
        user_client: Optional[hvac.Client] = None,
    ) -> None:
        vc = self._client(user_client)
        try:
            vc.secrets.kv.v2.update_metadata(
                path=path,
                custom_metadata=custom_metadata,
            )
        except Exception as e:
            # Non-fatal: metadata is a convenience optimisation.
            logger.warning("Failed to write metadata for %s: %s", path, e)

    def delete_secret(self, path: str, user_client: Optional[hvac.Client] = None) -> None:
        vc = self._client(user_client)
        try:
            vc.secrets.kv.v2.delete_metadata_and_all_versions(path=path)
        except InvalidPath:
            return  # Already gone
        except Forbidden as e:
            raise PermissionError(f"Vault permission denied: {e}") from e
        except Exception as e:
            raise RuntimeError(f"Failed to delete secret from Vault: {e}")

    def secret_exists(self, path: str, user_client: Optional[hvac.Client] = None) -> bool:
        vc = self._client(user_client)
        try:
            vc.secrets.kv.v2.read_secret_metadata(path=path)
            return True
        except InvalidPath:
            return False
        except Exception:
            return False

    def read_metadata(self, path: str, user_client: Optional[hvac.Client] = None) -> Dict:
        vc = self._client(user_client)
        try:
            return vc.secrets.kv.v2.read_secret_metadata(path=path)
        except InvalidPath:
            raise FileNotFoundError(f"No secret found at {path}")
        except Forbidden as e:
            raise PermissionError(f"Vault permission denied: {e}") from e
        except Exception as e:
            raise RuntimeError(f"Failed to read metadata from Vault: {e}")

    def list_secrets(self, path: str, user_client: Optional[hvac.Client] = None) -> List[str]:
        vc = self._client(user_client)
        try:
            result = vc.secrets.kv.v2.list_secrets(path=path)
            keys = result["data"]["keys"]
            return [k.rstrip("/") for k in keys]
        except InvalidPath:
            return []
        except Exception as e:
            raise RuntimeError(f"Failed to list secrets from Vault: {e}")


# Module-level singleton accessor (convenience)
def get_vault_client() -> VaultClient:
    return VaultClient()