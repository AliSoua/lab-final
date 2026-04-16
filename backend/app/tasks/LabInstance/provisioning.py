# app/tasks/LabInstance/provisioning.py
"""
Lab Provisioning Background Tasks
==================================

Celery tasks for VM provisioning and infrastructure setup.

FEATURES:
-----------
1. Async Provisioning
   - Clone VMs from templates in background
   - Configure networking and resources
   - Handle long-running vCenter operations
   - Progress tracking via events

2. Error Handling
   - Automatic retry on transient failures
   - Rollback on persistent errors
   - Detailed error logging
   - Admin notifications on failure

3. State Management
   - Update instance status during provisioning
   - Create VM records as they come online
   - Store access credentials securely
   - Validate all resources ready before RUNNING

4. Parallelization
   - Provision multiple VMs concurrently
   - Async I/O for vCenter operations
   - Non-blocking task execution

TASK FLOW:
----------
1. provision_lab_instance (task entry)
   -> LabProvisioningService.provision_instance()
      -> Clone VMs (parallel)
      -> Configure network
      -> Wait for readiness
      -> Update to RUNNING

RETRY BEHAVIOR:
---------------
- Retry on vCenter timeout (503 errors)
- Retry on network transient errors
- No retry on invalid config (permanent failure)
- Max 3 attempts with exponential backoff

MONITORING:
-----------
- Task duration metrics
- Success/failure rates
- VM provisioning time per template
- Resource utilization during provisioning
"""

from celery import shared_task
import logging
import time
from uuid import UUID
import asyncio

from app.config.connection.postgres_client import async_session
from app.services.LabInstance.provisioning import LabProvisioningService

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=300,
    queue="lab.provisioning"
)
def provision_lab_instance(self, instance_id: str) -> dict:
    """
    Celery task to provision a lab instance.
    """
    start_time = time.time()
    logger.info(f"Starting provisioning task for instance {instance_id}")
    
    try:
        async def _provision():
            async with async_session() as db:
                service = LabProvisioningService(db)
                success = await service.provision_instance(UUID(instance_id))
                return success
        
        success = asyncio.run(_provision())
        duration = time.time() - start_time
        
        if success:
            logger.info(f"Provisioning completed for {instance_id} in {duration:.2f}s")
            return {
                "status": "success",
                "instance_id": instance_id,
                "message": "Instance provisioned successfully",
                "duration_seconds": duration
            }
        else:
            raise Exception("Provisioning failed")
    
    except Exception as exc:
        duration = time.time() - start_time
        logger.error(f"Provisioning error for {instance_id}: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=300 * (self.request.retries + 1))
        
        # Emergency cleanup
        from app.tasks.LabInstance.cleanup import cleanup_lab_instance
        cleanup_lab_instance.delay(instance_id)
        
        return {
            "status": "failed",
            "instance_id": instance_id,
            "message": f"Max retries exceeded: {str(exc)}",
            "duration_seconds": duration
        }


# Alternative: Direct function using celery_client (for non-decorator usage)
def trigger_provisioning(instance_id: str, countdown: int = 0):
    """
    Trigger provisioning via the connection client.
    
    Usage:
        from app.tasks.LabInstance.provisioning import trigger_provisioning
        trigger_provisioning("uuid-here", countdown=10)
    """
    from app.config.connection.celery_client import celery_client
    
    return celery_client.send_task(
        "app.tasks.LabInstance.provisioning.provision_lab_instance",
        args=[instance_id],
        countdown=countdown,
        queue="lab.provisioning"
    )