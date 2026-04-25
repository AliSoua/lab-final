# backend/app/tasks/lab_instance_tasks.py
from app.core.celery import celery_app
from app.utils.db_session import background_session
from app.services.LabDefinition.lab_instance_service import LabInstanceService


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
    The audit row's UUID is reused as Celery's task_id (plan §3.4).
    """
    with background_session() as db:
        service = LabInstanceService(db)
        service._launch_worker(instance_id, trainee_id, task_id=self.request.id)


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
    """
    with background_session() as db:
        service = LabInstanceService(db)
        service._terminate_worker(instance_id, trainee_id, task_id=self.request.id)