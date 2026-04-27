# backend/app/tasks/lab_instance_tasks.py
"""
Celery task definitions for lab instance lifecycle operations.

Each task wraps the worker function with:
- Structured logging (task_id, instance_id, trainee_id bound to every log line)
- Explicit lifecycle logging (start, success, failure, retry)
- Exception capture before Celery's retry mechanism swallows the traceback
"""

import logging
from celery.exceptions import MaxRetriesExceededError, SoftTimeLimitExceeded

from app.core.celery import celery_app
from app.core.logging import log_task
from app.services.LabInstance.LaunchInstance import run_launch_worker
from app.services.LabInstance.TerminateInstance import run_terminate_worker

# Module-level logger (used only for imports/setup logs, not task execution)
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
def launch_instance_task(self, instance_id: str, trainee_id: str):
    """
    Celery worker entry-point for launching a lab instance.

    Called by the API router via `launch_instance_task.apply_async(...)`.
    The audit row's UUID is reused as Celery's task_id.
    """
    # Bind structured context to logger for this task execution
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
        run_launch_worker(
            instance_id=instance_id,
            trainee_id=trainee_id,
            task_id=self.request.id,
        )
        task_logger.info("Task completed successfully")

    except SoftTimeLimitExceeded:
        # Soft time limit (20 min) hit — log clearly, let Celery retry or fail
        task_logger.error(
            "Soft time limit exceeded (20 min) — task will be retried or marked failed"
        )
        # Re-raise so Celery handles it (retry or MaxRetriesExceededError)
        raise

    except (ConnectionError, TimeoutError) as exc:
        # These trigger autoretry — log before Celery swallows the exception
        if self.request.retries < self.max_retries:
            task_logger.warning(
                "Transient error (will retry) | error=%s | retry_in=%ss",
                exc,
                self.retry_backoff,
            )
        else:
            task_logger.error(
                "Transient error (max retries exceeded) | error=%s",
                exc,
            )
        # Re-raise so Celery's autoretry mechanism catches it
        raise

    except MaxRetriesExceededError:
        task_logger.error("Max retries exceeded — task permanently failed")
        raise

    except Exception as exc:
        # Unexpected error — log full traceback, then re-raise
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
def terminate_instance_task(self, instance_id: str, trainee_id: str):
    """
    Celery worker entry-point for terminating a lab instance.

    Called by the API router via `terminate_instance_task.apply_async(...)`.
    Cleanup tasks must complete even on worker crash (task_acks_late=True).
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
        run_terminate_worker(
            instance_id=instance_id,
            trainee_id=trainee_id,
            task_id=self.request.id,
        )
        task_logger.info("Task completed successfully")

    except SoftTimeLimitExceeded:
        task_logger.error(
            "Soft time limit exceeded during cleanup — resources may be leaked"
        )
        # For cleanup tasks, consider NOT retrying on timeout to avoid
        # leaving partial state. But for now, let Celery handle it.
        raise

    except Exception as exc:
        # Log all errors for cleanup tasks — these are critical to trace
        task_logger.exception(
            "Error during terminate | error=%s | retries_used=%d/%d",
            exc,
            self.request.retries,
            self.max_retries,
        )
        raise