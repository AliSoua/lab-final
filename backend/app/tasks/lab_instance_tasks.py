# backend/app/tasks/lab_instance_tasks.py
"""
Celery task definitions for lab instance lifecycle operations.

Each task wraps the worker function with:
- Structured logging (task_id, instance_id, trainee_id bound to every log line)
- Explicit lifecycle logging (start, success, failure, retry)
- Exception capture before Celery's retry mechanism swallows the traceback
- Return values for result backend verification
"""

import logging
from typing import Dict, Any, Optional
from celery.exceptions import MaxRetriesExceededError, SoftTimeLimitExceeded

from app.core.celery import celery_app
from app.core.logging import log_task
from app.services.LabInstance.LaunchInstance import run_launch_worker
from app.services.LabInstance.TerminateInstance import run_terminate_worker

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
#  LAUNCH INSTANCE TASK
# ═══════════════════════════════════════════════════════════════════════════════

@celery_app.task(
    name="lab.provisioning.launch_instance",
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=60,
    max_retries=3,
)
def launch_instance_task(self, instance_id: str, trainee_id: str) -> Dict[str, Any]:
    """
    Celery worker entry-point for launching a lab instance.

    Called by the API router via `launch_instance_task.apply_async(...)`.
    The audit row's UUID is reused as Celery's task_id.

    Returns:
        Dict with instance state after provisioning (vm_uuid, ip_address, etc.)
    """
    task_logger = log_task(
        logging.getLogger(__name__),
        task_id=self.request.id,
        instance_id=instance_id,
        trainee_id=trainee_id,
    )

    task_logger.info(
        "Task started | attempt=%d/%d",
        self.request.retries + 1,
        self.max_retries + 1,
    )

    try:
        result = run_launch_worker(
            instance_id=instance_id,
            trainee_id=trainee_id,
            task_id=self.request.id,
        )
        task_logger.info("Task completed successfully")
        return result or {"status": "unknown", "instance_id": instance_id}

    except SoftTimeLimitExceeded:
        task_logger.error(
            "Soft time limit exceeded (20 min) — task will be retried or marked failed"
        )
        raise

    except (ConnectionError, TimeoutError) as exc:
        if self.request.retries < self.max_retries:
            task_logger.warning(
                "Transient error (will retry) | error=%s",
                exc,
            )
        else:
            task_logger.error(
                "Transient error (max retries exceeded) | error=%s",
                exc,
            )
        raise

    except MaxRetriesExceededError:
        task_logger.error("Max retries exceeded — task permanently failed")
        raise

    except Exception as exc:
        task_logger.exception(
            "Unexpected error during launch | error=%s",
            exc,
        )
        raise


# ═══════════════════════════════════════════════════════════════════════════════
#  TERMINATE INSTANCE TASK
# ═══════════════════════════════════════════════════════════════════════════════

@celery_app.task(
    name="lab.cleanup.terminate_instance",
    bind=True,
    max_retries=3,
    retry_backoff=True,
)
def terminate_instance_task(self, instance_id: str, trainee_id: str) -> Dict[str, Any]:
    """
    Celery worker entry-point for terminating a lab instance.

    Called by the API router via `terminate_instance_task.apply_async(...)`.

    Returns:
        Dict with termination confirmation and cleanup status.
    """
    task_logger = log_task(
        logging.getLogger(__name__),
        task_id=self.request.id,
        instance_id=instance_id,
        trainee_id=trainee_id,
    )

    task_logger.info(
        "Task started | attempt=%d/%d",
        self.request.retries + 1,
        self.max_retries + 1,
    )

    try:
        result = run_terminate_worker(
            instance_id=instance_id,
            trainee_id=trainee_id,
            task_id=self.request.id,
        )
        task_logger.info("Task completed successfully")
        return result or {"status": "unknown", "instance_id": instance_id}

    except SoftTimeLimitExceeded:
        task_logger.error(
            "Soft time limit exceeded during cleanup — resources may be leaked"
        )
        raise

    except Exception as exc:
        task_logger.exception(
            "Error during terminate | error=%s | retries_used=%d/%d",
            exc,
            self.request.retries,
            self.max_retries,
        )
        raise