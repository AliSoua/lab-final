# backend/app/core/celery.py
"""
Celery Application Configuration for Lab Platform
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
        "app.tasks.lab_monitoring_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    # Global limits — individual chain tasks override these via decorators
    task_time_limit=600,        # 10 min hard (was 25m; chain tasks are smaller)
    task_soft_time_limit=480,   # 8 min soft (was 20m)
    task_default_queue="default",
    # ═══════════════════════════════════════════════════════════════════
    #  TASK ROUTES — explicit mapping for the new task-chain architecture
    # ═══════════════════════════════════════════════════════════════════
    task_routes={
        # Launch chain (lab.provisioning)
        "lab.provisioning.validate_instance":    {"queue": "lab.provisioning"},
        "lab.provisioning.discover_vcenter":     {"queue": "lab.provisioning"},
        "lab.provisioning.clone_vm":             {"queue": "lab.provisioning"},
        "lab.provisioning.power_on_vm":          {"queue": "lab.provisioning"},
        "lab.provisioning.discover_ip":          {"queue": "lab.provisioning"},
        "lab.provisioning.guacamole_connection": {"queue": "lab.provisioning"},
        "lab.provisioning.finalize_instance":    {"queue": "lab.provisioning"},
        # Terminate chain (lab.cleanup)
        "lab.cleanup.validate_terminate":        {"queue": "lab.cleanup"},
        "lab.cleanup.destroy_vm":                {"queue": "lab.cleanup"},
        "lab.cleanup.cleanup":                   {"queue": "lab.cleanup"},
        # Monitoring
        "lab.monitoring.*":                      {"queue": "lab.monitoring"},
    },
    result_expires=3600,

    # ═══════════════════════════════════════════════════════════════════
    #  BEAT SCHEDULE — Monitoring Tasks
    # ═══════════════════════════════════════════════════════════════════
    beat_schedule={
        "health-check-every-5-min": {
            "task": "lab.monitoring.instance_health_check",
            "schedule": 300.0,
        },
        "session-timeout-every-1-min": {
            "task": "lab.monitoring.session_timeout_enforcer",
            "schedule": 60.0,
        },
        "guacamole-audit-every-10-min": {
            "task": "lab.monitoring.guacamole_connection_audit",
            "schedule": 600.0,
        },
        "quota-reporter-every-15-min": {
            "task": "lab.monitoring.resource_quota_reporter",
            "schedule": 900.0,
        },
        "lab-def-health-every-30-min": {
            "task": "lab.monitoring.lab_definition_health_check",
            "schedule": 1800.0,
        },
    },
)