# backend/app/core/celery.py
"""
Celery Application Configuration for Lab Platform

Queue Strategy:
- default:      General background tasks
- lab.provisioning: VM clone, power-on, IP discovery (long-running, idempotent)
- lab.cleanup:      VM destroy, connection cleanup (must complete even on crash)
- lab.monitoring:   Health checks, metrics, alerts, session timeouts, resource quotas

MONITORING QUEUE (Future Implementation)
======================================
The monitoring queue handles observability and enforcement tasks that run
periodically or reactively across the platform. These are lightweight,
idempotent, and safe to retry.

Planned tasks:
1. instance_health_check
   - Polls vCenter for stale 'provisioning' instances (>30 min)
   - Detects 'running' instances with no IP for >15 min
   - Auto-fails instances stuck in bad states

2. session_timeout_enforcer
   - Scans active sessions where expires_at < now()
   - Calls stop_instance() then enqueue_terminate()
   - Prevents resource leakage from abandoned labs

3. guacamole_connection_audit
   - Validates all guacamole_connections JSONB entries against Guacamole API
   - Removes orphaned connection IDs
   - Recreates missing connections for running VMs

4. resource_quota_reporter
   - Aggregates per-trainee VM hours, storage, network usage
   - Updates billing/usage tables
   - Triggers alerts when quotas approach limits

5. lab_definition_health_check
   - Verifies assigned guide_version_id still exists
   - Checks source_vm_id templates are reachable in vCenter
   - Alerts moderators on configuration drift

Introduction Path:
------------------
1. Create app/tasks/lab_monitoring_tasks.py with task definitions
2. Add monitoring task signatures to celery beat schedule (celerybeat)
3. Register handlers in app/routers/LabInstance/monitoring.py for on-demand triggers
4. Add Prometheus/Grafana metrics export in task post-run hooks

Example beat schedule (to add later):
    beat_schedule = {
        'health-check-every-5-min': {
            'task': 'lab.monitoring.instance_health_check',
            'schedule': 300.0,
        },
        'session-timeout-every-1-min': {
            'task': 'lab.monitoring.session_timeout_enforcer',
            'schedule': 60.0,
        },
    }
"""

from celery import Celery
from app.config.settings import settings
from app.config.connection.postgres_client import _import_all_models

# Ensure all SQLAlchemy models are registered before Celery workers fork
_import_all_models()

celery_app = Celery(
    "lab_platform",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.lab_instance_tasks",
        # "app.tasks.lab_monitoring_tasks",  # UNCOMMENT when monitoring tasks implemented
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,                # only ack after success
    task_reject_on_worker_lost=True,    # requeue on crash / SIGKILL
    worker_prefetch_multiplier=1,       # one slow task per slot
    task_time_limit=1500,               # hard kill timer (25 min)
    task_soft_time_limit=1200,          # SoftTimeLimitExceeded at 20 min
    task_default_queue="default",
    task_routes={
        "lab.provisioning.*": {"queue": "lab.provisioning"},
        "lab.cleanup.*":      {"queue": "lab.cleanup"},
        "lab.monitoring.*":   {"queue": "lab.monitoring"},
    },
    result_expires=3600,                # keep result backend small
)