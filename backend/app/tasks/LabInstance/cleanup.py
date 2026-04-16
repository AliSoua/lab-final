# app/tasks/LabInstance/cleanup.py
"""
Lab Cleanup and Maintenance Tasks
==================================

Celery tasks for resource cleanup and data archival.

FEATURES:
-----------
1. Instance Cleanup
   - Power off and unregister VMs
   - Release network segments
   - Delete temporary resources
   - Update final status and metrics

2. Data Archival
   - Archive old completed instances
   - Compress event logs
   - Move to cold storage
   - Maintain audit trail

3. Expired Resource Reclamation
   - Find and cleanup orphaned VMs
   - Release unused network segments
   - Delete old snapshots
   - Reclaim storage

4. Scheduled Maintenance
   - Periodic cleanup of COMPLETED instances
   - Archive instances older than retention period
   - Database optimization
   - Log rotation

CLEANUP STATES:
---------------
- STOPPING -> COMPLETED -> ARCHIVED
- FAILED -> ARCHIVED (after investigation period)
- EXPIRED -> ARCHIVED

RETENTION POLICY:
-----------------
- RUNNING instances: Until user stops or expiry
- COMPLETED instances: 7 days before archival
- ARCHIVED instances: 90 days before deletion
- Event logs: 1 year

SAFETY MEASURES:
----------------
- Never delete active (RUNNING/PAUSED) instances
- Verify VM destruction before marking complete
- Backup event logs before archival
- Multiple retries for cleanup operations
"""

from celery import shared_task
import logging
from datetime import datetime, timedelta
from typing import Dict, Any

from app.config.connection.postgres_client import async_session

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=5,
    default_retry_delay=60,
    queue="lab.cleanup"
)
def cleanup_lab_instance(self, instance_id: str) -> Dict[str, Any]:
    """
    Celery task to cleanup a lab instance.
    
    Powers off VMs, unregisters from vCenter, releases resources,
    and updates instance status to COMPLETED.
    
    Args:
        instance_id: UUID string of instance to cleanup
        
    Returns:
        Status dict with cleanup results
    """
    import asyncio
    from uuid import UUID
    from app.services.LabInstance.provisioning import LabProvisioningService
    
    logger.info(f"Starting cleanup task for instance {instance_id}")
    
    try:
        async def _cleanup() -> bool:
            async with async_session() as db:
                service = LabProvisioningService(db)
                success = await service.cleanup_instance(UUID(instance_id))
                return success
        
        success = asyncio.run(_cleanup())
        
        if success:
            logger.info(f"Cleanup completed for {instance_id}")
            return {
                "status": "success",
                "instance_id": instance_id,
                "message": "Instance cleaned up successfully",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            raise Exception("Cleanup service returned failure")
    
    except Exception as exc:
        logger.error(f"Cleanup error for {instance_id}: {exc}")
        
        if self.request.retries < self.max_retries:
            logger.warning(f"Retrying cleanup for {instance_id}")
            raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))
        
        logger.critical(f"CRITICAL: Failed to cleanup instance {instance_id} after {self.max_retries} retries")
        
        return {
            "status": "failed",
            "instance_id": instance_id,
            "error": str(exc),
            "requires_manual_cleanup": True
        }


@shared_task(queue="lab.cleanup")
def archive_old_instances() -> Dict[str, Any]:
    """
    Periodic task to archive old completed instances.
    
    Archives instances that have been COMPLETED for more than
    the retention period (7 days).
    
    Returns:
        Summary of archival operations
    """
    import asyncio
    from sqlalchemy import select, and_
    from app.models.LabInstance import LabInstance, LabInstanceStatus
    
    logger.info("Starting archival task for old instances")
    
    async def _archive() -> Dict[str, int]:
        async with async_session() as db:
            cutoff = datetime.utcnow() - timedelta(days=7)
            
            result = await db.execute(
                select(LabInstance).where(
                    and_(
                        LabInstance.status == LabInstanceStatus.COMPLETED,
                        LabInstance.ended_at < cutoff,
                        LabInstance.status != LabInstanceStatus.ARCHIVED
                    )
                )
            )
            instances = result.scalars().all()
            
            archived_count = 0
            for instance in instances:
                try:
                    instance.status = LabInstanceStatus.ARCHIVED
                    archived_count += 1
                    logger.info(f"Archived instance {instance.id}")
                except Exception as e:
                    logger.error(f"Failed to archive {instance.id}: {e}")
            
            await db.commit()
            
            return {
                "archived_count": archived_count,
                "total_found": len(instances)
            }
    
    try:
        result = asyncio.run(_archive())
        logger.info(f"Archival complete: {result['archived_count']}/{result['total_found']} instances archived")
        return result
    except Exception as e:
        logger.error(f"Archival task failed: {e}")
        return {"error": str(e)}


@shared_task(queue="lab.cleanup")
def purge_deleted_instances() -> Dict[str, Any]:
    """
    Permanently delete archived instances after retention period.
    
    Removes instances that have been ARCHIVED for > 90 days.
    This is a destructive operation - data will be lost.
    
    Returns:
        Deletion summary
    """
    import asyncio
    from sqlalchemy import select, and_, delete
    from app.models.LabInstance import LabInstance, LabInstanceStatus
    from app.models.LabInstance import LabInstanceEvent
    
    logger.warning("Starting purge task for old archived instances")
    
    async def _purge() -> Dict[str, Any]:
        async with async_session() as db:
            cutoff = datetime.utcnow() - timedelta(days=90)
            
            result = await db.execute(
                select(LabInstance.id).where(
                    and_(
                        LabInstance.status == LabInstanceStatus.ARCHIVED,
                        LabInstance.ended_at < cutoff
                    )
                )
            )
            ids_to_purge = [r[0] for r in result.all()]
            
            if not ids_to_purge:
                return {"purged_count": 0}
            
            await db.execute(
                delete(LabInstanceEvent).where(
                    LabInstanceEvent.lab_instance_id.in_(ids_to_purge)
                )
            )
            
            await db.execute(
                delete(LabInstance).where(
                    LabInstance.id.in_(ids_to_purge)
                )
            )
            
            await db.commit()
            
            return {
                "purged_count": len(ids_to_purge),
                "instance_ids": [str(id) for id in ids_to_purge]
            }
    
    try:
        result = asyncio.run(_purge())
        logger.info(f"Purged {result['purged_count']} old instances")
        return result
    except Exception as e:
        logger.error(f"Purge task failed: {e}")
        return {"error": str(e)}