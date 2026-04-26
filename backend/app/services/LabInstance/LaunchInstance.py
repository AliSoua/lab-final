# app/services/LabInstance/LaunchInstance.py
"""
Lab Instance Launch Service
Handles enqueueing launch requests and the Celery worker launch body.
"""

import uuid
import os
import socket
import logging
from datetime import datetime, timedelta
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError

from sqlalchemy.orm import Session, joinedload

from app.models.LabDefinition.core import LabDefinition
from app.models.LabDefinition.LabInstance import LabInstance
from app.models.LabDefinition.LabGuide import GuideVersion
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
    instance = LabInstance(
        lab_definition_id=lab_definition_id,
        trainee_id=trainee_id,
        guide_version_id=lab.guide_version_id,  # snapshot at launch time
        status="provisioning",
        started_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(hours=4),
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

    logger.info(
        "[ENQUEUE-LAUNCH] Instance %s created in 'provisioning' (guide_version=%s)",
        instance.id,
        lab.guide_version_id,
    )

    # 5. Audit row (UUID reused as Celery task_id)
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
) -> None:
    """
    Idempotent launch worker.
    Re-loads the row, checks vm_uuid to avoid double-clone,
    then clone → early commit → power-on → IP discovery.
    Status stays 'provisioning'; the next /refresh poll transitions
    to 'running' once Guacamole connections are created.
    """
    from uuid import UUID as PyUUID
    from app.utils.db_session import background_session

    task_uuid = PyUUID(task_id)

    with background_session() as db:
        mark_running(
            task_uuid,
            worker_pid=os.getpid(),
            worker_host=socket.gethostname(),
        )

        instance = (
            db.query(LabInstance)
            .filter(LabInstance.id == instance_id)
            .options(
                joinedload(LabInstance.lab_definition).joinedload(LabDefinition.vms)
            )
            .first()
        )
        if not instance:
            logger.error("[LAUNCH-WORKER] Instance %s not found", instance_id)
            finish_task(task_uuid, "failed", "Instance not found")
            return

        if instance.status in ("terminating", "terminated"):
            finish_task(task_uuid, "completed", "Instance already terminating")
            return

        vm_config = (
            instance.lab_definition.vms[0] if instance.lab_definition.vms else None
        )
        if not vm_config:
            finish_task(task_uuid, "failed", "Lab definition has no VMs")
            instance.status = "failed"
            instance.error_message = "Lab definition has no VMs"
            db.commit()
            return

        try:
            # --- vCenter discovery ---------------------------------------
            if instance.vm_uuid and instance.vcenter_host:
                vcenter_creds = _find_vcenter_credentials(instance.vcenter_host)
                logger.info("[WORKER] Vcenter credentials are: %s", vcenter_creds)
                record_event(
                    task_uuid,
                    instance.id,
                    "vcenter_connect",
                    f"Resuming with vCenter {instance.vcenter_host}",
                )
            else:
                vcenter_creds = _find_vcenter_for_template(vm_config.source_vm_id)
                logger.info("[WORKER] Vcenter credentials are: %s", vcenter_creds)
                record_event(
                    task_uuid,
                    instance.id,
                    "vcenter_connect",
                    f"Discovered vCenter for template {vm_config.source_vm_id}",
                )

            if not vcenter_creds:
                raise ValueError(
                    f"No vCenter found hosting template {vm_config.source_vm_id}"
                )

            client = VCenterClient(
                host=vcenter_creds["host"],
                username=vcenter_creds["username"],
                password=vcenter_creds["password"],
            )
            if not client.connect():
                raise RuntimeError(
                    f"Failed to connect to vCenter {vcenter_creds['host']}"
                )

            try:
                logger.info("[WORKER] Instance before modification: %s", instance)
                vm_uuid = instance.vm_uuid
                logger.info("[WORKER] Vcenter VM uuid: %s", vm_uuid)

                # --- Clone (skipped if idempotent resume) ---------------
                if not vm_uuid:
                    new_vm_name = (
                        f"{instance.lab_definition.slug}-"
                        f"{str(trainee_id)[:8]}-{uuid.uuid4().hex[:8]}"
                    )

                    record_event(
                        task_uuid,
                        instance.id,
                        "clone_started",
                        f"Cloning {vm_config.source_vm_id} → {new_vm_name}",
                    )

                    clone_result = _call_with_timeout(
                        client.clone_vm,
                        220,
                        template_uuid=vm_config.source_vm_id,
                        new_vm_name=new_vm_name,
                    )
                    vm_uuid = clone_result["uuid"]

                    record_event(
                        task_uuid,
                        instance.id,
                        "clone_completed",
                        f"Clone successful: {vm_uuid}",
                    )

                    instance.vm_uuid = vm_uuid
                    instance.vm_name = new_vm_name
                    instance.vcenter_host = vcenter_creds["host"]
                    db.commit()

                    record_event(
                        task_uuid,
                        instance.id,
                        "vm_uuid_committed",
                        f"vm_uuid={vm_uuid} committed",
                    )
                else:
                    record_event(
                        task_uuid,
                        instance.id,
                        "clone_skipped",
                        f"Resuming with existing vm_uuid={vm_uuid}",
                    )

                # Re-check status after clone (race with terminate)
                db.refresh(instance)

                if instance.status in ("terminating", "terminated"):
                    record_event(
                        task_uuid,
                        instance.id,
                        "task_aborted",
                        "Instance marked terminating after clone — self-destructing VM",
                    )
                    vm = client.find_vm_by_uuid(vm_uuid)
                    if vm:
                        if str(vm.runtime.powerState) == "poweredOn":
                            task = vm.PowerOffVM_Task()
                            client._wait_for_task(task)
                        task = vm.Destroy_Task()
                        client._wait_for_task(task)
                    instance.vm_uuid = None
                    instance.vm_name = None
                    instance.vcenter_host = None
                    db.commit()
                    finish_task(
                        task_uuid, "completed", "Aborted: instance was terminating"
                    )
                    return

                # --- Power on -------------------------------------------
                record_event(
                    task_uuid,
                    instance.id,
                    "power_on_started",
                    f"Powering on VM {vm_uuid}",
                )
                _call_with_timeout(client.power_on_vm, 120, vm_uuid)
                record_event(
                    task_uuid,
                    instance.id,
                    "power_on_completed",
                    f"VM {vm_uuid} powered on",
                )

                # --- IP discovery ---------------------------------------
                record_event(
                    task_uuid,
                    instance.id,
                    "ip_discovery_started",
                    f"Waiting for IP on {vm_uuid}",
                )
                power_state = _call_with_timeout(
                    client.get_vm_power_state, 40, vm_uuid
                )
                ip_address = _call_with_timeout(client.get_vm_ip, 120, vm_uuid)

                record_event(
                    task_uuid,
                    instance.id,
                    "ip_acquired",
                    f"IP={ip_address}, power_state={power_state}",
                )

                instance.power_state = power_state
                instance.ip_address = ip_address

                # ── NEW: Update session_state with VM mapping ───────────
                if instance.session_state:
                    vm_mapping = {
                        "vm_name": instance.vm_name or "lab-vm",
                        "instance_id": vm_uuid,
                        "ip_address": ip_address,
                        "hostname": None,
                        "status": (
                            "running"
                            if power_state == "poweredOn"
                            else power_state
                        ),
                    }
                    instance.session_state["runtime_context"]["vm_mappings"] = [
                        vm_mapping
                    ]
                    instance.session_state["runtime_context"]["default_vm"] = (
                        instance.vm_name
                    )

                db.commit()
                finish_task(task_uuid, "completed")

            finally:
                client.disconnect()

        except TimeoutError as te:
            logger.error(
                "[LAUNCH-WORKER] Timeout for instance %s: %s",
                instance_id,
                te,
            )
            db.rollback()
            instance = (
                db.query(LabInstance)
                .filter(LabInstance.id == instance_id)
                .first()
            )
            if instance:
                instance.status = "failed"
                instance.error_message = str(te)
                db.commit()
            finish_task(task_uuid, "failed", str(te))
            raise

        except Exception as e:
            logger.error(
                "[LAUNCH-WORKER] Failed for instance %s: %s",
                instance_id,
                e,
                exc_info=True,
            )
            db.rollback()
            instance = (
                db.query(LabInstance)
                .filter(LabInstance.id == instance_id)
                .first()
            )
            if instance:
                instance.status = "failed"
                instance.error_message = str(e)
                db.commit()
            finish_task(task_uuid, "failed", str(e))
            raise
