# app/services/LabInstance/tasks/launch_chain.py
"""
Launch task chain — 7 idempotent tasks.
Each task: load → verify stage → do one thing → persist → enqueue next.
"""

import uuid
import os
import socket
import logging
import json
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session

from app.core.logging import log_task
from app.utils.db_session import background_session
from app.utils.expiry_queue import register_instance_expiry
from app.models.LabDefinition.LabInstance import LabInstance
from app.models.LabDefinition.core import LabDefinition
from app.models.LabInstance.enums import (
    InstanceStatus, PowerState, LaunchStage, EventSeverity, EventSource,
)
from app.config.connection.vcenter_client import VCenterClient
from app.services.LabDefinition.task_audit import (
    start_task, finish_task, mark_running, record_event,
)
from app.services.LabInstance.shared import (
    load_instance_locked, is_stage_reached, persist_stage,
    fail_instance, check_termination_race,
)
from app.services.LabInstance.utils import (
    _call_with_timeout, _find_vcenter_for_template, _find_vcenter_credentials,
    _compute_max_score, _build_initial_session_state, _sync_guacamole_connections,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
#  TASK 1: VALIDATE INSTANCE
# ═══════════════════════════════════════════════════════════════════════════════

def run_validate_instance(
    instance_id: str,
    trainee_id: str,
    task_id: str,
) -> Dict[str, Any]:
    """
    Validates lab definition, checks for duplicates, initializes session state.
    Idempotent: skips if launch_stage >= 'validated'.
    """
    task_uuid = uuid.UUID(task_id)
    instance_uuid = uuid.UUID(instance_id)
    task_start_ts = datetime.now(timezone.utc)
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)

        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed", "error": "Instance not found"}

        # Idempotency: already validated?
        if is_stage_reached(instance, LaunchStage.VALIDATED):
            task_logger.info("Stage already validated, skipping")
            duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
            record_event(
                task_uuid, instance_uuid, "instance_validation_skipped",
                "Validation stage already completed, skipping",
                event_code="VALIDATION_SKIPPED",
                metadata={"reason": "already_validated", "launch_stage": instance.launch_stage, "duration_seconds": duration},
                db=db,
            )
            finish_task(task_uuid, "completed", db=db)
            return _enqueue_next(instance_uuid, trainee_id, task_id, "discover_vcenter")

        if check_termination_race(db, instance, task_uuid, task_logger):
            return {"status": "aborted", "reason": "terminating"}

        # Validate lab definition
        lab = db.query(LabDefinition).filter(LabDefinition.id == instance.lab_definition_id).first()
        if not lab or not lab.vms:
            fail_instance(instance_uuid, task_uuid, "Lab definition has no VMs", "validation_failed")
            return {"status": "failed", "error": "Lab definition has no VMs"}

        # Initialize session state if not set
        if not instance.session_state or instance.session_state.get("status") is None:
            max_score = _compute_max_score(db, lab.guide_version_id)
            instance.session_state = _build_initial_session_state(
                instance_id=instance_uuid,
                lab_definition_id=instance.lab_definition_id,
                guide_version_id=lab.guide_version_id,
                trainee_id=uuid.UUID(trainee_id),
                max_score=max_score,
            )

        instance.status = InstanceStatus.PROVISIONING.value
        db.commit()

        duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
        record_event(
            task_uuid, instance_uuid, "instance_validated", "Validation passed",
            event_code="VALIDATION_PASSED",
            metadata={
                "lab_definition_id": str(lab.id),
                "guide_version_id": str(lab.guide_version_id) if lab.guide_version_id else None,
                "vm_count": len(lab.vms) if lab.vms else 0,
                "duration_seconds": duration,
            },
            db=db,
        )
        finish_task(task_uuid, "completed", db=db)

    return _enqueue_next(instance_uuid, trainee_id, task_id, "discover_vcenter")


# ═══════════════════════════════════════════════════════════════════════════════
#  TASK 2: DISCOVER VCENTER
# ═══════════════════════════════════════════════════════════════════════════════

def run_discover_vcenter(
    instance_id: str,
    trainee_id: str,
    task_id: str,
) -> Dict[str, Any]:
    """
    Discovers which vCenter hosts the template.
    Idempotent: skips if launch_stage >= 'vcenter_discovered'.
    """
    task_uuid = uuid.UUID(task_id)
    instance_uuid = uuid.UUID(instance_id)
    task_start_ts = datetime.now(timezone.utc)
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)

        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if is_stage_reached(instance, LaunchStage.VCENTER_DISCOVERED):
            task_logger.info("Stage already vcenter_discovered, skipping")
            duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
            record_event(
                task_uuid, instance_uuid, "vcenter_discovery_skipped",
                "vCenter discovery already completed, skipping",
                event_code="VCENTER_SKIPPED",
                metadata={"reason": "already_discovered", "vcenter_host": instance.vcenter_host, "duration_seconds": duration},
                db=db,
            )
            finish_task(task_uuid, "completed", db=db)
            return _enqueue_next(instance_uuid, trainee_id, task_id, "clone_vm")

        if check_termination_race(db, instance, task_uuid, task_logger):
            return {"status": "aborted"}

        # Get template from lab definition
        lab = instance.lab_definition
        vm_config = lab.vms[0] if lab and lab.vms else None
        if not vm_config:
            fail_instance(instance_uuid, task_uuid, "No VM config", "no_vm_config")
            return {"status": "failed"}

        source_vm_id = vm_config.source_vm_id
        db.commit()  # release lock

    # External action: NO DB session
    creds = _find_vcenter_for_template(source_vm_id)
    if not creds:
        fail_instance(instance_uuid, task_uuid, f"No vCenter for template {source_vm_id}", "vcenter_not_found")
        return {"status": "failed"}

    # Persist result
    persist_stage(
        instance_uuid,
        LaunchStage.VCENTER_DISCOVERED,
        updates={"vcenter_host": creds["host"]},
        task_id=task_uuid,
    )

    # Record discovery event outside the session (persist_stage manages its own DB)
    # We open a short session just for the event so metadata is captured
    duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
    with background_session() as db:
        record_event(
            task_uuid, instance_uuid, "vcenter_discovered",
            f"Template {source_vm_id} located on vCenter {creds['host']}",
            event_code="VCENTER_FOUND",
            metadata={"vcenter_host": creds["host"], "source_vm_id": source_vm_id, "duration_seconds": duration},
            db=db,
        )
        db.commit()

    with background_session() as db:
        finish_task(task_uuid, "completed", db=db)

    return _enqueue_next(instance_uuid, trainee_id, task_id, "clone_vm", vcenter_creds=creds)


# ═══════════════════════════════════════════════════════════════════════════════
#  TASK 3: CLONE VM
# ═══════════════════════════════════════════════════════════════════════════════

def run_clone_vm(
    instance_id: str,
    trainee_id: str,
    task_id: str,
    vcenter_host: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Clones the VM from template.
    Idempotent: skips if launch_stage >= 'vm_cloned' or vm_uuid exists.
    """
    task_uuid = uuid.UUID(task_id)
    instance_uuid = uuid.UUID(instance_id)
    task_start_ts = datetime.now(timezone.utc)
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)

        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if is_stage_reached(instance, LaunchStage.VM_CLONED) or instance.vm_uuid:
            task_logger.info("VM already cloned, skipping | vm_uuid=%s", instance.vm_uuid)
            duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
            record_event(
                task_uuid, instance_uuid, "clone_skipped",
                "VM clone already completed, skipping",
                event_code="CLONE_SKIPPED",
                metadata={"reason": "already_cloned", "existing_vm_uuid": instance.vm_uuid, "duration_seconds": duration},
                db=db,
            )
            finish_task(task_uuid, "completed", db=db)
            return _enqueue_next(instance_uuid, trainee_id, task_id, "power_on_vm")

        if check_termination_race(db, instance, task_uuid, task_logger):
            return {"status": "aborted"}

        lab = instance.lab_definition
        vm_config = lab.vms[0] if lab and lab.vms else None
        source_vm_id = vm_config.source_vm_id
        lab_slug = lab.slug
        vcenter_host = vcenter_host or instance.vcenter_host
        db.commit()

    # External action
    creds = _find_vcenter_credentials(vcenter_host)
    if not creds:
        fail_instance(instance_uuid, task_uuid, f"No credentials for {vcenter_host}", "vcenter_creds_not_found")
        return {"status": "failed"}

    client = VCenterClient(host=creds["host"], username=creds["username"], password=creds["password"])
    if not client.connect():
        fail_instance(instance_uuid, task_uuid, f"Cannot connect to vCenter {vcenter_host}", "vcenter_connect_failed")
        return {"status": "failed"}

    new_vm_name = f"{lab_slug}-{trainee_id[:8]}-{uuid.uuid4().hex[:8]}"

    try:
        task_logger.info("Cloning VM | template=%s name=%s", source_vm_id, new_vm_name)

        # Emit start event
        with background_session() as db:
            record_event(
                task_uuid, instance_uuid, "clone_started",
                f"Starting VM clone from template {source_vm_id}",
                event_code="CLONE_STARTED",
                metadata={
                    "template_uuid": source_vm_id,
                    "new_vm_name": new_vm_name,
                    "vcenter_host": creds["host"],
                },
                db=db,
            )
            db.commit()

        clone_result = _call_with_timeout(client.clone_vm, 220, template_uuid=source_vm_id, new_vm_name=new_vm_name)
        vm_uuid = clone_result["uuid"]

        task_logger.info("Clone completed | vm_uuid=%s", vm_uuid)

        # Emit completion event
        duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
        with background_session() as db:
            record_event(
                task_uuid, instance_uuid, "clone_completed",
                f"VM clone completed successfully",
                event_code="CLONE_COMPLETED",
                metadata={
                    "vm_uuid": vm_uuid,
                    "vm_name": new_vm_name,
                    "vcenter_host": creds["host"],
                    "duration_seconds": duration,
                },
                db=db,
            )
            db.commit()
    except Exception as e:
        fail_instance(instance_uuid, task_uuid, f"Clone failed: {e}", "clone_failed")
        return {"status": "failed"}
    finally:
        client.disconnect()

    # Persist
    persist_stage(
        instance_uuid,
        LaunchStage.VM_CLONED,
        updates={"vm_uuid": vm_uuid, "vm_name": new_vm_name},
        task_id=task_uuid,
    )

    with background_session() as db:
        finish_task(task_uuid, "completed", db=db)

    return _enqueue_next(instance_uuid, trainee_id, task_id, "power_on_vm")


# ═══════════════════════════════════════════════════════════════════════════════
#  TASK 4: POWER ON VM
# ═══════════════════════════════════════════════════════════════════════════════

def run_power_on_vm(
    instance_id: str,
    trainee_id: str,
    task_id: str,
) -> Dict[str, Any]:
    """
    Powers on the cloned VM.
    Idempotent: skips if launch_stage >= 'vm_powered_on'.
    """
    task_uuid = uuid.UUID(task_id)
    instance_uuid = uuid.UUID(instance_id)
    task_start_ts = datetime.now(timezone.utc)
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)

        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if is_stage_reached(instance, LaunchStage.VM_POWERED_ON):
            task_logger.info("VM already powered on, skipping")
            duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
            record_event(
                task_uuid, instance_uuid, "power_on_skipped",
                "VM power-on already completed, skipping",
                event_code="POWER_ON_SKIPPED",
                metadata={"reason": "already_powered_on", "vm_uuid": instance.vm_uuid, "duration_seconds": duration},
                db=db,
            )
            finish_task(task_uuid, "completed", db=db)
            return _enqueue_next(instance_uuid, trainee_id, task_id, "discover_ip")

        if check_termination_race(db, instance, task_uuid, task_logger):
            return {"status": "aborted"}

        vm_uuid = instance.vm_uuid
        vcenter_host = instance.vcenter_host
        db.commit()

    if not vm_uuid:
        fail_instance(instance_uuid, task_uuid, "No vm_uuid to power on", "missing_vm_uuid")
        return {"status": "failed"}

    creds = _find_vcenter_credentials(vcenter_host)
    client = VCenterClient(host=creds["host"], username=creds["username"], password=creds["password"])
    if not client.connect():
        fail_instance(instance_uuid, task_uuid, f"Cannot connect to vCenter {vcenter_host}", "vcenter_connect_failed")
        return {"status": "failed"}

    try:
        task_logger.info("Powering on VM | vm_uuid=%s", vm_uuid)

        with background_session() as db:
            record_event(
                task_uuid, instance_uuid, "power_on_started",
                f"Powering on VM {vm_uuid}",
                event_code="POWER_ON_STARTED",
                metadata={"vm_uuid": vm_uuid, "vcenter_host": creds["host"]},
                db=db,
            )
            db.commit()

        _call_with_timeout(client.power_on_vm, 120, vm_uuid)
        task_logger.info("VM powered on")

        duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
        with background_session() as db:
            record_event(
                task_uuid, instance_uuid, "power_on_completed",
                "VM powered on successfully",
                event_code="POWER_ON_COMPLETED",
                metadata={"vm_uuid": vm_uuid, "vcenter_host": creds["host"], "duration_seconds": duration},
                db=db,
            )
            db.commit()
    except Exception as e:
        fail_instance(instance_uuid, task_uuid, f"Power on failed: {e}", "power_on_failed")
        return {"status": "failed"}
    finally:
        client.disconnect()

    persist_stage(
        instance_uuid,
        LaunchStage.VM_POWERED_ON,
        updates={"power_state": PowerState.POWERED_ON.value},
        task_id=task_uuid,
    )

    with background_session() as db:
        finish_task(task_uuid, "completed", db=db)

    return _enqueue_next(instance_uuid, trainee_id, task_id, "discover_ip")


# ═══════════════════════════════════════════════════════════════════════════════
#  TASK 5: DISCOVER IP (and ESXi host)
# ═══════════════════════════════════════════════════════════════════════════════

def run_discover_ip(
    instance_id: str,
    trainee_id: str,
    task_id: str,
) -> Dict[str, Any]:
    task_uuid = uuid.UUID(task_id)
    instance_uuid = uuid.UUID(instance_id)
    task_start_ts = datetime.now(timezone.utc)
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)

        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if is_stage_reached(instance, LaunchStage.IP_DISCOVERED):
            task_logger.info("IP already discovered, skipping")
            duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
            record_event(
                task_uuid, instance_uuid, "ip_discovery_skipped",
                "IP discovery already completed, skipping",
                event_code="IP_SKIPPED",
                metadata={
                    "reason": "already_discovered",
                    "ip_address": instance.ip_address,
                    "esxi_host": instance.esxi_host,
                    "duration_seconds": duration,
                },
                db=db,
            )
            finish_task(task_uuid, "completed", db=db)
            return _enqueue_next(instance_uuid, trainee_id, task_id, "guacamole_connection")

        if check_termination_race(db, instance, task_uuid, task_logger):
            return {"status": "aborted"}

        vm_uuid = instance.vm_uuid
        vcenter_host = instance.vcenter_host
        db.commit()

    if not vm_uuid:
        fail_instance(instance_uuid, task_uuid, "No vm_uuid for IP discovery", "missing_vm_uuid")
        return {"status": "failed"}

    creds = _find_vcenter_credentials(vcenter_host)
    client = VCenterClient(host=creds["host"], username=creds["username"], password=creds["password"])
    if not client.connect():
        fail_instance(instance_uuid, task_uuid, f"Cannot connect to vCenter {vcenter_host}", "vcenter_connect_failed")
        return {"status": "failed"}

    ip_address = None
    esxi_host = None
    power_state = None

    try:
        task_logger.info("Discovering IP | vm_uuid=%s", vm_uuid)

        with background_session() as db:
            record_event(
                task_uuid, instance_uuid, "ip_discovery_started",
                f"Starting IP discovery for VM {vm_uuid}",
                event_code="IP_POLL_STARTED",
                metadata={"vm_uuid": vm_uuid, "vcenter_host": creds["host"], "max_wait_seconds": 180},
                db=db,
            )
            db.commit()

        # Get power state (fast, single call)
        power_state_raw = _call_with_timeout(client.get_vm_power_state, 40, vm_uuid)
        power_state = (
            PowerState.POWERED_ON.value if power_state_raw == "poweredOn"
            else PowerState.POWERED_OFF.value if power_state_raw == "poweredOff"
            else PowerState.UNKNOWN.value
        )

        if power_state != PowerState.POWERED_ON.value:
            fail_instance(instance_uuid, task_uuid, f"VM not powered on (state={power_state})", "vm_not_powered_on")
            return {"status": "failed"}

        # ── POLL for IP with retries ─────────────────────────────────────
        max_wait_seconds = 180  # 3 minutes total
        poll_interval = 20       # Check every 20 seconds
        elapsed = 0
        attempt = 0

        while elapsed < max_wait_seconds:
            attempt += 1
            ip_address = _call_with_timeout(client.get_vm_ip, 30, vm_uuid)

            if ip_address:
                task_logger.info("IP discovered | ip=%s after %ds", ip_address, elapsed)
                break

            task_logger.info("IP not ready yet, retrying in %ds... (%d/%d)", poll_interval, elapsed, max_wait_seconds)

            # Emit retry event every 2 attempts (every 40s) to avoid spam
            if attempt % 2 == 0:
                with background_session() as db:
                    record_event(
                        task_uuid, instance_uuid, "ip_poll_retry",
                        f"IP not ready yet, retrying (elapsed={elapsed}s)",
                        event_code="IP_POLL_RETRY",
                        metadata={"elapsed_seconds": elapsed, "attempt": attempt, "vm_uuid": vm_uuid},
                        db=db,
                    )
                    db.commit()

            time.sleep(poll_interval)
            elapsed += poll_interval

        if not ip_address:
            fail_instance(instance_uuid, task_uuid, f"IP discovery timed out after {max_wait_seconds}s", "ip_discovery_timeout")
            return {"status": "failed"}

        # ── Discover ESXi host ────────────────────────────────────────────
        esxi_host = client.get_vm_esxi_host(vm_uuid)
        task_logger.info("ESXi host discovered | host=%s", esxi_host)

        duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
        with background_session() as db:
            record_event(
                task_uuid, instance_uuid, "ip_discovered",
                f"IP and ESXi host discovered after {elapsed}s",
                event_code="IP_FOUND",
                metadata={
                    "ip_address": ip_address,
                    "esxi_host": esxi_host,
                    "power_state": power_state,
                    "elapsed_seconds": elapsed,
                    "attempts": attempt,
                    "vm_uuid": vm_uuid,
                    "duration_seconds": duration,
                },
                db=db,
            )
            db.commit()

    except Exception as e:
        fail_instance(instance_uuid, task_uuid, f"IP discovery failed: {e}", "ip_discovery_failed")
        return {"status": "failed"}
    finally:
        client.disconnect()

    # Persist
    persist_stage(
        instance_uuid,
        LaunchStage.IP_DISCOVERED,
        updates={
            "ip_address": ip_address,
            "power_state": power_state,
            "esxi_host": esxi_host,
        },
        task_id=task_uuid,
    )

    with background_session() as db:
        finish_task(task_uuid, "completed", db=db)

    return _enqueue_next(instance_uuid, trainee_id, task_id, "guacamole_connection")


# ═══════════════════════════════════════════════════════════════════════════════
#  TASK 6: GUACAMOLE CONNECTION
# ═══════════════════════════════════════════════════════════════════════════════

def run_guacamole_connection(
    instance_id: str,
    trainee_id: str,
    task_id: str,
) -> Dict[str, Any]:
    """
    Creates Guacamole connections for the VM.
    Idempotent: skips if launch_stage >= 'guacamole_connected'.
    """
    task_uuid = uuid.UUID(task_id)
    instance_uuid = uuid.UUID(instance_id)
    task_start_ts = datetime.now(timezone.utc)
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)

        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if is_stage_reached(instance, LaunchStage.GUACAMOLE_CONNECTED):
            task_logger.info("Guacamole already connected, skipping")
            duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
            record_event(
                task_uuid, instance_uuid, "guacamole_sync_skipped",
                "Guacamole sync already completed, skipping",
                event_code="GUAC_SYNC_SKIPPED",
                metadata={
                    "reason": "already_connected",
                    "existing_connections": dict(instance.guacamole_connections or {}),
                    "duration_seconds": duration,
                },
                db=db,
            )
            finish_task(task_uuid, "completed", db=db)
            return _enqueue_next(instance_uuid, trainee_id, task_id, "finalize")

        if check_termination_race(db, instance, task_uuid, task_logger):
            return {"status": "aborted"}

        # Capture needed fields
        ip_address = instance.ip_address
        lab = instance.lab_definition

        if not ip_address:
            fail_instance(instance_uuid, task_uuid, "No IP address for Guacamole connections", "missing_ip")
            return {"status": "failed"}

        if not lab:
            fail_instance(instance_uuid, task_uuid, "No lab definition for Guacamole", "missing_lab")
            return {"status": "failed"}

        slots = getattr(lab, "connection_slots", None) or []
        if isinstance(slots, str):
            try:
                slots = json.loads(slots)
            except json.JSONDecodeError:
                slots = []

        keycloak_username = None
        try:
            from app.services.LabInstance.utils import _resolve_keycloak_username
            keycloak_username = _resolve_keycloak_username(db, instance.trainee_id)
        except Exception:
            pass

        db.commit()  # Release row lock before external I/O, BUT keep session open

        # Emit start event
        record_event(
            task_uuid, instance_uuid, "guacamole_sync_started",
            f"Starting Guacamole connection sync for IP {ip_address}",
            event_code="GUAC_SYNC_STARTED",
            metadata={
                "ip_address": ip_address,
                "slot_count": len(slots),
                "keycloak_username": keycloak_username,
                "lab_slug": lab.slug,
            },
            db=db,
        )
        db.commit()  # Persist start event before external I/O

        # ── External action: create Guacamole connections ──
        try:
            task_logger.info("Creating Guacamole connections for lab | ip=%s", ip_address)

            # _sync_guacamole_connections handles everything: slots, protocols, Vault creds, permissions
            # It commits internally and updates instance.guacamole_connections
            _sync_guacamole_connections(db, instance, lab, ip_address)

            # Reload connections from the now-committed instance
            connections = dict(instance.guacamole_connections or {})
            task_logger.info("Guacamole connections created | count=%d", len(connections))

            # Emit completion event with full connection map
            duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
            record_event(
                task_uuid, instance_uuid, "guacamole_sync_completed",
                f"Guacamole sync completed with {len(connections)} connection(s)",
                event_code="GUAC_SYNC_COMPLETED",
                metadata={
                    "ip_address": ip_address,
                    "connection_count": len(connections),
                    "connection_ids": connections,
                    "protocols": list({k.rsplit("_", 1)[-1] for k in connections.keys()}),
                    "keycloak_username": keycloak_username,
                    "duration_seconds": duration,
                },
                db=db,
            )
            db.commit()  # Persist completion event

        except Exception as e:
            # Log full traceback so you see the real failure in Celery logs
            task_logger.exception("Guacamole connection failed: %s", e)

            # Emit failure event before calling fail_instance so we capture context
            duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
            record_event(
                task_uuid, instance_uuid, "guacamole_sync_failed",
                f"Guacamole sync failed: {e}",
                event_code="GUAC_SYNC_FAILED",
                metadata={
                    "ip_address": ip_address,
                    "error": str(e),
                    "lab_slug": lab.slug,
                    "slot_count": len(slots),
                    "duration_seconds": duration,
                },
                db=db,
            )
            db.commit()  # Persist failure event
            fail_instance(instance_uuid, task_uuid, f"Guacamole connection failed: {e}", "guacamole_failed")
            return {"status": "failed"}

    # Persist stage — _sync_guacamole_connections already committed the connections
    persist_stage(
        instance_uuid,
        LaunchStage.GUACAMOLE_CONNECTED,
        task_id=task_uuid,
    )

    with background_session() as db:
        finish_task(task_uuid, "completed", db=db)

    return _enqueue_next(instance_uuid, trainee_id, task_id, "finalize")


# ═══════════════════════════════════════════════════════════════════════════════
#  TASK 7: FINALIZE INSTANCE
# ═══════════════════════════════════════════════════════════════════════════════

def run_finalize_instance(
    instance_id: str,
    trainee_id: str,
    task_id: str,
) -> Dict[str, Any]:
    """
    Finalizes the instance: updates status to 'running', sets started_at,
    updates session_state with VM mapping, registers Redis expiry.
    """
    task_uuid = uuid.UUID(task_id)
    instance_uuid = uuid.UUID(instance_id)
    task_start_ts = datetime.now(timezone.utc)
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)

        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if is_stage_reached(instance, LaunchStage.FINALIZED):
            task_logger.info("Already finalized, skipping")
            duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
            record_event(
                task_uuid, instance_uuid, "instance_finalization_skipped",
                "Finalization already completed, skipping",
                event_code="FINALIZE_SKIPPED",
                metadata={"reason": "already_finalized", "instance_status": instance.status, "duration_seconds": duration},
                db=db,
            )
            finish_task(task_uuid, "completed", db=db)
            return {"status": "success", "instance_id": instance_id}

        if check_termination_race(db, instance, task_uuid, task_logger):
            return {"status": "aborted"}

        # Update session_state with VM mapping
        session_state = dict(instance.session_state) if instance.session_state else {}
        runtime = dict(session_state.get("runtime_context", {}))

        vm_mapping = {
            "vm_name": instance.vm_name or "lab-vm",
            "instance_id": instance.vm_uuid,
            "ip_address": instance.ip_address,
            "hostname": instance.esxi_host,
            "status": "running",
        }
        runtime["vm_mappings"] = [vm_mapping]
        runtime["default_vm"] = instance.vm_name
        runtime["expires_at"] = instance.expires_at.isoformat() if instance.expires_at else None
        session_state["runtime_context"] = runtime
        instance.session_state = session_state

        instance.status = InstanceStatus.RUNNING.value
        instance.started_at = datetime.now(timezone.utc)
        instance.launch_stage = LaunchStage.FINALIZED.value

        db.commit()

        # ← FIX: Calculate expires_at ONLY when lab is actually ready
        duration = instance.duration_minutes or 60
        instance.expires_at = datetime.now(timezone.utc) + timedelta(minutes=duration)
        
        # Update session_state with the REAL expiry
        session_state = dict(instance.session_state) if instance.session_state else {}
        runtime = dict(session_state.get("runtime_context", {}))
        runtime["expires_at"] = instance.expires_at.isoformat()
        session_state["runtime_context"] = runtime
        instance.session_state = session_state

        db.commit()  # Persist the new expires_at

        # Register Redis expiry with the CORRECT time
        redis_registered = False
        redis_error = None
        try:
            if instance.expires_at:
                register_instance_expiry(instance.id, instance.expires_at)
                task_logger.info("Redis expiry registered | expires_at=%s", instance.expires_at.isoformat())
                redis_registered = True
        except Exception as e:
            task_logger.warning("Failed to register Redis expiry: %s", e)
            redis_error = str(e)

        duration = (datetime.now(timezone.utc) - task_start_ts).total_seconds()
        record_event(
            task_uuid, instance_uuid, "instance_finalized", "Instance is now running",
            event_code="INSTANCE_RUNNING",
            metadata={
                "vm_mapping": vm_mapping,
                "started_at": instance.started_at.isoformat(),
                "expires_at": instance.expires_at.isoformat() if instance.expires_at else None,
                "redis_expiry_registered": redis_registered,
                "redis_error": redis_error,
                "session_state_status": session_state.get("status"),
                "duration_seconds": duration,
            },
            db=db,
        )
        finish_task(task_uuid, "completed", db=db)
        result_vm_uuid = instance.vm_uuid
        result_ip_address = instance.ip_address
        result_esxi_host = instance.esxi_host

    task_logger.info("Launch chain completed successfully")
    return {
        "status": "success",
        "instance_id": instance_id,
        "vm_uuid": result_vm_uuid,
        "ip_address": result_ip_address,
        "esxi_host": result_esxi_host,
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _enqueue_next(
    instance_uuid: uuid.UUID,
    trainee_id: str,
    current_task_id: str,
    next_stage: str,
    **kwargs,
) -> Dict[str, Any]:
    """
    Creates audit task for next stage and enqueues Celery task.
    """
    from app.tasks.lab_instance_tasks import (
        discover_vcenter_task, clone_vm_task, power_on_vm_task,
        discover_ip_task, guacamole_connection_task, finalize_instance_task,
    )

    # Map stage names to task functions
    task_map = {
        "discover_vcenter": discover_vcenter_task,
        "clone_vm": clone_vm_task,
        "power_on_vm": power_on_vm_task,
        "discover_ip": discover_ip_task,
        "guacamole_connection": guacamole_connection_task,
        "finalize": finalize_instance_task,
    }

    next_task_fn = task_map.get(next_stage)
    if not next_task_fn:
        raise ValueError(f"Unknown next stage: {next_stage}")

    # Start audit for next task
    next_task_id = start_task(
        instance_uuid,
        task_type=f"launch.{next_stage}",
        stage=next_stage,
        metadata={"previous_task_id": current_task_id},
    )

    # Enqueue
    args = [str(instance_uuid), trainee_id, str(next_task_id)]
    if kwargs.get("vcenter_creds"):
        args.append(kwargs["vcenter_creds"]["host"])

    next_task_fn.apply_async(args=args, task_id=str(next_task_id), queue="lab.provisioning")

    # Record chain advancement event in the current task's context
    # We use a fresh session since this helper is called outside any task's with-block
    from app.utils.db_session import background_session
    with background_session() as db:
        record_event(
            uuid.UUID(current_task_id),
            instance_uuid,
            "task_enqueued",
            f"Enqueued next stage: {next_stage}",
            event_code="CHAIN_ADVANCED",
            metadata={
                "next_stage": next_stage,
                "next_task_id": str(next_task_id),
                "previous_task_id": current_task_id,
                "queue": "lab.provisioning",
            },
            db=db,
        )
        db.commit()

    return {"status": "enqueued", "next_stage": next_stage, "next_task_id": str(next_task_id)}