# app/tasks/LabInstance/monitoring.py
"""
Lab Monitoring and Health Check Tasks
======================================

Periodic Celery tasks for monitoring lab infrastructure health.

FEATURES:
-----------
1. Expiration Monitoring
   - Check for expiring instances every minute
   - Send warning notifications at 15min and 5min
   - Auto-expire instances that reach time limit
   - Bulk operations for efficiency

2. Inactivity Detection
   - Scan for idle instances every 5 minutes
   - Auto-pause instances with no user activity
   - Update last_activity timestamp on interactions
   - User notifications before pausing

3. System Metrics Collection
   - Aggregate resource usage stats
   - Calculate health scores
   - Export to Prometheus/Grafana
   - Trend analysis and alerting

4. Health Checks
   - VM responsiveness tests
   - vCenter connectivity checks
   - Network reachability validation
   - Service endpoint monitoring

SCHEDULE:
---------
- check_expiring_instances: Every 60 seconds
- check_inactive_instances: Every 5 minutes
- collect_system_metrics: Every 30 seconds
- health_check_all: Every 60 seconds

NOTIFICATIONS:
--------------
- Expiry warnings: Email + In-app
- Auto-pause: In-app notification
- System alerts: Slack/PagerDuty for ops team
- Daily summary: Admin dashboard metrics

PERFORMANCE:
------------
- Database queries optimized with indexes
- Batch processing for bulk operations
- Async I/O for external checks
- Connection pooling for DB operations
"""

from celery import shared_task
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.config.connection.postgres_client import async_session

logger = logging.getLogger(__name__)


@shared_task(queue="lab.monitoring")
def check_expiring_instances() -> Dict[str, Any]:
    """
    Check for instances approaching expiration and handle accordingly.
    
    This task runs every minute to:
    1. Find instances expiring in < 15 minutes (send warnings)
    2. Find instances that have expired (auto-terminate)
    
    Returns:
        Summary of actions taken
    """
    import asyncio
    from app.services.LabInstance.monitoring import LabMonitoringService
    from app.services.LabInstance.lifecycle import LabLifecycleService
    from app.models.LabInstance import LabInstanceStatus
    from sqlalchemy import select, and_
    from app.models.LabInstance import LabInstance
    
    logger.debug("Running expiration check task")
    
    async def _check() -> Dict[str, Any]:
        warnings_sent = 0
        expired_count = 0
        errors: List[str] = []
        
        async with async_session() as db:
            monitor = LabMonitoringService(db)
            lifecycle = LabLifecycleService(db)
            
            # Send warnings for instances expiring soon
            try:
                warning_instances = await monitor.find_expiring_instances(warning_minutes=15)
                for instance in warning_instances:
                    try:
                        await lifecycle._send_expiry_warning(instance, 15)
                        instance.has_been_warned = True
                        warnings_sent += 1
                    except Exception as e:
                        errors.append(f"Warning failed for {instance.id}: {e}")
                
                if warnings_sent > 0:
                    await db.commit()
            except Exception as e:
                errors.append(f"Warning check failed: {e}")
            
            # Handle expired instances
            try:
                result = await db.execute(
                    select(LabInstance).where(
                        and_(
                            LabInstance.status.in_([
                                LabInstanceStatus.RUNNING,
                                LabInstanceStatus.PAUSED
                            ]),
                            LabInstance.expires_at <= datetime.utcnow()
                        )
                    )
                )
                expired_instances = result.scalars().all()
                
                for instance in expired_instances:
                    try:
                        expired = await lifecycle.check_expiration(instance)
                        if expired:
                            expired_count += 1
                            logger.info(f"Auto-expired instance {instance.id}")
                    except Exception as e:
                        errors.append(f"Expiration failed for {instance.id}: {e}")
                
                await db.commit()
            except Exception as e:
                errors.append(f"Expiration check failed: {e}")
        
        return {
            "warnings_sent": warnings_sent,
            "expired_count": expired_count,
            "errors": errors,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    try:
        result = asyncio.run(_check())
        if result["warnings_sent"] > 0 or result["expired_count"] > 0:
            logger.info(f"Expiration check: {result['warnings_sent']} warnings, {result['expired_count']} expired")
        return result
    except Exception as e:
        logger.error(f"Expiration check task failed: {e}")
        return {"error": str(e)}


@shared_task(queue="lab.monitoring")
def check_inactive_instances() -> Dict[str, Any]:
    """
    Check for inactive instances and auto-pause if needed.
    
    Runs every 5 minutes to find instances with no user activity
    for > 30 minutes and automatically pauses them.
    
    Returns:
        Summary of paused instances
    """
    import asyncio
    from app.services.LabInstance.monitoring import LabMonitoringService
    from app.services.LabInstance.lifecycle import LabLifecycleService
    
    logger.debug("Running inactivity check task")
    
    async def _check() -> Dict[str, Any]:
        paused_count = 0
        errors: List[str] = []
        checked_count = 0
        
        async with async_session() as db:
            monitor = LabMonitoringService(db)
            lifecycle = LabLifecycleService(db)
            
            try:
                inactive_instances = await monitor.find_inactive_instances(inactive_minutes=30)
                checked_count = len(inactive_instances)
                
                for instance in inactive_instances:
                    try:
                        paused = await lifecycle.check_inactivity(instance)
                        if paused:
                            paused_count += 1
                            logger.info(f"Auto-paused inactive instance {instance.id}")
                    except Exception as e:
                        errors.append(f"Auto-pause failed for {instance.id}: {e}")
                
                await db.commit()
            except Exception as e:
                errors.append(f"Inactivity check failed: {e}")
        
        return {
            "paused_count": paused_count,
            "checked_count": checked_count,
            "errors": errors,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    try:
        result = asyncio.run(_check())
        if result["paused_count"] > 0:
            logger.info(f"Inactivity check: auto-paused {result['paused_count']} instances")
        return result
    except Exception as e:
        logger.error(f"Inactivity check task failed: {e}")
        return {"error": str(e)}


@shared_task(queue="lab.monitoring")
def collect_system_metrics() -> Dict[str, Any]:
    """
    Collect and record system-wide metrics.
    
    Gathers metrics on:
    - Instance counts by status
    - Resource utilization (CPU, RAM, Disk)
    - Error rates
    - User activity
    
    Returns:
        Collected metrics dict
    """
    import asyncio
    from app.services.LabInstance.monitoring import LabMonitoringService
    
    logger.debug("Collecting system metrics")
    
    async def _collect() -> Dict[str, Any]:
        async with async_session() as db:
            monitor = LabMonitoringService(db)
            metrics = await monitor.get_system_metrics()
            return metrics
    
    try:
        metrics = asyncio.run(_collect())
        
        if metrics.get("health_status") == "critical":
            logger.error(f"CRITICAL: System health is critical - {metrics}")
        elif metrics.get("health_status") == "warning":
            logger.warning(f"WARNING: System health degraded - {metrics}")
        
        return metrics
    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")
        return {"error": str(e)}


@shared_task(queue="lab.monitoring")
def health_check_all() -> Dict[str, Any]:
    """
    Perform health checks on all active instances.
    
    Comprehensive health check including:
    - VM power state
    - Network connectivity
    - Service responsiveness
    - Resource availability
    
    Returns:
        Health check summary with any issues found
    """
    import asyncio
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.models.LabInstance import LabInstance, LabInstanceStatus
    from app.services.LabInstance.monitoring import LabMonitoringService
    
    logger.info("Running health check on all active instances")
    
    async def _check() -> Dict[str, Any]:
        async with async_session() as db:
            result = await db.execute(
                select(LabInstance)
                .where(
                    LabInstance.status.in_([
                        LabInstanceStatus.RUNNING,
                        LabInstanceStatus.PROVISIONING,
                        LabInstanceStatus.CONFIGURING
                    ])
                )
                .options(selectinload(LabInstance.vms))
            )
            instances = result.scalars().all()
            
            monitor = LabMonitoringService(db)
            issues: List[Dict[str, Any]] = []
            healthy_count = 0
            
            for instance in instances:
                try:
                    health = await monitor.check_instance_health(instance.id)
                    
                    if not health.get("overall_healthy", False):
                        issues.append({
                            "instance_id": str(instance.id),
                            "status": health.get("status"),
                            "problems": [
                                vm for vm in health.get("vms", [])
                                if not vm.get("healthy")
                            ]
                        })
                        logger.warning(f"Health check failed for instance {instance.id}")
                    else:
                        healthy_count += 1
                        
                except Exception as e:
                    issues.append({
                        "instance_id": str(instance.id),
                        "error": str(e)
                    })
            
            return {
                "total_checked": len(instances),
                "healthy": healthy_count,
                "issues_found": len(issues),
                "issues": issues,
                "timestamp": datetime.utcnow().isoformat()
            }
    
    try:
        result = asyncio.run(_check())
        
        if result["issues_found"] > 0:
            logger.warning(f"Health check found {result['issues_found']} issues")
        else:
            logger.info(f"Health check complete: {result['healthy']}/{result['total_checked']} healthy")
        
        return result
    except Exception as e:
        logger.error(f"Health check task failed: {e}")
        return {"error": str(e)}