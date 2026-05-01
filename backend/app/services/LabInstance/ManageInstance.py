# backend/app/services/LabInstance/ManageInstance.py
"""
Lab Instance Management Service
Synchronous CRUD and lifecycle operations: get, list, stop, refresh.
"""

import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Tuple, Any, Dict

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.logging import log_task
from app.models.LabDefinition.core import LabDefinition
from app.models.LabDefinition.LabInstance import LabInstance
from app.models.LabInstance.enums import InstanceStatus, PowerState, TerminationReason
from app.config.connection.vcenter_client import VCenterClient
from app.utils.expiry_queue import register_instance_expiry
from app.services.LabInstance.utils import (
    _call_with_timeout,
    _find_vcenter_credentials,
    _sync_guacamole_connections,
    _delete_guacamole_connections,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
#  GET & LIST
# ═══════════════════════════════════════════════════════════════════════════════
def list_all_instances(
    db: Session,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[LabInstance], int]:
    """
    List ALL lab instances across all trainees.
    Intended for moderator / admin dashboards.
    """
    logger.info(
        "Listing all instances | skip=%s limit=%s",
        skip,
        limit,
    )
    query = db.query(LabInstance)
    total = query.count()
    items = (
        query.order_by(desc(LabInstance.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )
    logger.info(
        "All instances listed | count=%d total=%d",
        len(items),
        total,
    )
    return items, total


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
        logger.info(
            "Instance found | instance_id=%s trainee_id=%s status=%s",
            instance_id,
            trainee_id,
            instance.status,
        )
    else:
        logger.info(
            "Instance not found | instance_id=%s trainee_id=%s",
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
    logger.info(
        "Listing instances | trainee_id=%s skip=%s limit=%s",
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
    logger.info(
        "Instances listed | count=%d total=%d",
        len(items),
        total,
    )
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
        "Stopping instance | instance_id=%s trainee_id=%s",
        instance_id,
        trainee_id,
    )
    instance = get_instance(db, instance_id, trainee_id)
    if not instance:
        logger.error("Instance not found | instance_id=%s", instance_id)
        raise ValueError("Instance not found")

    if instance.status in (InstanceStatus.TERMINATED.value, InstanceStatus.STOPPED.value):
        logger.info(
            "Instance already stopped | instance_id=%s status=%s",
            instance_id,
            instance.status,
        )
        return instance

    # ── vCenter power-off (DB session NOT held during I/O) ──────────────
    if instance.vm_uuid and instance.vcenter_host:
        logger.info(
            "Connecting to vCenter | host=%s vm_uuid=%s",
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
                            "Powering off VM | vm_uuid=%s",
                            instance.vm_uuid,
                        )
                        task = vm.PowerOffVM_Task()
                        client._wait_for_task(task)
                        logger.info(
                            "VM powered off | vm_uuid=%s",
                            instance.vm_uuid,
                        )
                    instance.power_state = PowerState.POWERED_OFF.value
                except Exception as e:
                    logger.warning(
                        "Failed to power off VM | vm_uuid=%s error=%s",
                        instance.vm_uuid,
                        e,
                    )
                finally:
                    client.disconnect()
            else:
                logger.warning(
                    "Could not connect to vCenter | host=%s",
                    instance.vcenter_host,
                )
        else:
            logger.warning(
                "No credentials found for vCenter | host=%s",
                instance.vcenter_host,
            )

    # ── Update DB state ─────────────────────────────────────────────────
    instance.status = InstanceStatus.STOPPED.value
    instance.stopped_at = datetime.now(timezone.utc)

    # Pause session state if runtime data exists
    if instance.session_state:
        state = dict(instance.session_state)
        state["status"] = "paused"
        runtime = dict(state.get("runtime_context", {}))
        vm_mappings = list(runtime.get("vm_mappings", []))
        for mapping in vm_mappings:
            if mapping.get("vm_name") == instance.vm_name:
                mapping = dict(mapping)
                mapping["status"] = "stopped"
        runtime["vm_mappings"] = vm_mappings
        state["runtime_context"] = runtime
        instance.session_state = state

    db.commit()
    db.refresh(instance)
    logger.info(
        "Instance stopped | instance_id=%s stopped_at=%s",
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

    NEW BEHAVIOR with task-chain architecture:
    - If launch_stage is set (new arch): only refreshes power_state, ip_address,
      and esxi_host. Does NOT transition provisioning->running or sync Guacamole
      — the task chain handles that.
    - If launch_stage is None (legacy): preserves old behavior including
      provisioning->running transition and Guacamole sync.
    """
    logger.info(
        "Refreshing instance | instance_id=%s trainee_id=%s",
        instance_id,
        trainee_id,
    )
    instance = get_instance(db, instance_id, trainee_id)
    if not instance:
        logger.error("Instance not found | instance_id=%s", instance_id)
        return None

    if instance.status in (
        InstanceStatus.TERMINATING.value,
        InstanceStatus.TERMINATED.value,
        InstanceStatus.STOPPED.value,
    ):
        logger.info(
            "Instance in terminal/stopped state, skipping refresh | instance_id=%s status=%s",
            instance_id,
            instance.status,
        )
        return instance

    if not instance.vm_uuid or not instance.vcenter_host:
        logger.warning(
            "Instance missing vm_uuid or vcenter_host, skipping refresh | instance_id=%s",
            instance_id,
        )
        return instance

    is_new_arch = instance.launch_stage is not None

    # ── vCenter I/O (NO DB session held) ────────────────────────────────
    creds = _find_vcenter_credentials(instance.vcenter_host)
    if not creds:
        logger.error(
            "No vCenter credentials found | host=%s",
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
            "Failed to connect to vCenter | host=%s",
            instance.vcenter_host,
        )
        return instance

    try:
        vm = client.find_vm_by_uuid(instance.vm_uuid)
        if not vm:
            logger.warning(
                "VM not found in vCenter | vm_uuid=%s",
                instance.vm_uuid,
            )
            return instance

        # Refresh power state, IP, and ESXi host
        power_state_raw = _call_with_timeout(
            client.get_vm_power_state, 40, instance.vm_uuid
        )
        ip_address = _call_with_timeout(
            client.get_vm_ip, 120, instance.vm_uuid
        )
        esxi_host = client.get_vm_esxi_host(instance.vm_uuid)

        # Map vCenter raw power state to unified enum
        power_state = (
            PowerState.POWERED_ON.value
            if power_state_raw == "poweredOn"
            else PowerState.POWERED_OFF.value
            if power_state_raw == "poweredOff"
            else PowerState.UNKNOWN.value
        )

        # ── Update DB state ──────────────────────────────────────────────
        instance.power_state = power_state
        instance.ip_address = ip_address
        if esxi_host:
            instance.esxi_host = esxi_host

        # Update session_state VM mapping (always safe, lightweight)
        if instance.session_state:
            state = dict(instance.session_state)
            runtime = dict(state.get("runtime_context", {}))
            vm_mappings = list(runtime.get("vm_mappings", []))
            for mapping in vm_mappings:
                if mapping.get("vm_name") == instance.vm_name:
                    mapping = dict(mapping)
                    mapping["ip_address"] = ip_address
                    mapping["status"] = (
                        "running" if power_state == PowerState.POWERED_ON.value else "stopped"
                    )
                    if esxi_host:
                        mapping["hostname"] = esxi_host
            runtime["vm_mappings"] = vm_mappings
            state["runtime_context"] = runtime
            instance.session_state = state

        # ── LEGACY ONLY: provisioning -> running + Guacamole sync ────────
        if not is_new_arch:
            if power_state == PowerState.POWERED_ON.value and ip_address:
                lab = db.query(LabDefinition).filter(
                    LabDefinition.id == instance.lab_definition_id
                ).first()

                if lab:
                    _sync_guacamole_connections(db, instance, lab, ip_address)
                else:
                    logger.warning(
                        "Lab definition not found for Guacamole sync | lab_id=%s",
                        instance.lab_definition_id,
                    )

                if instance.status == InstanceStatus.PROVISIONING.value:
                    instance.status = InstanceStatus.RUNNING.value
                    instance.started_at = datetime.now(timezone.utc)
                    instance.expires_at = datetime.now(timezone.utc) + timedelta(
                        minutes=instance.duration_minutes or 60
                    )
                    if instance.session_state:
                        state = dict(instance.session_state)
                        state["status"] = "active"
                        instance.session_state = state
                    logger.info(
                        "Instance transitioned provisioning -> running | instance_id=%s",
                        instance_id,
                    )

                    if instance.expires_at:
                        register_instance_expiry(instance.id, instance.expires_at)
                        logger.info(
                            "Registered instance expiry | instance_id=%s expires_at=%s",
                            instance.id,
                            instance.expires_at.isoformat(),
                        )
        else:
            # New arch: only sync Guacamole if already running (IP change scenario)
            if instance.status == InstanceStatus.RUNNING.value and ip_address:
                lab = db.query(LabDefinition).filter(
                    LabDefinition.id == instance.lab_definition_id
                ).first()
                if lab:
                    _sync_guacamole_connections(db, instance, lab, ip_address)

        db.commit()
        db.refresh(instance)
        logger.info(
            "Instance refreshed | instance_id=%s status=%s power=%s ip=%s esxi=%s connections=%d",
            instance_id,
            instance.status,
            power_state,
            ip_address,
            esxi_host,
            len(instance.guacamole_connections or {}),
        )

    except Exception as e:
        logger.error(
            "Error refreshing instance | instance_id=%s error=%s",
            instance_id,
            e,
            exc_info=True,
        )
    finally:
        client.disconnect()

    return instance


# ═══════════════════════════════════════════════════════════════════════════════
#  TERMINATE (Synchronous — for monitoring / admin ops)
# ═══════════════════════════════════════════════════════════════════════════════

def terminate_instance(
    db: Session,
    instance_id: uuid.UUID,
    trainee_id: uuid.UUID,
    reason: str = TerminationReason.EXPIRED.value,
) -> LabInstance:
    """
    Hard terminate: destroy VM, clean up Guacamole, mark terminated.
    Synchronous — for monitoring tasks and admin ops.
    For user-initiated terminate, use enqueue_terminate() + Celery worker instead.
    """
    logger.info(
        "Terminating instance | instance_id=%s trainee_id=%s reason=%s",
        instance_id,
        trainee_id,
        reason,
    )
    instance = get_instance(db, instance_id, trainee_id)
    if not instance:
        raise ValueError("Instance not found")

    if instance.status == InstanceStatus.TERMINATED.value:
        return instance

    # ── vCenter destroy (NO DB session held) ──────────────────────────
    if instance.vm_uuid and instance.vcenter_host:
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
                    if vm:
                        if str(vm.runtime.powerState) == "poweredOn":
                            task = vm.PowerOffVM_Task()
                            client._wait_for_task(task)
                        task = vm.Destroy_Task()
                        client._wait_for_task(task)
                        logger.info(
                            "VM destroyed | vm_uuid=%s",
                            instance.vm_uuid,
                        )
                except Exception as e:
                    logger.error(
                        "Failed to destroy VM | vm_uuid=%s error=%s",
                        instance.vm_uuid,
                        e,
                    )
                finally:
                    client.disconnect()

    # ── Guacamole cleanup ─────────────────────────────────────────────
    _delete_guacamole_connections(instance, db=db)

    # ── Update DB ─────────────────────────────────────────────────────
    instance.status = InstanceStatus.TERMINATED.value
    instance.stopped_at = datetime.now(timezone.utc)
    instance.termination_reason = reason
    instance.guacamole_connections = {}

    if instance.session_state:
        state = dict(instance.session_state)
        state["status"] = "terminated"
        state["terminated_at"] = instance.stopped_at.isoformat()
        state["termination_reason"] = reason
        instance.session_state = state

    db.commit()
    db.refresh(instance)
    logger.info(
        "Instance terminated | instance_id=%s stopped_at=%s reason=%s",
        instance_id,
        instance.stopped_at,
        reason,
    )
    return instance