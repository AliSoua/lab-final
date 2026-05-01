# backend/app/tasks/lab_instance_tasks.py
"""
Celery task definitions for the new task-chain architecture.
Each task wraps one stage worker with retry logic.
"""

import logging
from typing import Dict, Any
from celery.exceptions import MaxRetriesExceededError, SoftTimeLimitExceeded

from app.core.celery import celery_app
from app.core.logging import log_task
from app.services.LabInstance.tasks.launch_chain import (
    run_validate_instance, run_discover_vcenter, run_clone_vm,
    run_power_on_vm, run_discover_ip, run_guacamole_connection, run_finalize_instance,
)
from app.services.LabInstance.tasks.terminate_chain import (
    run_validate_terminate, run_destroy_vm, run_cleanup,
)

logger = logging.getLogger(__name__)


# ── Launch Chain Tasks ───────────────────────────────────────────────────────

def _wrap_task(self, worker_fn, args, kwargs, task_name):
    task_logger = log_task(
        logging.getLogger(__name__),
        task_id=self.request.id,
        instance_id=args[0] if args else None,
    )
    task_logger.info(
        "Task %s started | attempt=%d/%d",
        task_name,
        self.request.retries + 1,
        self.max_retries + 1,
    )
    try:
        result = worker_fn(*args, **kwargs)
        task_logger.info("Task %s completed", task_name)
        return result
    except SoftTimeLimitExceeded:
        task_logger.error("Soft time limit exceeded")
        raise
    except Exception as exc:
        task_logger.exception("Task %s failed: %s", task_name, exc)
        raise


@celery_app.task(
    name="lab.provisioning.validate_instance",
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=60,
    max_retries=3,
)
def validate_instance_task(self, instance_id: str, trainee_id: str, task_id: str):
    return _wrap_task(self, run_validate_instance, [instance_id, trainee_id, task_id], {}, "validate")


@celery_app.task(
    name="lab.provisioning.discover_vcenter",
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=60,
    max_retries=3,
)
def discover_vcenter_task(self, instance_id: str, trainee_id: str, task_id: str):
    return _wrap_task(self, run_discover_vcenter, [instance_id, trainee_id, task_id], {}, "discover_vcenter")


@celery_app.task(
    name="lab.provisioning.clone_vm",
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=120,
    max_retries=3,
    soft_time_limit=300,  # 5 min for clone
)
def clone_vm_task(self, instance_id: str, trainee_id: str, task_id: str, vcenter_host: str = None):
    return _wrap_task(self, run_clone_vm, [instance_id, trainee_id, task_id], {"vcenter_host": vcenter_host}, "clone_vm")


@celery_app.task(
    name="lab.provisioning.power_on_vm",
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=60,
    max_retries=3,
)
def power_on_vm_task(self, instance_id: str, trainee_id: str, task_id: str):
    return _wrap_task(self, run_power_on_vm, [instance_id, trainee_id, task_id], {}, "power_on_vm")


@celery_app.task(
    name="lab.provisioning.discover_ip",
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=60,
    max_retries=3,
)
def discover_ip_task(self, instance_id: str, trainee_id: str, task_id: str):
    return _wrap_task(self, run_discover_ip, [instance_id, trainee_id, task_id], {}, "discover_ip")


@celery_app.task(
    name="lab.provisioning.guacamole_connection",
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=60,
    max_retries=3,
)
def guacamole_connection_task(self, instance_id: str, trainee_id: str, task_id: str):
    return _wrap_task(self, run_guacamole_connection, [instance_id, trainee_id, task_id], {}, "guacamole_connection")


@celery_app.task(
    name="lab.provisioning.finalize_instance",
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=60,
    max_retries=3,
)
def finalize_instance_task(self, instance_id: str, trainee_id: str, task_id: str):
    return _wrap_task(self, run_finalize_instance, [instance_id, trainee_id, task_id], {}, "finalize")


# ── Terminate Chain Tasks ────────────────────────────────────────────────────

@celery_app.task(
    name="lab.cleanup.validate_terminate",
    bind=True,
    max_retries=3,
    retry_backoff=True,
)
def validate_terminate_task(self, instance_id: str, trainee_id: str, task_id: str, termination_reason: str = "user_requested"):
    return _wrap_task(self, run_validate_terminate, [instance_id, trainee_id, task_id], {"termination_reason": termination_reason}, "validate_terminate")


@celery_app.task(
    name="lab.cleanup.destroy_vm",
    bind=True,
    max_retries=3,
    retry_backoff=True,
    soft_time_limit=300,
)
def destroy_vm_task(self, instance_id: str, trainee_id: str, task_id: str):
    return _wrap_task(self, run_destroy_vm, [instance_id, trainee_id, task_id], {}, "destroy_vm")


@celery_app.task(
    name="lab.cleanup.cleanup",
    bind=True,
    max_retries=3,
    retry_backoff=True,
)
def cleanup_task(self, instance_id: str, trainee_id: str, task_id: str, vm_destroyed: bool = False, skip_destroy: bool = False):
    return _wrap_task(self, run_cleanup, [instance_id, trainee_id, task_id], {"vm_destroyed": vm_destroyed, "skip_destroy": skip_destroy}, "cleanup")