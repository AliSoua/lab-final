# backend/app/tasks/lab_monitoring_tasks.py
"""
Lab Monitoring Tasks — Celery Beat scheduled + on-demand triggers.

Lightweight, idempotent, safe to retry. All tasks open their own DB sessions.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any

from app.core.celery import celery_app
from app.core.logging import log_monitor_task
from app.utils.db_session import background_session
from app.models.LabDefinition.LabInstance import LabInstance
from app.services.LabInstance.ManageInstance import terminate_instance

logger = logging.getLogger(__name__)

# ── Thresholds ────────────────────────────────────────────────────────────

STALE_PROVISIONING_MINUTES = 30
STALE_NO_IP_MINUTES = 15
EXPIRY_GRACE_SECONDS = 60


# ═══════════════════════════════════════════════════════════════════════════
#  1. INSTANCE HEALTH CHECK (every 5 min)
# ═══════════════════════════════════════════════════════════════════════════

@celery_app.task(
    name="lab.monitoring.instance_health_check",
    bind=True,
    max_retries=2,
)
def instance_health_check(self) -> Dict[str, Any]:
    """
    Scan for instances stuck in bad states and auto-fail them.
    """
    task_logger = log_monitor_task(logger, task_id=self.request.id, monitor_name="instance_health_check")
    now = datetime.utcnow()

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
            try:
                reason = (
                    "stuck provisioning > 30 min"
                    if instance.status == "provisioning"
                    else "running with no IP > 15 min"
                )
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
                failed_count += 1
            except Exception as e:
                task_logger.error("Failed to mark instance %s failed: %s", instance.id, e)

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
#  2. SESSION TIMEOUT ENFORCER (every 1 min)
# ═══════════════════════════════════════════════════════════════════════════

@celery_app.task(
    name="lab.monitoring.session_timeout_enforcer",
    bind=True,
    max_retries=3,
    retry_backoff=True,
)
def session_timeout_enforcer(self) -> Dict[str, Any]:
    """
    Scan for expired active instances and terminate them.
    Called every 60 seconds by Celery Beat.
    """
    task_logger = log_monitor_task(logger, task_id=self.request.id, monitor_name="session_timeout_enforcer")
    now = datetime.utcnow()

    with background_session() as db:
        expired = (
            db.query(LabInstance)
            .filter(
                LabInstance.status.in_(["running", "provisioning", "stopped"]),
                LabInstance.expires_at < now - timedelta(seconds=EXPIRY_GRACE_SECONDS),
            )
            .all()
        )

        terminated_count = 0
        for instance in expired:
            try:
                task_logger.info(
                    "Auto-terminating expired instance | id=%s expired_at=%s trainee=%s",
                    instance.id,
                    instance.expires_at,
                    instance.trainee_id,
                )
                terminate_instance(db, instance.id, instance.trainee_id)
                terminated_count += 1
            except Exception as e:
                task_logger.error(
                    "Failed to auto-terminate instance %s: %s",
                    instance.id,
                    e,
                    exc_info=True,
                )

        task_logger.info(
            "Timeout enforcer complete | terminated=%d checked=%d",
            terminated_count,
            len(expired),
        )
        return {
            "terminated": terminated_count,
            "checked": len(expired),
            "timestamp": now.isoformat(),
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