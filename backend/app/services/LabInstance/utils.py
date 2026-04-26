# backend/app/services/LabInstance/utils.py
"""
Lab Instance Service Utilities
Shared helpers for launch, terminate, refresh, and connection management.
"""

import uuid
import json
import logging
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError

from sqlalchemy.orm import Session

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
    """Run a blocking function in a thread with a timeout. Safe inside Celery ForkPoolWorkers."""
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
            "started_at": datetime.utcnow().isoformat(),
            "expires_at": None,
        },
        "step_states": [],
        "total_score": 0,
        "max_score": max_score,
        "status": "active",
    }


def _mark_session_abandoned(instance: LabInstance) -> None:
    """Update session_state to reflect that the lab was abandoned/terminated."""
    if instance.session_state:
        instance.session_state["status"] = "abandoned"
        if instance.session_state.get("runtime_context"):
            instance.session_state["runtime_context"]["expires_at"] = (
                datetime.utcnow().isoformat()
            )


# ═══════════════════════════════════════════════════════════════════════════════
#  VCENTER DISCOVERY
# ═══════════════════════════════════════════════════════════════════════════════

def _list_all_admin_ids() -> List[str]:
    try:
        ids = VaultClient().list_secrets("credentials/admin")
        logger.debug(
            "[VCENTER] Listed %d admin ID(s) from Vault",
            len(ids),
        )
        return ids
    except RuntimeError as e:
        logger.error(
            "[VCENTER] Failed to list admin IDs from Vault: %s",
            e,
        )
        return []


def _find_vcenter_for_template(source_vm_id: str) -> Optional[Dict[str, str]]:
    logger.debug(
        "[VCENTER] Searching for template %s across all vCenters",
        source_vm_id,
    )
    admin_ids = _list_all_admin_ids()
    if not admin_ids:
        logger.warning("[VCENTER] No admin IDs found in Vault")
        return None

    for admin_id in admin_ids:
        try:
            hosts = list_admin_vcenters(admin_id)
            logger.debug(
                "[VCENTER] Admin %s has %d vCenter(s)",
                admin_id,
                len(hosts),
            )
            for host in hosts:
                path = f"credentials/admin/{admin_id}/{host}"
                try:
                    creds = read_credentials(path)
                    host_value = creds.get("host", "").strip().lower()
                    username = creds.get("username", "")
                    password = creds.get("password", "")
                    if not host_value:
                        continue

                    logger.debug(
                        "[VCENTER] Checking vCenter %s for template %s",
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
                                    "[VCENTER] Found template %s on vCenter %s (admin=%s)",
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
                    logger.debug(
                        "[VCENTER] Skip vCenter %s for admin %s: %s",
                        host,
                        admin_id,
                        e,
                    )
                    continue
        except Exception as e:
            logger.debug("[VCENTER] Skip admin %s: %s", admin_id, e)
            continue

    logger.error(
        "[VCENTER] Template %s not found on any vCenter",
        source_vm_id,
    )
    return None


def _find_vcenter_credentials(vcenter_host: str) -> Optional[Dict[str, str]]:
    logger.debug(
        "[VCENTER] Looking up credentials for vCenter host %s",
        vcenter_host,
    )
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
                        logger.debug(
                            "[VCENTER] Found credentials for %s under admin %s",
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

    logger.warning(
        "[VCENTER] No credentials found for vCenter host %s",
        vcenter_host,
    )
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
            "[GUAC] Failed to load user %s for Guacamole permission sync: %s",
            trainee_id,
            e,
        )
        return None
    if not user or not user.username:
        logger.warning(
            "[GUAC] No username found for trainee %s — skipping permission sync",
            trainee_id,
        )
        return None
    return user.username


def _default_port(protocol: str) -> int:
    port = {"ssh": 22, "rdp": 3389, "vnc": 5901}.get(protocol.lower(), 22)
    logger.debug("[GUAC] Default port for %s = %d", protocol, port)
    return port


def _load_connections_map(instance: LabInstance) -> Dict[str, str]:
    raw = getattr(instance, "guacamole_connections", None)
    if isinstance(raw, dict):
        copied = dict(raw)
        logger.debug(
            "[GUAC] Loaded connections map for instance %s: %d entries",
            instance.id,
            len(copied),
        )
        return copied
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            logger.debug(
                "[GUAC] Parsed connections JSON string for instance %s: %d entries",
                instance.id,
                len(parsed),
            )
            return parsed
        except json.JSONDecodeError:
            logger.warning(
                "[GUAC] Failed to parse guacamole_connections JSON for instance %s. Raw: %s",
                instance.id,
                raw,
            )
            return {}
    logger.debug(
        "[GUAC] No connections map found for instance %s (raw type=%s)",
        instance.id,
        type(raw).__name__,
    )
    return {}


def _save_connections_map(instance: LabInstance, mapping: Dict[str, str]) -> None:
    from app.services.guacamole_service import guacamole_service

    instance.guacamole_connections = dict(mapping)
    logger.debug(
        "[GUAC] Saved connections map for instance %s: %s",
        instance.id,
        mapping,
    )
    if mapping:
        first_key = next(iter(mapping))
        instance.guacamole_connection_id = mapping[first_key]
        instance.connection_url = guacamole_service.get_connection_url(mapping[first_key])
        logger.debug(
            "[GUAC] Legacy fields updated for instance %s: conn_id=%s url=%s",
            instance.id,
            instance.guacamole_connection_id,
            instance.connection_url,
        )
    else:
        instance.guacamole_connection_id = None
        instance.connection_url = None
        logger.debug(
            "[GUAC] Legacy fields cleared for instance %s (empty mapping)",
            instance.id,
        )


def _read_lab_connection_creds(slug: str, protocol: str) -> Optional[Dict[str, Any]]:
    vault_path = f"credentials/lab_connections/{slug}/{protocol}"
    logger.debug(
        "[GUAC] Reading credentials from Vault: %s",
        vault_path,
    )
    try:
        creds = read_credentials(vault_path)
        result = {
            "username": creds.get("username", ""),
            "password": creds.get("password", ""),
            "port": int(creds.get("port", _default_port(protocol))),
        }
        logger.info(
            "[GUAC] Successfully read credentials from Vault: %s (user=%s, port=%s)",
            vault_path,
            result["username"],
            result["port"],
        )
        return result
    except Exception as e:
        logger.error(
            "[GUAC] Failed to read lab connection credentials from %s: %s",
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
            "[GUAC-SYNC] Instance %s is in terminal state '%s'; skipping sync",
            instance.id,
            instance.status,
        )
        return

    slots = getattr(lab, "connection_slots", None) or []
    if not slots:
        logger.info(
            "[GUAC-SYNC] Lab %s has no connection_slots, nothing to sync",
            lab.id,
        )
        return

    if isinstance(slots, str):
        try:
            slots = json.loads(slots)
            logger.debug(
                "[GUAC-SYNC] Parsed connection_slots JSON string for lab %s",
                lab.id,
            )
        except json.JSONDecodeError:
            logger.error(
                "[GUAC-SYNC] Invalid connection_slots JSON on lab %s",
                lab.id,
            )
            return

    connections_map = _load_connections_map(instance)
    initial_count = len(connections_map)
    logger.info(
        "[GUAC-SYNC] Starting sync for instance %s (lab=%s, ip=%s). "
        "Existing connections: %d",
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
                "[GUAC-SYNC] Failed to ensure Guacamole user %s: %s",
                keycloak_username,
                e,
            )

    for slot in slots:
        if not isinstance(slot, dict):
            logger.warning(
                "[GUAC-SYNC] Skipping non-dict slot: %s (type=%s)",
                slot,
                type(slot).__name__,
            )
            continue

        slug = slot.get("slug")
        if not slug:
            logger.warning(
                "[GUAC-SYNC] Skipping slot with missing slug: %s",
                slot,
            )
            continue

        logger.debug(
            "[GUAC-SYNC] Processing slot: slug=%s ssh=%s rdp=%s vnc=%s",
            slug,
            slot.get("ssh", False),
            slot.get("rdp", False),
            slot.get("vnc", False),
        )

        for protocol in ("ssh", "rdp", "vnc"):
            if not slot.get(protocol):
                logger.debug(
                    "[GUAC-SYNC] Protocol %s not enabled for slot '%s', skipping",
                    protocol,
                    slug,
                )
                continue

            creds = _read_lab_connection_creds(slug, protocol)
            if not creds:
                logger.warning(
                    "[GUAC-SYNC] Skipping %s/%s — no credentials in Vault. "
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
                        "[GUAC-SYNC] Updating existing %s connection %s for %s/%s "
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
                    logger.debug(
                        "[GUAC-SYNC] Updated Guacamole %s connection %s",
                        protocol,
                        existing_id,
                    )
                else:
                    conn_name = (
                        f"{lab.slug}-{slug}-{protocol}-{str(instance.id)[:8]}"
                    )
                    logger.info(
                        "[GUAC-SYNC] Creating new %s connection '%s' for %s/%s "
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
                        "[GUAC-SYNC] Created Guacamole %s connection %s for %s/%s",
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
                            "[GUAC-SYNC] Failed to grant READ on %s to %s: %s",
                            target_id,
                            keycloak_username,
                            e,
                        )

            except Exception as e:
                logger.error(
                    "[GUAC-SYNC] Failed to setup Guacamole %s for %s/%s: %s",
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
            "[GUAC-SYNC] Sync complete for instance %s. "
            "Created %d new connection(s). Total: %d",
            instance.id,
            final_count - initial_count,
            final_count,
        )
    else:
        logger.info(
            "[GUAC-SYNC] Sync complete for instance %s. "
            "Connections unchanged. Total: %d",
            instance.id,
            final_count,
        )


def _delete_guacamole_connections(
    instance: LabInstance,
    db: Optional[Session] = None,
) -> None:
    from app.services.guacamole_service import guacamole_service

    connections_map = _load_connections_map(instance)
    logger.info(
        "[GUAC-DEL] Deleting %d Guacamole connection(s) for instance %s",
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
                logger.debug(
                    "[GUAC-DEL] Revoke permission %s/%s failed (non-fatal): %s",
                    keycloak_username,
                    conn_id,
                    e,
                )
        try:
            logger.debug(
                "[GUAC-DEL] Deleting connection %s (%s)",
                conn_id,
                key,
            )
            guacamole_service.delete_connection(conn_id)
            logger.info(
                "[GUAC-DEL] Deleted Guacamole connection %s (%s)",
                conn_id,
                key,
            )
            deleted += 1
        except Exception as e:
            logger.error(
                "[GUAC-DEL] Failed to delete Guacamole connection %s (%s): %s",
                conn_id,
                key,
                e,
                exc_info=True,
            )
            failed += 1

    _save_connections_map(instance, {})
    logger.info(
        "[GUAC-DEL] Cleanup complete for instance %s: %d deleted, %d failed",
        instance.id,
        deleted,
        failed,
    )