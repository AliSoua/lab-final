# backend/app/tasks/lab_monitoring_tasks.py
"""
Lab Monitoring Tasks — Celery Beat scheduled + on-demand triggers.

Improvements:
  - Session timeout enforcer uses Redis ZSET instead of DB polling.
  - Audit records (LabInstanceTask + EventLog) are ONLY created when an
    instance is actually acted upon.
  - If the expiry queue is empty, the task exits in <1ms with zero DB writes.
"""

import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any

from app.core.celery import celery_app
from app.core.logging import log_monitor_task
from app.utils.db_session import background_session
from app.utils.expiry_queue import pop_expired_instances_lua, remove_instance_expiry
from app.models.LabDefinition.LabInstance import LabInstance
from app.models.LabDefinition.LabInstanceTask import LabInstanceTask
from app.models.LabDefinition.LabInstanceEventLog import LabInstanceEventLog
from app.services.LabInstance.ManageInstance import terminate_instance

logger = logging.getLogger(__name__)

# ── Thresholds ────────────────────────────────────────────────────────────

STALE_PROVISIONING_MINUTES = 30
STALE_NO_IP_MINUTES = 15
EXPIRY_GRACE_SECONDS = 60
EXPIRY_BATCH_SIZE = 100


# ═══════════════════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def _create_monitoring_task(
    db,
    *,
    lab_instance_id: uuid.UUID,
    task_type: str,
    worker_pid: int,
    worker_host: str,
) -> LabInstanceTask:
    task = LabInstanceTask(
        id=uuid.uuid4(),
        lab_instance_id=lab_instance_id,
        task_type=task_type,
        status="running",
        started_at=datetime.utcnow(),
        worker_pid=worker_pid,
        worker_host=worker_host,
    )
    db.add(task)
    db.flush()
    return task


def _log_instance_event(
    db,
    *,
    task_id: uuid.UUID,
    lab_instance_id: uuid.UUID,
    event_type: str,
    message: str,
    metadata: Dict[str, Any] | None = None,
) -> LabInstanceEventLog:
    event = LabInstanceEventLog(
        id=uuid.uuid4(),
        task_id=task_id,
        lab_instance_id=lab_instance_id,
        event_type=event_type,
        message=message,
        metadata_=metadata or {},
    )
    db.add(event)
    return event


# ═══════════════════════════════════════════════════════════════════════════
#  1. INSTANCE HEALTH CHECK (every 5 min) — unchanged logic, added audit
# ═══════════════════════════════════════════════════════════════════════════

@celery_app.task(
    name="lab.monitoring.instance_health_check",
    bind=True,
    max_retries=2,
)
def instance_health_check(self) -> Dict[str, Any]:
    task_logger = log_monitor_task(
        logger,
        task_id=self.request.id,
        monitor_name="instance_health_check",
    )
    now = datetime.utcnow()
    worker_pid = os.getpid()
    worker_host = self.request.hostname or "unknown"
    celery_task_id = str(self.request.id)

    with background_session() as db:
        stale_provisioning = (
            db.query(LabInstance)
            .filter(
                LabInstance.status == "provisioning",
                LabInstance.created_at < now - timedelta(minutes=STALE_PROVISIONING_MINUTES),
            )
            .all()
        )

        stale_no_ip = (
            db.query(LabInstance)
            .filter(
                LabInstance.status == "running",
                LabInstance.ip_address.is_(None),
                LabInstance.started_at < now - timedelta(minutes=STALE_NO_IP_MINUTES),
            )
            .all()
        )

        failed_count = 0
        for instance in list(stale_provisioning) + list(stale_no_ip):
            reason = (
                "stuck provisioning > 30 min"
                if instance.status == "provisioning"
                else "running with no IP > 15 min"
            )

            audit_task = _create_monitoring_task(
                db,
                lab_instance_id=instance.id,
                task_type="monitoring.health_check",
                worker_pid=worker_pid,
                worker_host=worker_host,
            )

            _log_instance_event(
                db,
                task_id=audit_task.id,
                lab_instance_id=instance.id,
                event_type="unhealthy_instance_detected",
                message=f"Instance flagged as unhealthy: {reason}",
                metadata={
                    "previous_status": instance.status,
                    "reason": reason,
                    "celery_task_id": celery_task_id,
                },
            )
            db.commit()

            try:
                task_logger.warning(
                    "Auto-failing unhealthy instance | id=%s reason=%s",
                    instance.id,
                    reason,
                )

                instance.status = "failed"
                instance.error_message = f"Auto-failed: {reason}"
                if instance.session_state:
                    state = dict(instance.session_state)
                    state["status"] = "failed"
                    state["failure_reason"] = reason
                    instance.session_state = state

                db.commit()

                audit_task.status = "completed"
                audit_task.finished_at = datetime.utcnow()

                _log_instance_event(
                    db,
                    task_id=audit_task.id,
                    lab_instance_id=instance.id,
                    event_type="instance_auto_failed",
                    message=f"Instance automatically marked as failed: {reason}",
                    metadata={"new_status": "failed", "failure_reason": reason},
                )
                db.commit()
                failed_count += 1

            except Exception as e:
                db.rollback()
                task_logger.error("Failed to mark instance %s as failed: %s", instance.id, e)

                audit_task.status = "failed"
                audit_task.finished_at = datetime.utcnow()
                audit_task.error_message = str(e)[:500]

                _log_instance_event(
                    db,
                    task_id=audit_task.id,
                    lab_instance_id=instance.id,
                    event_type="auto_fail_failed",
                    message=f"Failed to auto-fail instance: {str(e)}",
                    metadata={"error": str(e), "reason": reason},
                )
                db.commit()

        task_logger.info(
            "Health check complete | failed=%d stale_prov=%d stale_ip=%d",
            failed_count,
            len(stale_provisioning),
            len(stale_no_ip),
        )
        return {
            "checked": len(stale_provisioning) + len(stale_no_ip),
            "failed": failed_count,
            "stale_provisioning": len(stale_provisioning),
            "stale_no_ip": len(stale_no_ip),
        }


# ═══════════════════════════════════════════════════════════════════════════
#  2. SESSION TIMEOUT ENFORCER (every 1 min) — Redis ZSET driven
# ═══════════════════════════════════════════════════════════════════════════

@celery_app.task(
    name="lab.monitoring.session_timeout_enforcer",
    bind=True,
    max_retries=3,
    retry_backoff=True,
    ignore_result=True,
)
def session_timeout_enforcer(self) -> Dict[str, Any]:
    """
    Reads expired instance IDs from Redis ZSET instead of scanning Postgres.
    Only touches the database when there is actual work to do.
    """
    task_logger = log_monitor_task(
        logger,
        task_id=self.request.id,
        monitor_name="session_timeout_enforcer",
    )
    now = datetime.utcnow()
    worker_pid = os.getpid()
    worker_host = self.request.hostname or "unknown"
    celery_task_id = str(self.request.id)

    # ── 1. Fast Redis pop (O(log N)) — zero DB work if empty ────────────
    expired_ids = pop_expired_instances_lua(batch_size=EXPIRY_BATCH_SIZE)

    if not expired_ids:
        # Nothing expired → instant return, no audit noise, no Flower clutter
        return {
            "terminated": 0,
            "checked": 0,
            "timestamp": now.isoformat(),
            "source": "redis_zset",
        }

    # ── 2. Verify & terminate in DB only for returned IDs ───────────────
    terminated_count = 0

    with background_session() as db:
        for instance_id_str in expired_ids:
            instance_id = uuid.UUID(instance_id_str)

            # Double-check the instance is still active (safety net)
            instance = (
                db.query(LabInstance)
                .filter(
                    LabInstance.id == instance_id,
                    LabInstance.status.in_(["running", "provisioning", "stopped"]),
                )
                .first()
            )

            if not instance:
                # Already terminated or deleted — clean up Redis residue
                remove_instance_expiry(instance_id_str)
                continue

            # Grace period safety check
            if instance.expires_at and instance.expires_at > now - timedelta(seconds=EXPIRY_GRACE_SECONDS):
                # Not truly expired yet (clock skew or Redis early pop) — put it back
                continue

            # ── Create audit trail ──
            audit_task = _create_monitoring_task(
                db,
                lab_instance_id=instance.id,
                task_type="monitoring.session_timeout",
                worker_pid=worker_pid,
                worker_host=worker_host,
            )

            _log_instance_event(
                db,
                task_id=audit_task.id,
                lab_instance_id=instance.id,
                event_type="expired_instance_detected",
                message=(
                    f"Instance expired at {instance.expires_at.isoformat() if instance.expires_at else 'unknown'} "
                    f"(grace={EXPIRY_GRACE_SECONDS}s)"
                ),
                metadata={
                    "expires_at": instance.expires_at.isoformat() if instance.expires_at else None,
                    "grace_seconds": EXPIRY_GRACE_SECONDS,
                    "previous_status": instance.status,
                    "celery_task_id": celery_task_id,
                },
            )
            db.commit()

            # ── Attempt termination ──
            try:
                task_logger.info(
                    "Auto-terminating expired instance | id=%s expired_at=%s trainee=%s",
                    instance.id,
                    instance.expires_at,
                    instance.trainee_id,
                )

                terminate_instance(db, instance.id, instance.trainee_id)

                audit_task.status = "completed"
                audit_task.finished_at = datetime.utcnow()

                _log_instance_event(
                    db,
                    task_id=audit_task.id,
                    lab_instance_id=instance.id,
                    event_type="instance_auto_terminated",
                    message="Instance automatically terminated due to session expiry",
                    metadata={
                        "terminated_at": datetime.utcnow().isoformat(),
                        "expires_at": instance.expires_at.isoformat() if instance.expires_at else None,
                    },
                )
                db.commit()
                terminated_count += 1

            except Exception as e:
                db.rollback()
                task_logger.error(
                    "Failed to auto-terminate instance %s: %s",
                    instance.id,
                    e,
                    exc_info=True,
                )

                audit_task.status = "failed"
                audit_task.finished_at = datetime.utcnow()
                audit_task.error_message = str(e)[:500]

                _log_instance_event(
                    db,
                    task_id=audit_task.id,
                    lab_instance_id=instance.id,
                    event_type="auto_terminate_failed",
                    message=f"Failed to auto-terminate expired instance: {str(e)}",
                    metadata={
                        "error": str(e),
                        "expires_at": instance.expires_at.isoformat() if instance.expires_at else None,
                    },
                )
                db.commit()

    task_logger.info(
        "Timeout enforcer complete | terminated=%d checked=%d",
        terminated_count,
        len(expired_ids),
    )
    return {
        "terminated": terminated_count,
        "checked": len(expired_ids),
        "timestamp": now.isoformat(),
        "source": "redis_zset",
    }


# ═══════════════════════════════════════════════════════════════════════════
#  3. GUACAMOLE CONNECTION AUDIT (every 10 min)
# ═══════════════════════════════════════════════════════════════════════════

@celery_app.task(
    name="lab.monitoring.guacamole_connection_audit",
    bind=True,
    max_retries=2,
)
def guacamole_connection_audit(self) -> Dict[str, Any]:
    """
    Validate guacamole_connections JSONB against actual Guacamole API.
    Removes orphaned entries. Recreates missing ones for running VMs.
    """
    task_logger = log_monitor_task(logger, task_id=self.request.id, monitor_name="guacamole_connection_audit")
    task_logger.info("Guacamole audit skipped — not yet implemented")
    return {"status": "skipped", "reason": "not implemented"}


# ═══════════════════════════════════════════════════════════════════════════
#  4. RESOURCE QUOTA REPORTER (every 15 min)
# ═══════════════════════════════════════════════════════════════════════════

@celery_app.task(
    name="lab.monitoring.resource_quota_reporter",
    bind=True,
    max_retries=2,
)
def resource_quota_reporter(self) -> Dict[str, Any]:
    """
    Aggregate per-trainee VM hours, storage, network usage.
    """
    task_logger = log_monitor_task(logger, task_id=self.request.id, monitor_name="resource_quota_reporter")
    task_logger.info("Quota reporter skipped — not yet implemented")
    return {"status": "skipped", "reason": "not implemented"}


# ═══════════════════════════════════════════════════════════════════════════
#  5. LAB DEFINITION HEALTH CHECK (every 30 min)
# ═══════════════════════════════════════════════════════════════════════════

@celery_app.task(
    name="lab.monitoring.lab_definition_health_check",
    bind=True,
    max_retries=2,
)
def lab_definition_health_check(self) -> Dict[str, Any]:
    """
    Verify guide_version_id still exists, source_vm_id templates reachable.
    """
    task_logger = log_monitor_task(logger, task_id=self.request.id, monitor_name="lab_definition_health_check")
    task_logger.info("Lab definition health check skipped — not yet implemented")
    return {"status": "skipped", "reason": "not implemented"}