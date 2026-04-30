# backend/app/services/LabInstance/utils.py
"""
Lab Instance Service Utilities
Shared helpers for launch, terminate, refresh, and connection management.
"""

import uuid
import json
import logging
import os
from datetime import datetime, timezone  # ← Added timezone
from typing import Optional, List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError

from sqlalchemy.orm import Session

from app.core.logging import log_task
from app.models.LabDefinition.LabInstance import LabInstance
from app.models.LabDefinition.LabGuide import GuideVersion
from app.config.connection.vcenter_client import VCenterClient
from app.config.connection.vault_client import VaultClient
from app.services.vault.credentials import read_credentials, list_admin_vcenters

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
#  THREADING / TIMEOUT
# ═══════════════════════════════════════════════════════════════════════════════

def _call_with_timeout(func, timeout_sec: int, *args, **kwargs):
    """
    Run a blocking function in a thread with a timeout.
    Safe inside Celery ForkPoolWorkers.
    """
    with ThreadPoolExecutor(max_workers=1) as ex:
        future = ex.submit(func, *args, **kwargs)
        try:
            return future.result(timeout=timeout_sec)
        except FutureTimeoutError:
            raise TimeoutError(f"{func.__name__} timed out after {timeout_sec}s")


# ═══════════════════════════════════════════════════════════════════════════════
#  SESSION STATE HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _compute_max_score(db: Session, guide_version_id: Optional[uuid.UUID]) -> int:
    """Sum points from all steps in a guide version (best-effort)."""
    if not guide_version_id:
        return 0
    version = db.query(GuideVersion).filter(GuideVersion.id == guide_version_id).first()
    if not version or not version.steps:
        return 0
    return sum(step.get("points", 0) for step in version.steps)


def _build_initial_session_state(
    instance_id: uuid.UUID,
    lab_definition_id: uuid.UUID,
    guide_version_id: Optional[uuid.UUID],
    trainee_id: uuid.UUID,
    max_score: int = 0,
) -> dict:
    """Build the initial session_state JSONB for a newly created instance."""
    return {
        "runtime_context": {
            "session_id": str(instance_id),
            "lab_definition_id": str(lab_definition_id),
            "guide_version_id": str(guide_version_id) if guide_version_id else None,
            "user_id": str(trainee_id),
            "vm_mappings": [],
            "default_vm": None,
            # ← FIX: timezone-aware UTC
            "started_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": None,
        },
        "step_states": [],
        "total_score": 0,
        "max_score": max_score,
        "status": "active",
    }


def _mark_session_abandoned(instance: LabInstance) -> bool:
    """
    Update session_state to reflect that the lab was abandoned/terminated.

    Returns True if state was mutated, False if no session_state existed.
    Callers must ensure SQLAlchemy detects the change and commit.
    """
    if not instance.session_state:
        return False

    # Defensive copy to trigger SQLAlchemy change detection
    state = dict(instance.session_state)
    state["status"] = "abandoned"
    if state.get("runtime_context"):
        state["runtime_context"] = dict(state["runtime_context"])
        # ← FIX: timezone-aware UTC
        state["runtime_context"]["expires_at"] = datetime.now(timezone.utc).isoformat()
    instance.session_state = state
    return True


# ═══════════════════════════════════════════════════════════════════════════════
#  VCENTER DISCOVERY
# ═══════════════════════════════════════════════════════════════════════════════

def _list_all_admin_ids() -> List[str]:
    try:
        ids = VaultClient().list_secrets("credentials/admin")
        logger.info("Listed %d admin ID(s) from Vault", len(ids))
        return ids
    except RuntimeError as e:
        logger.error("Failed to list admin IDs from Vault: %s", e)
        return []


def _find_vcenter_for_template(source_vm_id: str) -> Optional[Dict[str, str]]:
    logger.info("Searching for template %s across all vCenters", source_vm_id)
    admin_ids = _list_all_admin_ids()
    if not admin_ids:
        logger.warning("No admin IDs found in Vault")
        return None

    for admin_id in admin_ids:
        try:
            hosts = list_admin_vcenters(admin_id)
            logger.info("Admin %s has %d vCenter(s)", admin_id, len(hosts))
            for host in hosts:
                path = f"credentials/admin/{admin_id}/{host}"
                try:
                    creds = read_credentials(path)
                    host_value = creds.get("host", "").strip().lower()
                    username = creds.get("username", "")
                    password = creds.get("password", "")
                    if not host_value:
                        continue

                    logger.info(
                        "Checking vCenter %s for template %s",
                        host_value,
                        source_vm_id,
                    )
                    client = VCenterClient(
                        host=host_value,
                        username=username,
                        password=password,
                    )
                    if client.connect():
                        try:
                            vm = client.find_vm_by_uuid(source_vm_id)
                            if vm:
                                logger.info(
                                    "Found template %s on vCenter %s (admin=%s)",
                                    source_vm_id,
                                    host_value,
                                    admin_id,
                                )
                                return {
                                    "host": host_value,
                                    "username": username,
                                    "password": password,
                                }
                        finally:
                            client.disconnect()
                except Exception as e:
                    logger.info(
                        "Skip vCenter %s for admin %s: %s",
                        host,
                        admin_id,
                        e,
                    )
                    continue
        except Exception as e:
            logger.info("Skip admin %s: %s", admin_id, e)
            continue

    logger.error("Template %s not found on any vCenter", source_vm_id)
    return None


def _find_vcenter_credentials(vcenter_host: str) -> Optional[Dict[str, str]]:
    logger.info("Looking up credentials for vCenter host %s", vcenter_host)
    admin_ids = _list_all_admin_ids()
    target = vcenter_host.strip().lower()

    for admin_id in admin_ids:
        try:
            hosts = list_admin_vcenters(admin_id)
            for host in hosts:
                path = f"credentials/admin/{admin_id}/{host}"
                try:
                    creds = read_credentials(path)
                    if creds.get("host", "").strip().lower() == target:
                        logger.info(
                            "Found credentials for %s under admin %s",
                            target,
                            admin_id,
                        )
                        return {
                            "host": target,
                            "username": creds.get("username", ""),
                            "password": creds.get("password", ""),
                        }
                except Exception:
                    continue
        except Exception:
            continue

    logger.warning("No credentials found for vCenter host %s", vcenter_host)
    return None


# ═══════════════════════════════════════════════════════════════════════════════
#  GUACAMOLE CONNECTION HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _resolve_keycloak_username(db: Session, trainee_id: uuid.UUID) -> Optional[str]:
    from app.services.user_service import user_service

    try:
        user = user_service.get_by_id(db, trainee_id)
    except Exception as e:
        logger.warning(
            "Failed to load user %s for Guacamole permission sync: %s",
            trainee_id,
            e,
        )
        return None
    if not user or not user.username:
        logger.warning(
            "No username found for trainee %s — skipping permission sync",
            trainee_id,
        )
        return None
    return user.username


def _default_port(protocol: str) -> int:
    port = {"ssh": 22, "rdp": 3389, "vnc": 5901}.get(protocol.lower(), 22)
    logger.info("Default port for %s = %d", protocol, port)
    return port


def _load_connections_map(instance: LabInstance) -> Dict[str, str]:
    raw = getattr(instance, "guacamole_connections", None)

    # ── DEFENSIVE: Handle [] or null from DB ─────────────────────────────
    if raw is None or raw == [] or raw == "{}":
        logger.info(
            "Normalized empty guacamole_connections for instance %s",
            instance.id,
        )
        return {}

    if isinstance(raw, dict):
        copied = dict(raw)
        logger.info(
            "Loaded connections map for instance %s: %d entries",
            instance.id,
            len(copied),
        )
        return copied
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            logger.info(
                "Parsed connections JSON string for instance %s: %d entries",
                instance.id,
                len(parsed),
            )
            return parsed
        except json.JSONDecodeError:
            logger.warning(
                "Failed to parse guacamole_connections JSON for instance %s. Raw: %s",
                instance.id,
                raw,
            )
            return {}
    logger.info(
        "No connections map found for instance %s (raw type=%s)",
        instance.id,
        type(raw).__name__,
    )
    return {}


def _save_connections_map(instance: LabInstance, mapping: Dict[str, str]) -> None:
    from app.services.guacamole_service import guacamole_service

    # Defensive copy to trigger SQLAlchemy change detection
    instance.guacamole_connections = dict(mapping)
    logger.info(
        "Saved connections map for instance %s: %s",
        instance.id,
        mapping,
    )
    if mapping:
        first_key = next(iter(mapping))
        instance.guacamole_connection_id = mapping[first_key]
        instance.connection_url = guacamole_service.get_connection_url(mapping[first_key])
        logger.info(
            "Legacy fields updated for instance %s: conn_id=%s url=%s",
            instance.id,
            instance.guacamole_connection_id,
            instance.connection_url,
        )
    else:
        instance.guacamole_connection_id = None
        instance.connection_url = None
        logger.info(
            "Legacy fields cleared for instance %s (empty mapping)",
            instance.id,
        )


def _read_lab_connection_creds(slug: str, protocol: str) -> Optional[Dict[str, Any]]:
    vault_path = f"credentials/lab_connections/{slug}/{protocol}"
    logger.info("Reading credentials from Vault: %s", vault_path)
    try:
        creds = read_credentials(vault_path)
        result = {
            "username": creds.get("username", ""),
            "password": creds.get("password", ""),
            "port": int(creds.get("port", _default_port(protocol))),
        }
        logger.info(
            "Successfully read credentials from Vault: %s (user=%s, port=%s)",
            vault_path,
            result["username"],
            result["port"],
        )
        return result
    except Exception as e:
        logger.error(
            "Failed to read lab connection credentials from %s: %s",
            vault_path,
            e,
        )
        return None


def _sync_guacamole_connections(
    db: Session,
    instance: LabInstance,
    lab,
    ip_address: str,
) -> None:
    from app.services.guacamole_service import guacamole_service

    if instance.status in ("terminating", "terminated", "stopped"):
        logger.info(
            "Instance %s is in terminal state '%s'; skipping sync",
            instance.id,
            instance.status,
        )
        return

    slots = getattr(lab, "connection_slots", None) or []
    if not slots:
        logger.info(
            "Lab %s has no connection_slots, nothing to sync",
            lab.id,
        )
        return

    if isinstance(slots, str):
        try:
            slots = json.loads(slots)
            logger.info(
                "Parsed connection_slots JSON string for lab %s",
                lab.id,
            )
        except json.JSONDecodeError:
            logger.error(
                "Invalid connection_slots JSON on lab %s",
                lab.id,
            )
            return

    connections_map = _load_connections_map(instance)
    initial_count = len(connections_map)
    logger.info(
        "Starting sync for instance %s (lab=%s, ip=%s). Existing connections: %d",
        instance.id,
        lab.id,
        ip_address,
        initial_count,
    )

    keycloak_username = _resolve_keycloak_username(db, instance.trainee_id)
    if keycloak_username:
        try:
            guacamole_service.ensure_user(keycloak_username)
        except Exception as e:
            logger.warning(
                "Failed to ensure Guacamole user %s: %s",
                keycloak_username,
                e,
            )

    for slot in slots:
        if not isinstance(slot, dict):
            logger.warning(
                "Skipping non-dict slot: %s (type=%s)",
                slot,
                type(slot).__name__,
            )
            continue

        slug = slot.get("slug")
        if not slug:
            logger.warning(
                "Skipping slot with missing slug: %s",
                slot,
            )
            continue

        logger.info(
            "Processing slot: slug=%s ssh=%s rdp=%s vnc=%s",
            slug,
            slot.get("ssh", False),
            slot.get("rdp", False),
            slot.get("vnc", False),
        )

        for protocol in ("ssh", "rdp", "vnc"):
            if not slot.get(protocol):
                logger.info(
                    "Protocol %s not enabled for slot '%s', skipping",
                    protocol,
                    slug,
                )
                continue

            creds = _read_lab_connection_creds(slug, protocol)
            if not creds:
                logger.warning(
                    "Skipping %s/%s — no credentials in Vault. "
                    "Ensure credentials exist at credentials/lab_connections/%s/%s",
                    slug,
                    protocol,
                    slug,
                    protocol,
                )
                continue

            conn_key = f"{slug}_{protocol}"
            existing_id = connections_map.get(conn_key)

            try:
                if existing_id:
                    logger.info(
                        "Updating existing %s connection %s for %s/%s "
                        "(ip=%s, port=%s, user=%s)",
                        protocol,
                        existing_id,
                        slug,
                        instance.id,
                        ip_address,
                        creds["port"],
                        creds["username"],
                    )
                    guacamole_service.update_connection(
                        connection_id=existing_id,
                        hostname=ip_address,
                        port=creds["port"],
                        username=creds["username"],
                        password=creds["password"],
                    )
                    logger.info(
                        "Updated Guacamole %s connection %s",
                        protocol,
                        existing_id,
                    )
                else:
                    conn_name = (
                        f"{lab.slug}-{slug}-{protocol}-{str(instance.id)[:8]}"
                    )
                    logger.info(
                        "Creating new %s connection '%s' for %s/%s "
                        "(ip=%s, port=%s, user=%s)",
                        protocol,
                        conn_name,
                        slug,
                        instance.id,
                        ip_address,
                        creds["port"],
                        creds["username"],
                    )
                    conn_id = guacamole_service.create_connection(
                        name=conn_name,
                        protocol=protocol,
                        hostname=ip_address,
                        port=creds["port"],
                        username=creds["username"],
                        password=creds["password"],
                    )
                    connections_map[conn_key] = conn_id
                    logger.info(
                        "Created Guacamole %s connection %s for %s/%s",
                        protocol,
                        conn_id,
                        slug,
                        instance.id,
                    )

                target_id = existing_id or connections_map.get(conn_key)
                if keycloak_username and target_id:
                    try:
                        guacamole_service.grant_connection_permission(
                            keycloak_username, target_id
                        )
                    except Exception as e:
                        logger.warning(
                            "Failed to grant READ on %s to %s: %s",
                            target_id,
                            keycloak_username,
                            e,
                        )

            except Exception as e:
                logger.error(
                    "Failed to setup Guacamole %s for %s/%s: %s",
                    protocol,
                    slug,
                    instance.id,
                    e,
                    exc_info=True,
                )

    _save_connections_map(instance, connections_map)
    db.commit()

    final_count = len(connections_map)
    if final_count > initial_count:
        logger.info(
            "Sync complete for instance %s. Created %d new connection(s). Total: %d",
            instance.id,
            final_count - initial_count,
            final_count,
        )
    else:
        logger.info(
            "Sync complete for instance %s. Connections unchanged. Total: %d",
            instance.id,
            final_count,
        )


def _delete_guacamole_connections(
    instance: LabInstance,
    db: Optional[Session] = None,
) -> None:
    """
    Revoke Guacamole connection permissions and delete the connections
    from the Guacamole server, BUT preserve the connection metadata
    in the LabInstance DB record for admin audit/history.
    """
    from app.services.guacamole_service import guacamole_service

    connections_map = _load_connections_map(instance)
    logger.info(
        "Revoking %d Guacamole connection(s) for instance %s",
        len(connections_map),
        instance.id,
    )

    keycloak_username: Optional[str] = None
    if db is not None:
        keycloak_username = _resolve_keycloak_username(db, instance.trainee_id)

    deleted = 0
    failed = 0

    for key, conn_id in list(connections_map.items()):
        if keycloak_username:
            try:
                guacamole_service.revoke_connection_permission(
                    keycloak_username, conn_id
                )
            except Exception as e:
                logger.info(
                    "Revoke permission %s/%s failed (non-fatal): %s",
                    keycloak_username,
                    conn_id,
                    e,
                )
        try:
            logger.info(
                "Deleting connection %s (%s) from Guacamole",
                conn_id,
                key,
            )
            guacamole_service.delete_connection(conn_id)
            logger.info(
                "Deleted Guacamole connection %s (%s)",
                conn_id,
                key,
            )
            deleted += 1
        except Exception as e:
            logger.error(
                "Failed to delete Guacamole connection %s (%s): %s",
                conn_id,
                key,
                e,
                exc_info=True,
            )
            failed += 1

    # ── PRESERVE connection metadata for admin audit ─────────────────────
    # DO NOT clear the DB record. The admin dashboard needs to see what
    # connections were assigned even after termination.    
    #_save_connections_map(instance, {})
    logger.info(
        "Cleanup complete for instance %s: %d deleted, %d failed",
        instance.id,
        deleted,
        failed,
    )