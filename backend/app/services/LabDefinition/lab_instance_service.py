# app/services/LabDefinition/lab_instance_service.py
import uuid
import json
import logging
import os
import socket
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.services.guacamole_service import guacamole_service
from app.services.user_service import user_service

from app.models.LabDefinition.core import LabDefinition
from app.models.LabDefinition.LabInstance import LabInstance
from app.config.connection.vcenter_client import VCenterClient
from app.config.connection.vault_client import VaultClient
from app.services.vault.credentials import (
    read_credentials,
    list_admin_vcenters,
)
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
logger = logging.getLogger(__name__)


def _call_with_timeout(func, timeout_sec: int, *args, **kwargs):
    """Run a blocking function in a thread with a timeout. Safe inside Celery ForkPoolWorkers."""
    with ThreadPoolExecutor(max_workers=1) as ex:
        future = ex.submit(func, *args, **kwargs)
        try:
            return future.result(timeout=timeout_sec)
        except FutureTimeoutError:
            raise TimeoutError(f"{func.__name__} timed out after {timeout_sec}s")

class LabInstanceService:

    def __init__(self, db: Session = None):
        self.db = db

    def enqueue_launch(
        self,
        db: Session,
        lab_definition_id: uuid.UUID,
        trainee_id: str,
    ) -> LabInstance:
        """
        Synchronous enqueue path.
        Validates, inserts a 'provisioning' row, commits, starts audit,
        then pushes the Celery task.  If Redis is down the row is flipped
        to 'failed' and the exception is re-raised so the router can 502.
        """
        from app.services.LabDefinition.task_audit import start_task, finish_task
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
            logger.error("[ENQUEUE-LAUNCH] Lab definition %s not found", lab_definition_id)
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

        # 3. Insert provisioning row (no vm_uuid yet — worker fills it in)
        instance = LabInstance(
            lab_definition_id=lab_definition_id,
            trainee_id=trainee_id,
            status="provisioning",
            started_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(hours=4),
            guacamole_connections={},
        )
        db.add(instance)
        db.commit()
        db.refresh(instance)

        logger.info(
            "[ENQUEUE-LAUNCH] Instance %s created in 'provisioning'",
            instance.id,
        )

        # 4. Audit row (UUID reused as Celery task_id)
        task_audit_id = start_task(
            instance.id,
            "launch",
            metadata={
                "lab_definition_id": str(lab_definition_id),
                "trainee_id": str(trainee_id),
            },
        )

        # 5. Enqueue to Celery
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

    # ------------------------------------------------------------------
    # Worker body (called by Celery)
    # ------------------------------------------------------------------

    def _launch_worker(
        self,
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
        from uuid import UUID
        from app.services.LabDefinition.task_audit import (
            mark_running,
            record_event,
            finish_task,
        )

        task_uuid = UUID(task_id)

        # Use the injected session if available, otherwise open our own
        db = self.db
        if db is None:
            from app.utils.db_session import background_session
            with background_session() as db:
                self.db = db
                return self._launch_worker(instance_id, trainee_id, task_id)

        mark_running(
            task_uuid,
            worker_pid=os.getpid(),
            worker_host=socket.gethostname(),
        )

        instance = (
            db.query(LabInstance)
            .filter(LabInstance.id == instance_id)
            .options(joinedload(LabInstance.lab_definition).joinedload(LabDefinition.vms))
            .first()
        )
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found")
            return

        # Early exit if already terminated
        if instance.status in ("terminating", "terminated"):
            finish_task(task_uuid, "completed", "Instance already terminating")
            return

        vm_config = instance.lab_definition.vms[0] if instance.lab_definition.vms else None
        if not vm_config:
            finish_task(task_uuid, "failed", "Lab definition has no VMs")
            instance.status = "failed"
            instance.error_message = "Lab definition has no VMs"
            db.commit()
            return

        try:
            # --- vCenter discovery ---------------------------------------
            if instance.vm_uuid and instance.vcenter_host:
                # Resuming after a retry — we already know the vCenter
                vcenter_creds = self._find_vcenter_credentials(instance.vcenter_host)
                logger.info(
                    "[WORKER] Vcenter credentials are: %s",
                    vcenter_creds,
                )
                record_event(
                    task_uuid,
                    instance.id,
                    "vcenter_connect",
                    f"Resuming with vCenter {instance.vcenter_host}",
                )
            else:
                vcenter_creds = self._find_vcenter_for_template(vm_config.source_vm_id)
                logger.info(
                    "[WORKER] Vcenter credentials are: %s",
                    vcenter_creds,
                )
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
                logger.info(
                    "[WORKER] Instance before modification: %s",
                    instance,
                )
                vm_uuid = instance.vm_uuid
                logger.info(
                    "[WORKER] Vcenter VM uuid: %s",
                    vm_uuid,
                )

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
                        180,  # 3 min timeout for clone
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

                    # Early commit so a concurrent terminate sees vm_uuid
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
                # FIX: use refresh() instead of with_for_update() to avoid deadlock
                # with the HTTP /refresh endpoint that may hold the lock.
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
                    finish_task(task_uuid, "completed", "Aborted: instance was terminating")
                    return

                # --- Power on -------------------------------------------
                record_event(
                    task_uuid,
                    instance.id,
                    "power_on_started",
                    f"Powering on VM {vm_uuid}",
                )
                _call_with_timeout(client.power_on_vm, 300, vm_uuid)
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
                    client.get_vm_power_state, 60, vm_uuid
                )
                ip_address = _call_with_timeout(
                    client.get_vm_ip, 180, vm_uuid
                )

                record_event(
                    task_uuid,
                    instance.id,
                    "ip_acquired",
                    f"IP={ip_address}, power_state={power_state}",
                )

                instance.power_state = power_state
                instance.ip_address = ip_address
                # Status stays 'provisioning' — /refresh handles Guacamole → 'running'
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

        except (ConnectionError, TimeoutError):
            # Transient — let Celery retry.  Do NOT mark failed.
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

    # ------------------------------------------------------------------
    # Terminate — public enqueue (API container)
    # ------------------------------------------------------------------

    def enqueue_terminate(
        self,
        db: Session,
        instance_id: uuid.UUID,
        trainee_id: str,
    ) -> LabInstance:
        """
        Synchronous enqueue path.
        Idempotent: accepts 'failed' rows; no-op if already terminating/terminated.
        Deletes Guacamole connections immediately, then hands the vCenter destroy
        to a Celery worker.
        """
        from app.services.LabDefinition.task_audit import start_task, finish_task
        from app.tasks.lab_instance_tasks import terminate_instance_task

        logger.info(
            "[ENQUEUE-TERMINATE] instance=%s trainee=%s",
            instance_id,
            trainee_id,
        )

        instance = (
            db.query(LabInstance)
            .filter(
                LabInstance.id == instance_id,
                LabInstance.trainee_id == trainee_id,
            )
            .with_for_update()
            .first()
        )
        if not instance:
            logger.error("[ENQUEUE-TERMINATE] Instance %s not found", instance_id)
            raise ValueError("Instance not found")

        # Idempotency — already in flight or done
        if instance.status in ("terminating", "terminated"):
            logger.info(
                "[ENQUEUE-TERMINATE] Instance %s already %s, returning as-is",
                instance_id,
                instance.status,
            )
            return instance

        # Accept failed rows too (user wants to clean up a broken instance)
        if instance.status not in ("provisioning", "running", "stopped", "failed"):
            raise ValueError(
                f"Cannot terminate instance in status '{instance.status}'"
            )

        # 1. Flip to terminating and commit so concurrent /refresh skips it
        instance.status = "terminating"
        db.commit()
        db.refresh(instance)

        # 2. Delete Guacamole connections synchronously (same as old code)
        self._delete_guacamole_connections(instance, db=db)
        db.commit()

        # 3. Audit row
        task_audit_id = start_task(
            instance.id,
            "terminate",
            metadata={
                "instance_id": str(instance_id),
                "trainee_id": str(trainee_id),
                "previous_status": instance.status,
            },
        )

        # 4. Enqueue Celery task
        try:
            terminate_instance_task.apply_async(
                args=[str(instance.id), str(trainee_id)],
                task_id=str(task_audit_id),
                queue="lab.cleanup",
            )
            logger.info(
                "[ENQUEUE-TERMINATE] Celery task %s enqueued for instance %s",
                task_audit_id,
                instance.id,
            )
        except Exception as e:
            logger.error(
                "[ENQUEUE-TERMINATE] Redis down — failed to enqueue task %s: %s",
                task_audit_id,
                e,
            )
            instance.status = "failed"
            instance.error_message = f"Task queue unavailable: {e}"
            db.commit()
            finish_task(task_audit_id, "failed", str(e))
            raise RuntimeError("Task queue unavailable") from e

        return instance

    # ------------------------------------------------------------------
    # Terminate — worker body (Celery)
    # ------------------------------------------------------------------

    def _terminate_worker(
        self,
        instance_id: str,
        trainee_id: str,
        task_id: str,
    ) -> None:
        """
        Idempotent terminate worker.
        Re-loads the row, destroys the VM, then marks terminated.
        Short-circuits if vm_uuid is None (clone hasn't committed yet).
        """
        from uuid import UUID
        from app.services.LabDefinition.task_audit import (
            mark_running,
            record_event,
            finish_task,
        )

        task_uuid = UUID(task_id)

        db = self.db
        if db is None:
            from app.utils.db_session import background_session
            with background_session() as db:
                self.db = db
                return self._terminate_worker(instance_id, trainee_id, task_id)

        mark_running(
            task_uuid,
            worker_pid=os.getpid(),
            worker_host=socket.gethostname(),
        )

        instance = (
            db.query(LabInstance)
            .filter(LabInstance.id == instance_id)
            .with_for_update()
            .first()
        )
        if not instance:
            finish_task(task_uuid, "failed", "Instance not found")
            return

        # Already done (idempotent re-delivery)
        if instance.status == "terminated":
            db.commit()
            finish_task(task_uuid, "completed", "Already terminated")
            return

        # Short-circuit: launch worker hasn't committed vm_uuid yet
        if not instance.vm_uuid:
            record_event(
                task_uuid,
                instance.id,
                "terminate_short_circuit",
                "vm_uuid is None — clone not yet committed, nothing to destroy",
            )
            instance.status = "terminated"
            instance.stopped_at = datetime.utcnow()
            db.commit()
            finish_task(task_uuid, "completed", "Short-circuit: no VM to destroy")
            return

        try:
            if instance.vm_uuid and instance.vcenter_host:
                record_event(
                    task_uuid,
                    instance.id,
                    "vcenter_destroy_started",
                    f"Destroying VM {instance.vm_uuid} on {instance.vcenter_host}",
                )

                creds = self._find_vcenter_credentials(instance.vcenter_host)
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
                                    try:
                                        task = vm.PowerOffVM_Task()
                                        client._wait_for_task(task)
                                    except Exception as e:
                                        record_event(
                                            task_uuid,
                                            instance.id,
                                            "power_off_warning",
                                            f"Power off before destroy failed (non-fatal): {e}",
                                        )

                                task = vm.Destroy_Task()
                                client._wait_for_task(task)
                                record_event(
                                    task_uuid,
                                    instance.id,
                                    "vcenter_destroy_completed",
                                    f"Destroyed VM {instance.vm_uuid}",
                                )
                        except Exception as e:
                            record_event(
                                task_uuid,
                                instance.id,
                                "vcenter_destroy_failed",
                                str(e),
                            )
                            raise
                        finally:
                            client.disconnect()
                    else:
                        record_event(
                            task_uuid,
                            instance.id,
                            "vcenter_connect_failed",
                            f"Could not connect to {instance.vcenter_host}",
                        )
                else:
                    record_event(
                        task_uuid,
                        instance.id,
                        "vcenter_creds_missing",
                        f"No credentials for {instance.vcenter_host}",
                    )

            instance.status = "terminated"
            instance.stopped_at = datetime.utcnow()
            db.commit()

            finish_task(task_uuid, "completed")

        except Exception as e:
            logger.error(
                "[TERMINATE-WORKER] Failed for instance %s: %s",
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

    def terminate_instance(
        self,
        db: Session,
        instance_id: uuid.UUID,
        trainee_id: str,
    ) -> None:
        """
        DEPRECATED — retained for backward compatibility.
        Use `enqueue_terminate()` for all new code.
        """
        logger.warning(
            "[DEPRECATED] terminate_instance() called — use enqueue_terminate()"
        )
        self.enqueue_terminate(db, instance_id, trainee_id)

    def launch_instance(
        self,
        db: Session,
        lab_definition_id: uuid.UUID,
        trainee_id: str,
    ) -> LabInstance:
        """
        DEPRECATED — retained for backward compatibility.
        Use `enqueue_launch()` for all new code.
        """
        logger.warning(
            "[DEPRECATED] launch_instance() called — use enqueue_launch()"
        )
        return self.enqueue_launch(db, lab_definition_id, trainee_id)

    def launch_instance_old(
        self,
        db: Session,
        lab_definition_id: uuid.UUID,
        trainee_id: str,
    ) -> LabInstance:
        """
        Launch flow:
        1. Validate lab def + VMs
        2. Discover which vCenter hosts the template
        3. Clone & power on
        4. Persist LabInstance (status='provisioning')
        
        Guacamole connections are created later by refresh_instance_status()
        once the VM IP is available.
        """
        logger.info(
            "[LAUNCH] Starting instance launch for trainee=%s lab_definition=%s",
            trainee_id,
            lab_definition_id,
        )

        lab = (
            db.query(LabDefinition)
            .filter(LabDefinition.id == lab_definition_id)
            .first()
        )
        if not lab:
            logger.error("[LAUNCH] Lab definition %s not found", lab_definition_id)
            raise ValueError("Lab definition not found")

        if not lab.vms:
            logger.error("[LAUNCH] Lab definition %s has no VMs configured", lab_definition_id)
            raise ValueError("Lab definition has no VMs configured")

        vm_config = lab.vms[0]
        logger.debug(
            "[LAUNCH] Using VM config: source_vm_id=%s, name=%s",
            vm_config.source_vm_id,
            vm_config.name,
        )

        # Check connection slots for deferred Guacamole setup
        slots = getattr(lab, "connection_slots", None) or []
        if isinstance(slots, str):
            try:
                slots = json.loads(slots)
            except json.JSONDecodeError:
                slots = []
        logger.debug(
            "[LAUNCH] Lab has %d connection slot(s). Guacamole connections will be deferred until IP is available.",
            len(slots),
        )
        for slot in slots:
            if isinstance(slot, dict):
                logger.debug(
                    "[LAUNCH] Deferred slot: slug=%s ssh=%s rdp=%s vnc=%s",
                    slot.get("slug"),
                    slot.get("ssh", False),
                    slot.get("rdp", False),
                    slot.get("vnc", False),
                )

        # Prevent duplicate active instances for this trainee+lab
        existing = (
            db.query(LabInstance)
            .filter(
                LabInstance.lab_definition_id == lab_definition_id,
                LabInstance.trainee_id == trainee_id,
                LabInstance.status.in_(["provisioning", "running"]),
            )
            .first()
        )
        if existing:
            logger.warning(
                "[LAUNCH] Duplicate active instance found: id=%s status=%s",
                existing.id,
                existing.status,
            )
            raise ValueError(
                "An active instance of this lab already exists. "
                "Stop or terminate it before launching a new one."
            )

        # Discover vCenter credentials for this template UUID
        logger.debug(
            "[LAUNCH] Discovering vCenter for template %s",
            vm_config.source_vm_id,
        )
        vcenter_creds = self._find_vcenter_for_template(vm_config.source_vm_id)
        if not vcenter_creds:
            logger.error(
                "[LAUNCH] No vCenter found hosting template %s",
                vm_config.source_vm_id,
            )
            raise ValueError(
                f"No vCenter found hosting template {vm_config.source_vm_id}. "
                "Ensure the template UUID is correct and a vCenter is registered."
            )

        logger.info(
            "[LAUNCH] vCenter discovered: host=%s",
            vcenter_creds["host"],
        )

        client = VCenterClient(
            host=vcenter_creds["host"],
            username=vcenter_creds["username"],
            password=vcenter_creds["password"],
        )
        if not client.connect():
            logger.error(
                "[LAUNCH] Failed to connect to vCenter %s",
                vcenter_creds["host"],
            )
            raise RuntimeError(
                f"Failed to connect to vCenter {vcenter_creds['host']}"
            )

        try:
            new_vm_name = (
                f"{lab.slug}-{str(trainee_id)[:8]}-{uuid.uuid4().hex[:8]}"
            )

            logger.info(
                "[LAUNCH] Cloning template %s → %s on vCenter %s for trainee %s",
                vm_config.source_vm_id,
                new_vm_name,
                vcenter_creds["host"],
                trainee_id,
            )

            clone_result = client.clone_vm(
                template_uuid=vm_config.source_vm_id,
                new_vm_name=new_vm_name,
            )

            vm_uuid = clone_result["uuid"]
            logger.info(
                "[LAUNCH] Clone successful: new_vm_uuid=%s",
                vm_uuid,
            )

            logger.info("[LAUNCH] Powering on VM %s (%s)", new_vm_name, vm_uuid)
            client.power_on_vm(vm_uuid)

            power_state = client.get_vm_power_state(vm_uuid)
            ip_address = client.get_vm_ip(vm_uuid)

            logger.debug(
                "[LAUNCH] VM initial state: power_state=%s ip_address=%s",
                power_state,
                ip_address,
            )

            instance = LabInstance(
                lab_definition_id=lab_definition_id,
                trainee_id=trainee_id,
                vm_uuid=vm_uuid,
                vm_name=new_vm_name,
                vcenter_host=vcenter_creds["host"],
                status="provisioning",
                power_state=power_state,
                ip_address=ip_address,
                started_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(hours=4),
                guacamole_connections={},   # <-- JSON dict: { "slug_protocol": conn_id }
                guacamole_connection_id=None,
                connection_url=None,
            )
            db.add(instance)
            db.commit()
            db.refresh(instance)

            logger.info(
                "[LAUNCH] Lab instance %s launched for trainee %s. "
                "Status=%s. Guacamole connections deferred until IP detection.",
                instance.id,
                trainee_id,
                instance.status,
            )
            return instance

        finally:
            client.disconnect()
            logger.debug("[LAUNCH] Disconnected from vCenter %s", vcenter_creds["host"])

    def get_instance(
        self, db: Session, instance_id: uuid.UUID, trainee_id: str
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
        self,
        db: Session,
        trainee_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[LabInstance], int]:
        logger.debug(
            "[LIST] Listing instances for trainee %s (skip=%s, limit=%s)",
            trainee_id,
            skip,
            limit,
        )
        query = db.query(LabInstance).filter(
            LabInstance.trainee_id == trainee_id
        )
        total = query.count()
        items = (
            query.order_by(desc(LabInstance.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        logger.debug("[LIST] Found %d instances (total=%d)", len(items), total)
        return items, total

    def stop_instance(
        self, db: Session, instance_id: uuid.UUID, trainee_id: str,
    ) -> LabInstance:
        logger.info(
            "[STOP] Stopping instance %s for trainee %s",
            instance_id,
            trainee_id,
        )
        instance = self.get_instance(db, instance_id, trainee_id)
        if not instance:
            logger.error("[STOP] Instance %s not found", instance_id)
            raise ValueError("Instance not found")

        if instance.status in ["terminated", "stopped"]:
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
            creds = self._find_vcenter_credentials(instance.vcenter_host)
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
        db.commit()
        db.refresh(instance)
        logger.info(
            "[STOP] Instance %s stopped at %s",
            instance_id,
            instance.stopped_at,
        )
        return instance

    def terminate_instance_old(
        self, db: Session, instance_id: uuid.UUID, trainee_id: str,
    ) -> None:
        logger.info(
            "[TERMINATE] Terminating instance %s for trainee %s",
            instance_id,
            trainee_id,
        )
        instance = self.get_instance(db, instance_id, trainee_id)
        if not instance:
            logger.error("[TERMINATE] Instance %s not found", instance_id)
            raise ValueError("Instance not found")

        # 1. Mark the instance as 'terminating' and commit immediately so any
        # concurrent /refresh poller in another DB session sees the new status
        # and skips Guacamole sync (otherwise it could race with the deletion
        # below and re-create connections during the slow vCenter destroy).
        instance.status = "terminating"
        db.commit()
        db.refresh(instance)

        # 2. Delete all Guacamole connections and commit the empty map BEFORE
        # the slow VM destroy, so concurrent readers see the cleared state.
        logger.debug(
            "[TERMINATE] Deleting Guacamole connections for instance %s",
            instance_id,
        )
        self._delete_guacamole_connections(instance, db=db)
        db.commit()

        # 3. Destroy the VM
        if instance.vm_uuid and instance.vcenter_host:
            logger.debug(
                "[TERMINATE] Destroying VM %s on vCenter %s",
                instance.vm_uuid,
                instance.vcenter_host,
            )
            creds = self._find_vcenter_credentials(instance.vcenter_host)
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
                                try:
                                    logger.info(
                                        "[TERMINATE] Powering off VM %s before destroy",
                                        instance.vm_uuid,
                                    )
                                    task = vm.PowerOffVM_Task()
                                    client._wait_for_task(task)
                                except Exception as e:
                                    logger.warning(
                                        "[TERMINATE] Power off before destroy failed: %s", e
                                    )
                            logger.info(
                                "[TERMINATE] Destroying VM %s",
                                instance.vm_uuid,
                            )
                            task = vm.Destroy_Task()
                            client._wait_for_task(task)
                            logger.info(
                                "[TERMINATE] Destroyed VM %s", instance.vm_uuid
                            )
                    except Exception as e:
                        logger.error(
                            "[TERMINATE] Failed to destroy VM %s: %s",
                            instance.vm_uuid,
                            e,
                        )
                    finally:
                        client.disconnect()
                else:
                    logger.warning(
                        "[TERMINATE] Could not connect to vCenter %s",
                        instance.vcenter_host,
                    )
            else:
                logger.warning(
                    "[TERMINATE] No credentials found for vCenter %s",
                    instance.vcenter_host,
                )

        instance.status = "terminated"
        instance.stopped_at = datetime.utcnow()
        db.commit()
        logger.info(
            "[TERMINATE] Instance %s terminated at %s",
            instance_id,
            instance.stopped_at,
        )

    def refresh_instance_status(
        self, db: Session, instance_id: uuid.UUID, trainee_id: str
    ) -> LabInstance:
        logger.info(
            "[REFRESH] Refreshing status for instance %s (trainee=%s)",
            instance_id,
            trainee_id,
        )

        # CRITICAL: get_instance() must NOT use with_for_update().
        # If it does, remove it immediately or this will deadlock with the worker.
        instance = self.get_instance(db, instance_id, trainee_id)
        if not instance:
            logger.error("[REFRESH] Instance %s not found", instance_id)
            return None

        # Skip terminal/terminating states so a concurrent poller cannot
        # re-create Guacamole connections that terminate_instance just removed.
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

        creds = self._find_vcenter_credentials(instance.vcenter_host)
        if not creds:
            logger.error(
                "[REFRESH] No vCenter credentials found for host %s",
                instance.vcenter_host,
            )
            return instance

        # -----------------------------------------------------------------
        # vCenter interaction — run in a thread with timeout so the HTTP
        # request cannot hang forever if vCenter SOAP calls stall.
        # -----------------------------------------------------------------
        vm_uuid = instance.vm_uuid
        vcenter_host = instance.vcenter_host

        def _fetch_vm_state():
            client = VCenterClient(
                host=creds["host"],
                username=creds["username"],
                password=creds["password"],
            )
            if not client.connect():
                logger.error(
                    "[REFRESH] Failed to connect to vCenter %s",
                    creds["host"],
                )
                return None, None

            try:
                power_state = client.get_vm_power_state(vm_uuid)
                ip_address = client.get_vm_ip(vm_uuid)
                return power_state, ip_address
            finally:
                client.disconnect()
                logger.debug(
                    "[REFRESH] Disconnected from vCenter %s",
                    creds["host"],
                )

        try:
            new_power_state, new_ip = _call_with_timeout(_fetch_vm_state, 30)
        except TimeoutError:
            logger.error(
                "[REFRESH] vCenter sync timed out for instance %s on %s",
                instance_id,
                vcenter_host,
            )
            return instance
        except Exception as e:
            logger.error(
                "[REFRESH] vCenter sync failed for instance %s: %s",
                instance_id,
                e,
                exc_info=True,
            )
            return instance

        if new_power_state is None and new_ip is None:
            # connect() failed
            return instance

        logger.debug(
            "[REFRESH] VM %s state: power=%s ip=%s",
            vm_uuid,
            new_power_state,
            new_ip,
        )

        # -----------------------------------------------------------------
        # IP available — create/update Guacamole connections from lab slots
        # -----------------------------------------------------------------
        if new_ip:
            if not instance.ip_address:
                logger.info(
                    "[REFRESH] IP address newly detected for instance %s: %s. "
                    "Proceeding to sync Guacamole connections.",
                    instance_id,
                    new_ip,
                )
            else:
                logger.debug(
                    "[REFRESH] IP address still available: %s (previous: %s)",
                    new_ip,
                    instance.ip_address,
                )

            lab = (
                db.query(LabDefinition)
                .filter(LabDefinition.id == instance.lab_definition_id)
                .first()
            )
            if lab:
                slots = getattr(lab, "connection_slots", None) or []
                if isinstance(slots, str):
                    try:
                        slots = json.loads(slots)
                    except json.JSONDecodeError:
                        slots = []
                
                logger.debug(
                    "[REFRESH] Lab %s has %d connection slot(s) to evaluate",
                    lab.id,
                    len(slots),
                )
                
                if slots:
                    try:
                        self._sync_guacamole_connections(
                            db=db,
                            instance=instance,
                            lab=lab,
                            ip_address=new_ip,
                        )
                    except Exception as e:
                        logger.error(
                            "[REFRESH] Guacamole sync failed for instance %s: %s",
                            instance_id,
                            e,
                            exc_info=True,
                        )
                else:
                    logger.debug(
                        "[REFRESH] Lab %s has no connection slots, skipping Guacamole sync",
                        lab.id,
                    )
            else:
                logger.warning(
                    "[REFRESH] Lab definition %s not found for instance %s",
                    instance.lab_definition_id,
                    instance_id,
                )

            # If we created at least one connection, mark as running
            conns = self._load_connections_map(instance)
            if conns and instance.status == "provisioning":
                logger.info(
                    "[REFRESH] Instance %s has %d Guacamole connection(s). "
                    "Transitioning status from 'provisioning' to 'running'.",
                    instance_id,
                    len(conns),
                )
                instance.status = "running"
            elif not conns and instance.status == "provisioning":
                logger.debug(
                    "[REFRESH] Instance %s still provisioning — "
                    "IP detected but no Guacamole connections created yet "
                    "(may need valid connection_slots + Vault credentials).",
                    instance_id,
                )
        else:
            if instance.ip_address:
                logger.info(
                    "[REFRESH] IP address lost for instance %s. "
                    "Previous IP: %s. Guacamole connections remain but may be stale.",
                    instance_id,
                    instance.ip_address,
                )
            else:
                logger.debug(
                    "[REFRESH] No IP address available yet for instance %s",
                    instance_id,
                )

        instance.power_state = new_power_state
        instance.ip_address = new_ip
        db.commit()
        db.refresh(instance)

        logger.info(
            "[REFRESH] Instance %s refreshed: status=%s power=%s ip=%s connections=%s",
            instance_id,
            instance.status,
            instance.power_state,
            instance.ip_address,
            len(self._load_connections_map(instance)),
        )

        return instance

    # ------------------------------------------------------------------
    # Guacamole / Connection Slot Helpers
    # ------------------------------------------------------------------

    def _resolve_keycloak_username(
        self, db: Session, trainee_id: uuid.UUID
    ) -> Optional[str]:
        """
        Resolve the trainee's Keycloak `preferred_username` (mirrored as
        `User.username` on local sync). Used to grant Guacamole permissions
        so the header-auth-provisioned user can see the connections.
        """
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

    def _default_port(self, protocol: str) -> int:
        port = {"ssh": 22, "rdp": 3389, "vnc": 5901}.get(protocol.lower(), 22)
        logger.debug("[GUAC] Default port for %s = %d", protocol, port)
        return port

    def _load_connections_map(self, instance: LabInstance) -> Dict[str, str]:
        """Safely load guacamole_connections JSON dict."""
        raw = getattr(instance, "guacamole_connections", None)
        if isinstance(raw, dict):
            # CRITICAL: Return a copy so callers don't mutate SQLAlchemy's tracked object
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

    def _save_connections_map(
        self, instance: LabInstance, mapping: Dict[str, str]
    ) -> None:
        # CRITICAL: Assign a new dict so SQLAlchemy detects the change
        instance.guacamole_connections = dict(mapping)
        logger.debug(
            "[GUAC] Saved connections map for instance %s: %s",
            instance.id,
            mapping,
        )
        # Keep legacy fields pointed at the first connection for compatibility
        if mapping:
            first_key = next(iter(mapping))
            instance.guacamole_connection_id = mapping[first_key]
            instance.connection_url = guacamole_service.get_connection_url(
                mapping[first_key]
            )
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

    def _read_lab_connection_creds(
        self, slug: str, protocol: str
    ) -> Optional[Dict[str, Any]]:
        """Fetch lab connection credentials from Vault."""
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
                "port": int(creds.get("port", self._default_port(protocol))),
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
        self,
        db: Session,
        instance: LabInstance,
        lab: LabDefinition,
        ip_address: str,
    ) -> None:
        """
        For each connection_slot in the lab definition:
          - If ssh=True  → create/update SSH Guacamole connection
          - If rdp=True  → create/update RDP Guacamole connection
          - If vnc=True  → create/update VNC Guacamole connection
        
        Credentials are pulled from Vault at:
          credentials/lab_connections/{slug}/{protocol}
        """
        # Defense-in-depth: never sync for an instance that is being torn down.
        # The router-level refresh path already guards on this, but a stale
        # in-memory `instance` could still slip through here.
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

        # Normalize slots (handle JSON string or list of dicts)
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

        connections_map = self._load_connections_map(instance)
        initial_count = len(connections_map)
        logger.info(
            "[GUAC-SYNC] Starting sync for instance %s (lab=%s, ip=%s). "
            "Existing connections: %d",
            instance.id,
            lab.id,
            ip_address,
            initial_count,
        )

        # Resolve the trainee's Guacamole username (mirrors Keycloak
        # preferred_username via local users.username). Pre-provision the
        # Guacamole user so permission grants below cannot race with the
        # header-auth extension's first-login provisioning.
        keycloak_username = self._resolve_keycloak_username(db, instance.trainee_id)
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

                creds = self._read_lab_connection_creds(slug, protocol)
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

                    # Grant READ so the header-auth-provisioned trainee can
                    # see the connection. Non-fatal on failure.
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

        self._save_connections_map(instance, connections_map)
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
        self, instance: LabInstance, db: Optional[Session] = None
    ) -> None:
        """Remove every Guacamole connection tracked for this instance."""
        connections_map = self._load_connections_map(instance)
        logger.info(
            "[GUAC-DEL] Deleting %d Guacamole connection(s) for instance %s",
            len(connections_map),
            instance.id,
        )

        # Best-effort revoke of per-user permissions before deletion. Deleting
        # the connection implicitly removes permissions in Guacamole's schema,
        # so this is hygiene for shared users.
        keycloak_username: Optional[str] = None
        if db is not None:
            keycloak_username = self._resolve_keycloak_username(db, instance.trainee_id)

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
        
        self._save_connections_map(instance, {})
        logger.info(
            "[GUAC-DEL] Cleanup complete for instance %s: %d deleted, %d failed",
            instance.id,
            deleted,
            failed,
        )

    # ------------------------------------------------------------------
    # vCenter Discovery Helpers (unchanged)
    # ------------------------------------------------------------------

    def _find_vcenter_for_template(
        self, source_vm_id: str
    ) -> Optional[Dict[str, str]]:
        """Scan all admin vCenters to find the one hosting this template UUID."""
        logger.debug(
            "[VCENTER] Searching for template %s across all vCenters",
            source_vm_id,
        )
        admin_ids = self._list_all_admin_ids()
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

    def _find_vcenter_credentials(
        self, vcenter_host: str
    ) -> Optional[Dict[str, str]]:
        """Fetch credentials for a known vCenter host."""
        logger.debug(
            "[VCENTER] Looking up credentials for vCenter host %s",
            vcenter_host,
        )
        admin_ids = self._list_all_admin_ids()
        target = vcenter_host.strip().lower()

        for admin_id in admin_ids:
            try:
                hosts = list_admin_vcenters(admin_id)
                for host in hosts:
                    path = f"credentials/admin/{admin_id}/{host}"
                    try:
                        creds = read_credentials(path)
                        if (
                            creds.get("host", "").strip().lower()
                            == target
                        ):
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

    def _list_all_admin_ids(self) -> List[str]:
        """List all admin user IDs from Vault credentials path."""
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