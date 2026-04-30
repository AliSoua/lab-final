# backend/app/services/LabInstance/LaunchInstance.py
"""
Lab Instance Launch Service
Handles enqueueing launch requests and the Celery worker launch body.
"""

import uuid
import os
import socket
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session, joinedload

from app.core.logging import log_task
from app.models.LabDefinition.core import LabDefinition
from app.models.LabDefinition.LabInstance import LabInstance
from app.config.connection.vcenter_client import VCenterClient
from app.services.vault.credentials import read_credentials, list_admin_vcenters
from app.services.LabDefinition.task_audit import (
    start_task,
    finish_task,
    mark_running,
    record_event,
)
from app.services.LabInstance.utils import (
    _call_with_timeout,
    _find_vcenter_for_template,
    _find_vcenter_credentials,
    _compute_max_score,
    _build_initial_session_state,
)
from app.utils.expiry_queue import register_instance_expiry, remove_instance_expiry   # ← ADD

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
#  ENQUEUE LAUNCH (API container)
# ═══════════════════════════════════════════════════════════════════════════════

def enqueue_launch(
    db: Session,
    lab_definition_id: uuid.UUID,
    trainee_id: uuid.UUID,
) -> LabInstance:
    """
    Synchronous enqueue path.
    Validates, inserts a 'provisioning' row with guide_version snapshot,
    initializes session_state, commits, starts audit, then pushes the Celery task.
    If Redis is down the row is flipped to 'failed' and the exception is re-raised.
    """
    from app.tasks.lab_instance_tasks import launch_instance_task

    logger.info(
        "[ENQUEUE-LAUNCH] lab=%s trainee=%s",
        lab_definition_id,
        trainee_id,
    )

    # 1. Validate lab definition
    lab = (
        db.query(LabDefinition)
        .filter(LabDefinition.id == lab_definition_id)
        .first()
    )
    if not lab:
        logger.error(
            "[ENQUEUE-LAUNCH] Lab definition %s not found",
            lab_definition_id,
        )
        raise ValueError("Lab definition not found")

    if not lab.vms:
        logger.error("[ENQUEUE-LAUNCH] Lab %s has no VMs", lab_definition_id)
        raise ValueError("Lab definition has no VMs configured")

    # 2. Duplicate-active guard
    existing = (
        db.query(LabInstance)
        .filter(
            LabInstance.lab_definition_id == lab_definition_id,
            LabInstance.trainee_id == trainee_id,
            LabInstance.status.in_(["provisioning", "running"]),
        )
        .with_for_update()
        .first()
    )
    if existing:
        logger.warning(
            "[ENQUEUE-LAUNCH] Duplicate active instance %s (status=%s)",
            existing.id,
            existing.status,
        )
        raise ValueError(
            "An active instance of this lab already exists. "
            "Stop or terminate it before launching a new one."
        )

    # 3. Compute max score from guide version (best-effort)
    max_score = _compute_max_score(db, lab.guide_version_id)

    # 4. Insert provisioning row with guide_version snapshot and session state
    duration = lab.duration_minutes or 60
    now = datetime.now(timezone.utc)
    instance = LabInstance(
        lab_definition_id=lab_definition_id,
        trainee_id=trainee_id,
        guide_version_id=lab.guide_version_id,  # snapshot at launch time
        status="provisioning",
        created_at=now,
        expires_at=now + timedelta(minutes=duration),
        duration_minutes=duration,
        guacamole_connections={},
        session_state=None,  # set after flush so we have the real instance.id
        current_step_index=0,
    )
    db.add(instance)
    db.flush()  # generate instance.id without full commit

    instance.session_state = _build_initial_session_state(
        instance_id=instance.id,
        lab_definition_id=lab_definition_id,
        guide_version_id=lab.guide_version_id,
        trainee_id=trainee_id,
        max_score=max_score,
    )
    instance.session_state["runtime_context"]["expires_at"] = (
        instance.expires_at.isoformat() if instance.expires_at else None
    )

    db.commit()
    db.refresh(instance)

    # ── Register expiry in Redis ZSET immediately ───────────────────────
    # This ensures the enforcer knows about the instance even if the user
    # leaves before the first refresh or the worker hasn't finished yet.
    try:
        register_instance_expiry(instance.id, instance.expires_at)
        logger.info(
            "[ENQUEUE-LAUNCH] Registered expiry | instance=%s expires_at=%s",
            instance.id,
            instance.expires_at.isoformat(),
        )
    except Exception as e:
        logger.error(
            "[ENQUEUE-LAUNCH] Failed to register Redis expiry | instance=%s error=%s",
            instance.id,
            e,
        )
        # Non-fatal: the enforcer's DB reconciliation will catch it,
        # but log loudly so ops knows Redis might be down.

    logger.info(
        "[ENQUEUE-LAUNCH] Instance %s created in 'provisioning' (guide_version=%s)",
        instance.id,
        lab.guide_version_id,
    )

    # 5. Audit row (UUID reused as Celery task_id)
    # API path: no shared session, so let start_task open its own
    task_audit_id = start_task(
        instance.id,
        "launch",
        metadata={
            "lab_definition_id": str(lab_definition_id),
            "trainee_id": str(trainee_id),
            "guide_version_id": str(lab.guide_version_id) if lab.guide_version_id else None,
        },
    )

    # 6. Enqueue to Celery
    try:
        launch_instance_task.apply_async(
            args=[str(instance.id), str(trainee_id)],
            task_id=str(task_audit_id),
            queue="lab.provisioning",
        )
        logger.info(
            "[ENQUEUE-LAUNCH] Celery task %s enqueued for instance %s",
            task_audit_id,
            instance.id,
        )
    except Exception as e:
        logger.error(
            "[ENQUEUE-LAUNCH] Redis down — failed to enqueue task %s: %s",
            task_audit_id,
            e,
        )
        instance.status = "failed"
        instance.error_message = f"Task queue unavailable: {e}"
        db.commit()
        # Clean up Redis since the instance is failed
        try:
            remove_instance_expiry(instance.id)
        except Exception:
            pass
        # API path: no shared session, let finish_task open its own
        finish_task(task_audit_id, "failed", str(e))
        raise RuntimeError("Task queue unavailable") from e

    return instance


# ═══════════════════════════════════════════════════════════════════════════════
#  LAUNCH WORKER (Celery)
# ═══════════════════════════════════════════════════════════════════════════════

def run_launch_worker(
    instance_id: str,
    trainee_id: str,
    task_id: str,
) -> Dict[str, Any]:
    """
    Idempotent launch worker.

    Re-loads the row with row-level locking, checks vm_uuid to avoid double-clone,
    then clone → power-on → IP discovery.

    CRITICAL DESIGN: DB session is NOT held across vCenter I/O.
    The session is opened for read/write operations and closed before
    any network call to vCenter. This prevents connection pool exhaustion.

    Status stays 'provisioning'; the next /refresh poll transitions
    to 'running' once Guacamole connections are created.
    """
    from uuid import UUID as PyUUID
    from app.utils.db_session import background_session
    from sqlalchemy import inspect as sa_inspect

    task_uuid = PyUUID(task_id)
    instance_uuid = PyUUID(instance_id)

    # Structured logger with task context
    task_logger = log_task(
        logger,
        task_id=task_id,
        instance_id=instance_id,
        trainee_id=trainee_id,
    )

    task_logger.info("Worker started")

    # ═══════════════════════════════════════════════════════════════════════
    #  PHASE 1: Load instance with row lock, validate, mark task running
    # ═══════════════════════════════════════════════════════════════════════
    with background_session() as db:
        mark_running(
            task_uuid,
            worker_pid=os.getpid(),
            worker_host=socket.gethostname(),
            db=db,
        )

        # Query 1: Lock the instance row (NO joinedload)
        instance = (
            db.query(LabInstance)
            .filter(LabInstance.id == instance_uuid)
            .with_for_update()
            .first()
        )

        if not instance:
            task_logger.error("Instance not found in database")
            finish_task(task_uuid, "failed", "Instance not found", db=db)
            return

        if instance.status in ("terminating", "terminated"):
            task_logger.info("Instance already terminating — nothing to do")
            finish_task(task_uuid, "completed", "Instance already terminating", db=db)
            return

        # Query 2: Load related data separately (NO lock needed)
        db.refresh(instance, ["lab_definition"])
        lab_definition = instance.lab_definition
        if lab_definition:
            db.refresh(lab_definition, ["vms"])

        vm_config = lab_definition.vms[0] if lab_definition and lab_definition.vms else None
        if not vm_config:
            task_logger.error("Lab definition has no VMs configured")
            instance.status = "failed"
            instance.error_message = "Lab definition has no VMs"
            finish_task(task_uuid, "failed", "Lab definition has no VMs", db=db)
            return

        # Capture values needed outside the session
        source_vm_id = vm_config.source_vm_id
        lab_slug = lab_definition.slug
        existing_vm_uuid = instance.vm_uuid
        existing_vcenter_host = instance.vcenter_host

        # Commit to release row lock before vCenter I/O
        db.commit()
        task_logger.info(
            "Instance validated | vm_uuid=%s vcenter=%s",
            existing_vm_uuid or "None",
            existing_vcenter_host or "None",
        )

    # ═══════════════════════════════════════════════════════════════════════
    #  PHASE 2: vCenter discovery (NO DB session held)
    # ═══════════════════════════════════════════════════════════════════════
    if existing_vm_uuid and existing_vcenter_host:
        vcenter_creds = _find_vcenter_credentials(existing_vcenter_host)
        task_logger.info(
            "Resuming with vCenter %s",
            existing_vcenter_host,
        )
    else:
        vcenter_creds = _find_vcenter_for_template(source_vm_id)
        task_logger.info(
            "Discovered vCenter for template %s",
            source_vm_id,
        )

    if not vcenter_creds:
        _fail_instance(
            instance_uuid,
            task_uuid,
            f"No vCenter found hosting template {source_vm_id}",
        )
        return

    # ═══════════════════════════════════════════════════════════════════════
    #  PHASE 3: vCenter connect + clone (NO DB session held)
    # ═══════════════════════════════════════════════════════════════════════
    client = VCenterClient(
        host=vcenter_creds["host"],
        username=vcenter_creds["username"],
        password=vcenter_creds["password"],
    )
    if not client.connect():
        _fail_instance(
            instance_uuid,
            task_uuid,
            f"Failed to connect to vCenter {vcenter_creds['host']}",
        )
        return

    try:
        task_logger.info(
            "vCenter connected | host=%s",
            vcenter_creds["host"],
        )

        # --- Clone (skipped if idempotent resume) -----------------------
        if not existing_vm_uuid:
            new_vm_name = (
                f"{lab_slug}-{str(trainee_id)[:8]}-{uuid.uuid4().hex[:8]}"
            )

            task_logger.info(
                "Cloning VM | template=%s name=%s",
                source_vm_id,
                new_vm_name,
            )

            clone_result = _call_with_timeout(
                client.clone_vm,
                220,
                template_uuid=source_vm_id,
                new_vm_name=new_vm_name,
            )
            vm_uuid = clone_result["uuid"]

            task_logger.info(
                "Clone completed | vm_uuid=%s",
                vm_uuid,
            )

            # ═══════════════════════════════════════════════════════════════
            #  PHASE 4: Persist clone result (fresh session, short-lived)
            # ═══════════════════════════════════════════════════════════════
            with background_session() as db:
                record_event(
                    task_uuid,
                    instance_uuid,
                    "clone_completed",
                    f"Clone successful: {vm_uuid}",
                    db=db,
                )

                instance = (
                    db.query(LabInstance)
                    .filter(LabInstance.id == instance_uuid)
                    .with_for_update()
                    .first()
                )

                if not instance:
                    task_logger.error("Instance disappeared during clone")
                    finish_task(task_uuid, "failed", "Instance disappeared during clone", db=db)
                    return

                # Race check: was terminate requested while we were cloning?
                if instance.status in ("terminating", "terminated"):
                    _abort_after_race(
                        db, instance, vm_uuid, client, task_uuid, task_logger
                    )
                    return

                instance.vm_uuid = vm_uuid
                instance.vm_name = new_vm_name
                instance.vcenter_host = vcenter_creds["host"]
                db.commit()

                record_event(
                    task_uuid,
                    instance_uuid,
                    "vm_uuid_committed",
                    f"vm_uuid={vm_uuid} committed",
                    db=db,
                )

            existing_vm_uuid = vm_uuid  # for subsequent phases
        else:
            task_logger.info(
                "Clone skipped | resuming with vm_uuid=%s",
                existing_vm_uuid,
            )

        # ═══════════════════════════════════════════════════════════════════
        #  PHASE 5: Power on (NO DB session held)
        # ═══════════════════════════════════════════════════════════════════
        task_logger.info("Powering on VM | vm_uuid=%s", existing_vm_uuid)
        _call_with_timeout(client.power_on_vm, 120, existing_vm_uuid)
        task_logger.info("VM powered on | vm_uuid=%s", existing_vm_uuid)

        # ═══════════════════════════════════════════════════════════════════
        #  PHASE 6: IP discovery (NO DB session held)
        # ═══════════════════════════════════════════════════════════════════
        task_logger.info("Waiting for IP | vm_uuid=%s", existing_vm_uuid)
        power_state = _call_with_timeout(
            client.get_vm_power_state, 40, existing_vm_uuid
        )
        ip_address = _call_with_timeout(
            client.get_vm_ip, 120, existing_vm_uuid
        )
        task_logger.info(
            "IP acquired | ip=%s power_state=%s",
            ip_address,
            power_state,
        )

    finally:
        client.disconnect()

    # ═══════════════════════════════════════════════════════════════════════
    #  PHASE 7: Final state persistence (fresh session, atomic commit)
    # ═══════════════════════════════════════════════════════════════════════
    with background_session() as db:
        instance = (
            db.query(LabInstance)
            .filter(LabInstance.id == instance_uuid)
            .with_for_update()
            .first()
        )

        if not instance:
            task_logger.error("Instance disappeared before final commit")
            finish_task(task_uuid, "failed", "Instance disappeared before final commit", db=db)
            return

        # Final race check
        if instance.status in ("terminating", "terminated"):
            _abort_after_race(
                db, instance, existing_vm_uuid, client, task_uuid, task_logger
            )
            return

        instance.power_state = power_state
        instance.ip_address = ip_address

        # Update session_state with VM mapping
        if instance.session_state:
            # Ensure SQLAlchemy detects the mutation
            session_state = dict(instance.session_state)
            runtime = dict(session_state.get("runtime_context", {}))

            vm_mapping = {
                "vm_name": instance.vm_name or "lab-vm",
                "instance_id": existing_vm_uuid,
                "ip_address": ip_address,
                "hostname": None,
                "status": "running" if power_state == "poweredOn" else power_state,
            }
            runtime["vm_mappings"] = [vm_mapping]
            runtime["default_vm"] = instance.vm_name

            session_state["runtime_context"] = runtime
            instance.session_state = session_state  # ← triggers change detection

        record_event(
            task_uuid,
            instance_uuid,
            "ip_acquired",
            f"IP={ip_address}, power_state={power_state}",
            db=db,
        )

        db.commit()

        # ── Ensure Redis ZSET has the expiry (idempotent) ───────────────
        # If the enqueue path failed to register (e.g. Redis blip), this
        # ensures the enforcer will still clean up the instance.
        try:
            if instance.expires_at:
                register_instance_expiry(instance.id, instance.expires_at)
                task_logger.info(
                    "Confirmed Redis expiry | instance=%s expires_at=%s",
                    instance.id,
                    instance.expires_at.isoformat(),
                )
        except Exception as e:
            task_logger.warning(
                "Failed to confirm Redis expiry | instance=%s error=%s",
                instance.id,
                e,
            )

        finish_task(task_uuid, "completed", db=db)
        task_logger.info("Worker completed successfully")

        # Return the final state for Celery result backend
        return {
            "instance_id": str(instance_uuid),
            "status": instance.status,
            "vm_uuid": instance.vm_uuid,
            "vm_name": instance.vm_name,
            "ip_address": instance.ip_address,
            "power_state": instance.power_state,
            "vcenter_host": instance.vcenter_host,
            "task_id": str(task_uuid),
            "trainee_id": trainee_id,
            "expires_at_iso": instance.expires_at.isoformat() if instance.expires_at else None,
            "expires_at_unix": instance.expires_at.timestamp() if instance.expires_at else None,
            "started_at_iso": instance.created_at.isoformat() if instance.created_at else None,
            "started_at_unix": instance.created_at.timestamp() if instance.created_at else None,
        }

    return {"status": "error", "message": "Worker exited without result"}


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _fail_instance(
    instance_id: uuid.UUID,
    task_id: uuid.UUID,
    error_message: str,
) -> None:
    """
    Mark an instance as failed and finish the audit task.
    Opens its own session since this is called from exception handlers
    or early-exit paths where no session is active.
    """
    from app.utils.db_session import background_session

    with background_session() as db:
        instance = (
            db.query(LabInstance)
            .filter(LabInstance.id == instance_id)
            .first()
        )
        if instance:
            instance.status = "failed"
            instance.error_message = error_message
            db.commit()

        finish_task(task_id, "failed", error_message, db=db)


def _abort_after_race(
    db: Session,
    instance: LabInstance,
    vm_uuid: str,
    client: VCenterClient,
    task_uuid: uuid.UUID,
    task_logger: logging.LoggerAdapter,
) -> None:
    """
    Called when a terminate request raced with our provisioning.
    Destroys the VM we just created and cleans up the instance row.
    """
    task_logger.warning(
        "Race detected: instance marked terminating — self-destructing VM | vm_uuid=%s",
        vm_uuid,
    )

    record_event(
        task_uuid,
        instance.id,
        "task_aborted",
        "Instance marked terminating after clone — self-destructing VM",
        db=db,
    )

    # Destroy VM (reconnect if needed — client was disconnected in finally)
    try:
        if not client._connected:  # or however you check connection state
            client.connect()
        vm = client.find_vm_by_uuid(vm_uuid)
        if vm:
            if str(vm.runtime.powerState) == "poweredOn":
                task = vm.PowerOffVM_Task()
                client._wait_for_task(task)
            task = vm.Destroy_Task()
            client._wait_for_task(task)
    except Exception as e:
        task_logger.error("Failed to destroy raced VM: %s", e)
        # Continue to cleanup DB state regardless

    instance.vm_uuid = None
    instance.vm_name = None
    instance.vcenter_host = None
    db.commit()

    # ── Clean up Redis expiry queue ─────────────────────────────────────
    try:
        remove_instance_expiry(instance.id)
        task_logger.info(
            "Removed Redis expiry after race abort | instance=%s",
            instance.id,
        )
    except Exception as e:
        task_logger.warning(
            "Failed to remove Redis expiry after race abort | instance=%s error=%s",
            instance.id,
            e,
        )

    finish_task(
        task_uuid,
        "completed",
        "Aborted: instance was terminating",
        db=db,
    )