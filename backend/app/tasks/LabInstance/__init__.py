# app/tasks/LabInstance/__init__.py
"""
Lab Instance Background Tasks Package
======================================

Celery tasks for asynchronous lab operations.

This package contains background task definitions for long-running
operations that should not block API requests, including:

- VM provisioning and cleanup (can take 5-15 minutes)
- Periodic monitoring and health checks
- Expiration management and cleanup
- Resource metrics collection

TASK QUEUES:
------------
- lab.provisioning: VM clone/configure operations
- lab.cleanup: Resource deletion and cleanup
- lab.monitoring: Health checks and metrics
- lab.maintenance: Periodic maintenance tasks

RETRY POLICY:
-------------
- Provisioning: Max 3 retries, exponential backoff (5min, 15min, 45min)
- Cleanup: Max 5 retries (cleanup must succeed)
- Monitoring: No retries (next run will catch up)

USAGE:
------
    from app.tasks.LabInstance import provision_lab_instance
    
    # Trigger async provisioning
    provision_lab_instance.delay(instance_id)
    
    # Or with countdown
    cleanup_lab_instance.apply_async(args=[instance_id], countdown=300)
"""

from app.tasks.LabInstance.provisioning import provision_lab_instance
from app.tasks.LabInstance.cleanup import cleanup_lab_instance, archive_old_instances
from app.tasks.LabInstance.monitoring import (
    check_expiring_instances,
    check_inactive_instances,
    collect_system_metrics
)

__all__ = [
    "provision_lab_instance",
    "cleanup_lab_instance",
    "archive_old_instances",
    "check_expiring_instances",
    "check_inactive_instances",
    "collect_system_metrics"
]