# backend/app/tasks/lab_monitoring_tasks.py
"""
Lab Monitoring Tasks — Celery Beat scheduled + on-demand triggers.

Improvements:
  - Session timeout enforcer uses Redis ZSET instead of DB polling.
  - Audit records (LabInstanceTask + EventLog) use the standardized
    task_audit API (start_task, mark_running, record_event, finish_task)
    for full parity with launch/termination chains.
  - If the expiry queue is empty, the task exits in <1ms with zero DB writes.
"""

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any

from app.core.celery import celery_app
from app.core.logging import log_monitor_task
from app.utils.db_session import background_session
from app.utils.expiry_queue import (
    pop_expired_instances as pop_expired_instances_lua,
    remove_instance_expiry,
    register_instance_expiry,
)
from app.models.LabDefinition.LabInstance import LabInstance
from app.models.LabInstance.enums import EventSeverity, EventSource
from app.services.LabDefinition.task_audit import (
    start_task, mark_running, record_event, finish_task,
)
from app.services.LabInstance.ManageInstance import terminate_instance

logger = logging.getLogger(__name__)

# ── Thresholds ────────────────────────────────────────────────────────────

STALE_PROVISIONING_MINUTES = 30
STALE_NO_IP_MINUTES = 15
EXPIRY_GRACE_SECONDS = 60
EXPIRY_BATCH_SIZE = 100


# ═══════════════════════════════════════════════════════════════════════════
#  1. INSTANCE HEALTH CHECK (every 5 min)
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
    now = datetime.now(timezone.utc)
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
            instance_start_ts = datetime.now(timezone.utc)
            reason = (
                "stuck provisioning > 30 min"
                if instance.status == "provisioning"
                else "running with no IP > 15 min"
            )

            # ── Standardized audit lifecycle ──
            audit_task_id = start_task(
                instance.id,
                task_type="monitoring.health_check",
                stage="health_check",
                metadata={
                    "reason": reason,
                    "previous_status": instance.status,
                    "celery_task_id": celery_task_id,
                },
                db=db,
            )

            mark_running(
                audit_task_id,
                worker_pid=worker_pid,
                worker_host=worker_host,
                db=db,
            )

            record_event(
                audit_task_id,
                instance.id,
                "unhealthy_instance_detected",
                f"Instance flagged as unhealthy: {reason}",
                event_code="UNHEALTHY_INSTANCE_DETECTED",
                source=EventSource.SYSTEM.value,
                severity=EventSeverity.WARNING.value,
                metadata={
                    "previous_status": instance.status,
                    "reason": reason,
                    "celery_task_id": celery_task_id,
                },
                db=db,
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
                state = dict(instance.session_state or {})
                state["status"] = "failed"
                state["failure_reason"] = reason
                instance.session_state = state
                db.commit()

                duration = (datetime.now(timezone.utc) - instance_start_ts).total_seconds()
                record_event(
                    audit_task_id,
                    instance.id,
                    "instance_auto_failed",
                    f"Instance automatically marked as failed: {reason}",
                    event_code="INSTANCE_AUTO_FAILED",
                    source=EventSource.SYSTEM.value,
                    severity=EventSeverity.INFO.value,
                    metadata={
                        "new_status": "failed",
                        "failure_reason": reason,
                        "duration_seconds": duration,
                    },
                    db=db,
                )
                finish_task(audit_task_id, "completed", db=db)
                db.commit()
                failed_count += 1

            except Exception as e:
                db.rollback()
                task_logger.error("Failed to mark instance %s as failed: %s", instance.id, e)

                duration = (datetime.now(timezone.utc) - instance_start_ts).total_seconds()
                record_event(
                    audit_task_id,
                    instance.id,
                    "auto_fail_failed",
                    f"Failed to auto-fail instance: {str(e)}",
                    event_code="AUTO_FAIL_FAILED",
                    source=EventSource.SYSTEM.value,
                    severity=EventSeverity.ERROR.value,
                    metadata={
                        "error": str(e),
                        "reason": reason,
                        "duration_seconds": duration,
                    },
                    db=db,
                )
                finish_task(audit_task_id, "failed", error_message=str(e)[:500], db=db)
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
    ignore_result=False,
)
def session_timeout_enforcer(self) -> Dict[str, Any]:
    """Reads expired instance IDs from Redis ZSET instead of scanning Postgres.
    Only touches the database when there is actual work to do."""
    task_logger = log_monitor_task(
        logger,
        task_id=self.request.id,
        monitor_name="session_timeout_enforcer",
    )
    now = datetime.now(timezone.utc)
    worker_pid = os.getpid()
    worker_host = self.request.hostname or "unknown"
    celery_task_id = str(self.request.id)

    # ── 1. Fast Redis pop (O(log N)) — zero DB work if empty ────────────
    expired_ids = pop_expired_instances_lua(batch_size=EXPIRY_BATCH_SIZE)

    if not expired_ids:
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
            instance_start_ts = datetime.now(timezone.utc)
            instance_id = uuid.UUID(instance_id_str)

            instance = (
                db.query(LabInstance)
                .filter(
                    LabInstance.id == instance_id,
                    LabInstance.status.in_(["running", "provisioning", "stopped"]),
                )
                .first()
            )

            if not instance:
                remove_instance_expiry(instance_id_str)
                continue

            expires_at = instance.expires_at
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            # If instance hasn't actually expired yet (clock skew), re-register and skip
            if expires_at and expires_at > now:
                register_instance_expiry(instance.id, instance.expires_at)
                task_logger.warning(
                    "Instance %s popped early from Redis (clock skew), re-queued",
                    instance.id,
                )
                continue

            # ── Standardized audit lifecycle ──
            audit_task_id = start_task(
                instance.id,
                task_type="monitoring.session_timeout",
                stage="session_timeout",
                metadata={
                    "expires_at": expires_at.isoformat() if expires_at else None,
                    "grace_seconds": EXPIRY_GRACE_SECONDS,
                    "previous_status": instance.status,
                    "celery_task_id": celery_task_id,
                },
                db=db,
            )

            mark_running(
                audit_task_id,
                worker_pid=worker_pid,
                worker_host=worker_host,
                db=db,
            )

            record_event(
                audit_task_id,
                instance.id,
                "expired_instance_detected",
                (
                    f"Instance expired at {expires_at.isoformat() if expires_at else 'unknown'}"
                ),
                event_code="EXPIRED_INSTANCE_DETECTED",
                source=EventSource.SYSTEM.value,
                severity=EventSeverity.WARNING.value,
                metadata={
                    "expires_at": expires_at.isoformat() if expires_at else None,
                    "grace_seconds": EXPIRY_GRACE_SECONDS,
                    "previous_status": instance.status,
                    "celery_task_id": celery_task_id,
                },
                db=db,
            )
            db.commit()

            # ── Attempt termination ──
            try:
                task_logger.info(
                    "Auto-terminating expired instance | id=%s expired_at=%s trainee=%s",
                    instance.id,
                    expires_at,
                    instance.trainee_id,
                )

                terminate_instance(db, instance.id, instance.trainee_id)

                duration = (datetime.now(timezone.utc) - instance_start_ts).total_seconds()
                record_event(
                    audit_task_id,
                    instance.id,
                    "instance_auto_terminated",
                    "Instance automatically terminated due to session expiry",
                    event_code="INSTANCE_AUTO_TERMINATED",
                    source=EventSource.SYSTEM.value,
                    severity=EventSeverity.INFO.value,
                    metadata={
                        "terminated_at": datetime.now(timezone.utc).isoformat(),
                        "expires_at": expires_at.isoformat() if expires_at else None,
                        "duration_seconds": duration,
                    },
                    db=db,
                )
                finish_task(audit_task_id, "completed", db=db)
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

                duration = (datetime.now(timezone.utc) - instance_start_ts).total_seconds()
                record_event(
                    audit_task_id,
                    instance.id,
                    "auto_terminate_failed",
                    f"Failed to auto-terminate expired instance: {str(e)}",
                    event_code="AUTO_TERMINATE_FAILED",
                    source=EventSource.SYSTEM.value,
                    severity=EventSeverity.ERROR.value,
                    metadata={
                        "error": str(e),
                        "expires_at": expires_at.isoformat() if expires_at else None,
                        "duration_seconds": duration,
                    },
                    db=db,
                )
                finish_task(audit_task_id, "failed", error_message=str(e)[:500], db=db)
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
    task_logger = log_monitor_task(logger, task_id=self.request.id, monitor_name="lab_definition_health_check")
    task_logger.info("Lab definition health check skipped — not yet implemented")
    return {"status": "skipped", "reason": "not implemented"}