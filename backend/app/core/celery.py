# backend/app/core/celery.py
from celery import Celery
from app.config.settings import settings
from app.config.connection.postgres_client import _import_all_models
_import_all_models()

celery_app = Celery(
    "lab_platform",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.lab_instance_tasks",
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