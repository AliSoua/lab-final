# backend/app/services/guacamole_service.py
import os
import uuid
import logging
from typing import Optional, Dict, Any

import requests

logger = logging.getLogger(__name__)

GUACAMOLE_API = os.getenv("GUACAMOLE_API_URL", "http://guacamole:8080/guacamole/api")
ADMIN_USER = os.getenv("GUACAMOLE_ADMIN_USER", "guacadmin")
ADMIN_PASS = os.getenv("GUACAMOLE_ADMIN_PASS", "guacadmin")


class GuacamoleService:
    """
    Manages Guacamole connections via REST API.
    Each lab instance gets a dedicated connection that is cleaned up on termination.
    """

    def __init__(self):
        self._token: Optional[str] = None
        self._token_source: str = "guacadmin"

    def _auth(self) -> str:
        """Get admin auth token. Reuses cached token."""
        if self._token:
            return self._token

        r = requests.post(
            f"{GUACAMOLE_API}/tokens",
            data={"username": ADMIN_USER, "password": ADMIN_PASS},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        self._token = data["authToken"]
        self._token_source = data.get("username", ADMIN_USER)
        logger.info("Guacamole auth token acquired for %s", self._token_source)
        return self._token

    def _headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
        }

    def _params(self) -> Dict[str, str]:
        return {"token": self._auth()}

    def create_connection(
        self,
        name: str,
        protocol: str,  # "rdp", "ssh", "vnc"
        hostname: str,
        port: int,
        username: Optional[str] = None,
        password: Optional[str] = None,
        width: int = 800,
        height: int = 600,
        dpi: int = 96,
    ) -> str:
        """
        Create a Guacamole connection and return its identifier.
        """
        payload: Dict[str, Any] = {
            "parentIdentifier": "ROOT",
            "name": name,
            "protocol": protocol,
            "attributes": {
                "max-connections": "1",
                "max-connections-per-user": "1",
            },
            "parameters": {
                "hostname": hostname,
                "port": str(port),
                "width": str(width),
                "height": str(height),
                "dpi": str(dpi),
                "ignore-cert": "true",
                "security": "any",  # For RDP labs with varying configs
                "server-layout": "en-us-qwerty",
            },
        }

        if username:
            payload["parameters"]["username"] = username
        if password:
            payload["parameters"]["password"] = password

        # RDP-specific defaults for lab environments
        if protocol == "rdp":
            payload["parameters"].update({
                "color-depth": "24",
                "force-lossless": "false",
                "resize-method": "display-update",
            })

        # SSH-specific defaults
        if protocol == "ssh":
            payload["parameters"].update({
                "font-size": "12",
                "color-scheme": "gray-black",
            })

        r = requests.post(
            f"{GUACAMOLE_API}/session/data/postgresql/connections",
            headers=self._headers(),
            params=self._params(),
            json=payload,
            timeout=10,
        )
        r.raise_for_status()
        conn_id = r.json()["identifier"]
        logger.info("Created Guacamole connection %s for %s", conn_id, name)
        return conn_id

    def get_connection(self, connection_id: str) -> Dict[str, Any]:
        """Fetch connection details."""
        r = requests.get(
            f"{GUACAMOLE_API}/session/data/postgresql/connections/{connection_id}",
            params=self._params(),
            timeout=10,
        )
        r.raise_for_status()
        return r.json()

    def update_connection(
        self,
        connection_id: str,
        hostname: Optional[str] = None,
        port: Optional[int] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
    ) -> None:
        """Update connection parameters (e.g., after IP changes)."""
        # Fetch existing first, then patch
        existing = self.get_connection(connection_id)

        payload = {
            "parentIdentifier": existing.get("parentIdentifier", "ROOT"),
            "name": existing.get("name", "unnamed"),
            "protocol": existing.get("protocol", "rdp"),
            "attributes": existing.get("attributes", {}),
            "parameters": existing.get("parameters", {}),
        }

        if hostname is not None:
            payload["parameters"]["hostname"] = hostname
        if port is not None:
            payload["parameters"]["port"] = str(port)
        if username is not None:
            payload["parameters"]["username"] = username
        if password is not None:
            payload["parameters"]["password"] = password

        r = requests.put(
            f"{GUACAMOLE_API}/session/data/postgresql/connections/{connection_id}",
            headers=self._headers(),
            params=self._params(),
            json=payload,
            timeout=10,
        )
        r.raise_for_status()
        logger.info("Updated Guacamole connection %s", connection_id)

    def delete_connection(self, connection_id: str) -> None:
        """Remove a connection permanently."""
        r = requests.delete(
            f"{GUACAMOLE_API}/session/data/postgresql/connections/{connection_id}",
            params=self._params(),
            timeout=10,
        )
        if r.status_code == 404:
            logger.warning("Guacamole connection %s already deleted", connection_id)
            return
        r.raise_for_status()
        logger.info("Deleted Guacamole connection %s", connection_id)

    def get_connection_url(self, connection_id: str) -> str:
        """
        Direct Guacamole client URL.
        User must be authenticated to Guacamole (via shared cookie or SSO).
        """
        # External URL should come from env in production
        external_base = os.getenv("GUACAMOLE_EXTERNAL_URL", "http://localhost:8081/guacamole")
        return f"{external_base}/#/client/{connection_id}"

    def create_sharing_profile(
        self,
        connection_id: str,
        name: str = "view-only",
        read_only: bool = True,
    ) -> str:
        """
        Create a sharing profile for read-only observers (instructor view).
        Returns sharing profile ID.
        """
        payload = {
            "primaryConnectionIdentifier": connection_id,
            "name": name,
            "attributes": {},
            "parameters": {
                "read-only": "true" if read_only else "false",
            },
        }

        r = requests.post(
            f"{GUACAMOLE_API}/session/data/postgresql/connections/{connection_id}/sharingProfiles",
            headers=self._headers(),
            params=self._params(),
            json=payload,
            timeout=10,
        )
        r.raise_for_status()
        profile_id = r.json()["identifier"]
        logger.info("Created sharing profile %s for connection %s", profile_id, connection_id)
        return profile_id

    def generate_temporary_link(
        self,
        connection_id: str,
        valid_minutes: int = 240,
    ) -> str:
        """
        Generate a time-limited sharing link.
        Requires the sharing profile extension or custom proxy.
        Simplified: returns the direct connection URL with a note.
        """
        # For true temporary links, you need guacamole-auth-json or a custom extension.
        # This returns the standard connection URL for now.
        url = self.get_connection_url(connection_id)
        logger.info("Generated access link for connection %s (valid %d min)", connection_id, valid_minutes)
        return url


guacamole_service = GuacamoleService()