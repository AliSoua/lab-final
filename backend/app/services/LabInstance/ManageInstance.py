# app/services/LabInstance/ManageInstance.py
"""
Lab Instance Management Service
Synchronous CRUD and lifecycle operations: get, list, stop, refresh.
"""

import uuid
import logging
from datetime import datetime
from typing import Optional, List, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.LabDefinition.LabInstance import LabInstance
from app.config.connection.vcenter_client import VCenterClient
from app.services.LabInstance.utils import _call_with_timeout, _find_vcenter_credentials

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
#  GET & LIST
# ═══════════════════════════════════════════════════════════════════════════════

def get_instance(
    db: Session,
    instance_id: uuid.UUID,
    trainee_id: uuid.UUID,
) -> Optional[LabInstance]:
    instance = (
        db.query(LabInstance)
        .filter(
            LabInstance.id == instance_id,
            LabInstance.trainee_id == trainee_id,
        )
        .first()
    )
    if instance:
        logger.debug(
            "[GET] Instance %s found for trainee %s (status=%s)",
            instance_id,
            trainee_id,
            instance.status,
        )
    else:
        logger.debug(
            "[GET] Instance %s not found for trainee %s",
            instance_id,
            trainee_id,
        )
    return instance


def list_instances(
    db: Session,
    trainee_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[LabInstance], int]:
    logger.debug(
        "[LIST] Listing instances for trainee %s (skip=%s, limit=%s)",
        trainee_id,
        skip,
        limit,
    )
    query = db.query(LabInstance).filter(LabInstance.trainee_id == trainee_id)
    total = query.count()
    items = (
        query.order_by(desc(LabInstance.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )
    logger.debug("[LIST] Found %d instances (total=%d)", len(items), total)
    return items, total


# ═══════════════════════════════════════════════════════════════════════════════
#  STOP
# ═══════════════════════════════════════════════════════════════════════════════

def stop_instance(
    db: Session,
    instance_id: uuid.UUID,
    trainee_id: uuid.UUID,
) -> LabInstance:
    logger.info(
        "[STOP] Stopping instance %s for trainee %s",
        instance_id,
        trainee_id,
    )
    instance = get_instance(db, instance_id, trainee_id)
    if not instance:
        logger.error("[STOP] Instance %s not found", instance_id)
        raise ValueError("Instance not found")

    if instance.status in ("terminated", "stopped"):
        logger.info(
            "[STOP] Instance %s already %s, returning as-is",
            instance_id,
            instance.status,
        )
        return instance

    if instance.vm_uuid and instance.vcenter_host:
        logger.debug(
            "[STOP] Connecting to vCenter %s to power off VM %s",
            instance.vcenter_host,
            instance.vm_uuid,
        )
        creds = _find_vcenter_credentials(instance.vcenter_host)
        if creds:
            client = VCenterClient(
                host=creds["host"],
                username=creds["username"],
                password=creds["password"],
            )
            if client.connect():
                try:
                    vm = client.find_vm_by_uuid(instance.vm_uuid)
                    if vm and str(vm.runtime.powerState) == "poweredOn":
                        logger.info(
                            "[STOP] Powering off VM %s",
                            instance.vm_uuid,
                        )
                        task = vm.PowerOffVM_Task()
                        client._wait_for_task(task)
                        logger.info(
                            "[STOP] VM %s powered off successfully",
                            instance.vm_uuid,
                        )
                    instance.power_state = "poweredOff"
                except Exception as e:
                    logger.warning(
                        "[STOP] Failed to power off VM %s: %s",
                        instance.vm_uuid,
                        e,
                    )
                finally:
                    client.disconnect()
            else:
                logger.warning(
                    "[STOP] Could not connect to vCenter %s",
                    instance.vcenter_host,
                )
        else:
            logger.warning(
                "[STOP] No credentials found for vCenter %s",
                instance.vcenter_host,
            )

    instance.status = "stopped"
    instance.stopped_at = datetime.utcnow()

    # ── Pause session state if runtime data exists ──────────────────────────
    if instance.session_state:
        instance.session_state["status"] = "paused"
        for mapping in instance.session_state.get("runtime_context", {}).get("vm_mappings", []):
            if mapping.get("vm_name") == instance.vm_name:
                mapping["status"] = "stopped"

    db.commit()
    db.refresh(instance)
    logger.info(
        "[STOP] Instance %s stopped at %s",
        instance_id,
        instance.stopped_at,
    )
    return instance


# ═══════════════════════════════════════════════════════════════════════════════
#  REFRESH
# ═══════════════════════════════════════════════════════════════════════════════

def refresh_instance_status(
    db: Session,
    instance_id: uuid.UUID,
    trainee_id: uuid.UUID,
) -> Optional[LabInstance]:
    """
    Refresh VM state from vCenter and sync Guacamole connections.
    Wraps vCenter calls in a thread timeout so the HTTP request cannot hang.
    May transition status from 'provisioning' → 'running' when the VM is
    powered on and has an IP address.
    """
    logger.info(
        "[REFRESH] Refreshing status for instance %s (trainee=%s)",
        instance_id,
        trainee_id,
    )
    instance = get_instance(db, instance_id, trainee_id)
    if not instance:
        logger.error("[REFRESH] Instance %s not found", instance_id)
        return None

    if instance.status in ("terminating", "terminated", "stopped"):
        logger.debug(
            "[REFRESH] Instance %s is in terminal state '%s'; skipping sync",
            instance_id,
            instance.status,
        )
        return instance

    if not instance.vm_uuid or not instance.vcenter_host:
        logger.warning(
            "[REFRESH] Instance %s missing vm_uuid or vcenter_host, skipping refresh",
            instance_id,
        )
        return instance

    creds = _find_vcenter_credentials(instance.vcenter_host)
    if not creds:
        logger.error(
            "[REFRESH] No vCenter credentials found for host %s",
            instance.vcenter_host,
        )
        return instance

    client = VCenterClient(
        host=creds["host"],
        username=creds["username"],
        password=creds["password"],
    )
    if not client.connect():
        logger.error(
            "[REFRESH] Failed to connect to vCenter %s",
            instance.vcenter_host,
        )
        return instance

    try:
        vm = client.find_vm_by_uuid(instance.vm_uuid)
        if not vm:
            logger.warning(
                "[REFRESH] VM %s not found in vCenter",
                instance.vm_uuid,
            )
            return instance

        # ── Refresh power state & IP ──────────────────────────────────────
        power_state = _call_with_timeout(
            client.get_vm_power_state, 40, instance.vm_uuid
        )
        ip_address = _call_with_timeout(
            client.get_vm_ip, 120, instance.vm_uuid
        )

        instance.power_state = power_state
        instance.ip_address = ip_address

        # ── Update session_state VM mapping ───────────────────────────────
        if instance.session_state:
            runtime_ctx = instance.session_state.get("runtime_context", {})
            vm_mappings = runtime_ctx.get("vm_mappings", [])
            for mapping in vm_mappings:
                if mapping.get("vm_name") == instance.vm_name:
                    mapping["ip_address"] = ip_address
                    mapping["status"] = (
                        "running" if power_state == "poweredOn" else "stopped"
                    )
            runtime_ctx["vm_mappings"] = vm_mappings
            instance.session_state["runtime_context"] = runtime_ctx

        # ── Sync Guacamole connections (best-effort) ──────────────────────
        if power_state == "poweredOn" and ip_address:
            from app.services.guacamole_service import guacamole_service

            # Ensure existing connection entries are still valid
            existing = instance.guacamole_connections or {}
            synced = {}
            for key, conn_id in existing.items():
                try:
                    # Lightweight health check via Guacamole API
                    healthy = guacamole_service.connection_exists(conn_id)
                    if healthy:
                        synced[key] = conn_id
                    else:
                        logger.debug(
                            "[REFRESH] Guacamole connection %s stale, removing", conn_id
                        )
                except Exception as e:
                    logger.warning(
                        "[REFRESH] Guacamole check failed for %s: %s", conn_id, e
                    )
                    synced[key] = conn_id  # keep on error to avoid disruption

            instance.guacamole_connections = synced

            # ── Transition provisioning → running ─────────────────────────
            if instance.status == "provisioning":
                instance.status = "running"
                if instance.session_state:
                    instance.session_state["status"] = "active"
                logger.info(
                    "[REFRESH] Instance %s transitioned provisioning → running",
                    instance_id,
                )

        db.commit()
        db.refresh(instance)
        logger.info(
            "[REFRESH] Instance %s refreshed: status=%s power=%s ip=%s",
            instance_id,
            instance.status,
            power_state,
            ip_address,
        )

    except Exception as e:
        logger.error(
            "[REFRESH] Error refreshing instance %s: %s",
            instance_id,
            e,
            exc_info=True,
        )
    finally:
        client.disconnect()

    return instance