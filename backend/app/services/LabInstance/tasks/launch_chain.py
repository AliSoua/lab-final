# app/services/LabInstance/tasks/launch_chain.py
"""
Launch task chain — 7 idempotent tasks.
Each task: load → verify stage → do one thing → persist → enqueue next.
"""

import uuid
import os
import socket
import logging
from datetime import datetime, timezone
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
    start_task, finish_task, mark_running, record_event, update_task_progress,
)
from app.services.LabInstance.shared import (
    load_instance_locked, is_stage_reached, persist_stage, 
    fail_instance, check_termination_race,
)
from app.services.LabInstance.utils import (
    _call_with_timeout, _find_vcenter_for_template, _find_vcenter_credentials,
    _compute_max_score, _build_initial_session_state,
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

        record_event(
            task_uuid, instance_uuid, "instance_validated", "Validation passed",
            event_code="VALIDATION_PASSED", db=db,
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
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)
        
        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if is_stage_reached(instance, LaunchStage.VCENTER_DISCOVERED):
            task_logger.info("Stage already vcenter_discovered, skipping")
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
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)
        
        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if is_stage_reached(instance, LaunchStage.VM_CLONED) or instance.vm_uuid:
            task_logger.info("VM already cloned, skipping | vm_uuid=%s", instance.vm_uuid)
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

    try:
        new_vm_name = f"{lab_slug}-{trainee_id[:8]}-{uuid.uuid4().hex[:8]}"
        task_logger.info("Cloning VM | template=%s name=%s", source_vm_id, new_vm_name)
        
        update_task_progress(task_uuid, 10)
        clone_result = _call_with_timeout(client.clone_vm, 220, template_uuid=source_vm_id, new_vm_name=new_vm_name)
        vm_uuid = clone_result["uuid"]
        
        task_logger.info("Clone completed | vm_uuid=%s", vm_uuid)
        update_task_progress(task_uuid, 100)
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
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)
        
        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if is_stage_reached(instance, LaunchStage.VM_POWERED_ON):
            task_logger.info("VM already powered on, skipping")
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
        _call_with_timeout(client.power_on_vm, 120, vm_uuid)
        task_logger.info("VM powered on")
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

    return _enqueue_next(instance_uuid, trainee_id, task_id, "discover_ip")


# ═══════════════════════════════════════════════════════════════════════════════
#  TASK 5: DISCOVER IP (and ESXi host)
# ═══════════════════════════════════════════════════════════════════════════════

def run_discover_ip(
    instance_id: str,
    trainee_id: str,
    task_id: str,
) -> Dict[str, Any]:
    """
    Discovers VM IP address and ESXi host.
    Idempotent: skips if launch_stage >= 'ip_discovered'.
    """
    task_uuid = uuid.UUID(task_id)
    instance_uuid = uuid.UUID(instance_id)
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)
        
        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if is_stage_reached(instance, LaunchStage.IP_DISCOVERED):
            task_logger.info("IP already discovered, skipping")
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
        
        # Get power state
        power_state_raw = _call_with_timeout(client.get_vm_power_state, 40, vm_uuid)
        power_state = PowerState.POWERED_ON.value if power_state_raw == "poweredOn" else PowerState.UNKNOWN.value
        
        # Get IP
        ip_address = _call_with_timeout(client.get_vm_ip, 120, vm_uuid)
        task_logger.info("IP discovered | ip=%s", ip_address)

        # ── NEW: Discover ESXi host ────────────────────────────────────────
        esxi_host = client.get_vm_esxi_host(vm_uuid)  # You'll need to add this to VCenterClient
        task_logger.info("ESXi host discovered | host=%s", esxi_host)

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
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)
        
        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if is_stage_reached(instance, LaunchStage.GUACAMOLE_CONNECTED):
            task_logger.info("Guacamole already connected, skipping")
            finish_task(task_uuid, "completed", db=db)
            return _enqueue_next(instance_uuid, trainee_id, task_id, "finalize")

        if check_termination_race(db, instance, task_uuid, task_logger):
            return {"status": "aborted"}

        # Capture needed fields
        ip_address = instance.ip_address
        vm_name = instance.vm_name
        db.commit()

    # External action: create Guacamole connections
    # (Replace with your actual Guacamole service calls)
    try:
        task_logger.info("Creating Guacamole connections")
        connections = _create_guacamole_connections(instance_uuid, ip_address, vm_name)
        task_logger.info("Guacamole connections created | count=%d", len(connections))
    except Exception as e:
        fail_instance(instance_uuid, task_uuid, f"Guacamole connection failed: {e}", "guacamole_failed")
        return {"status": "failed"}

    # Persist
    persist_stage(
        instance_uuid,
        LaunchStage.GUACAMOLE_CONNECTED,
        updates={"guacamole_connections": connections},
        task_id=task_uuid,
    )

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
    task_logger = log_task(logger, task_id=task_id, instance_id=instance_id, trainee_id=trainee_id)

    with background_session() as db:
        mark_running(task_uuid, worker_pid=os.getpid(), worker_host=socket.gethostname(), db=db)
        
        instance = load_instance_locked(db, instance_uuid)
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return {"status": "failed"}

        if is_stage_reached(instance, LaunchStage.FINALIZED):
            task_logger.info("Already finalized, skipping")
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
            "hostname": instance.esxi_host,  # Include ESXi host
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

        # Register Redis expiry
        try:
            if instance.expires_at:
                register_instance_expiry(instance.id, instance.expires_at)
                task_logger.info("Redis expiry registered")
        except Exception as e:
            task_logger.warning("Failed to register Redis expiry: %s", e)

        record_event(
            task_uuid, instance_uuid, "instance_finalized", "Instance is now running",
            event_code="INSTANCE_RUNNING", db=db,
        )
        finish_task(task_uuid, "completed", db=db)

    task_logger.info("Launch chain completed successfully")
    return {
        "status": "success",
        "instance_id": instance_id,
        "vm_uuid": instance.vm_uuid,
        "ip_address": instance.ip_address,
        "esxi_host": instance.esxi_host,
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

    return {"status": "enqueued", "next_stage": next_stage, "next_task_id": str(next_task_id)}


def _create_guacamole_connections(instance_id, ip_address, vm_name):
    """
    Stub — replace with your actual Guacamole connection creation logic.
    Returns dict like {"slug_ssh": "conn_id_1", "slug_rdp": "conn_id_2"}
    """
    # Import and call your existing Guacamole service
    from app.services.LabInstance.utils import _create_guacamole_connection as create_conn
    return create_conn(instance_id, ip_address, vm_name)