# app/services/LabInstance/monitoring.py
"""
Lab Monitoring Service
======================

Health monitoring, metrics collection, and operational visibility.

FEATURES:
-----------
1. Health Checks
   - VM responsiveness monitoring (ping, SSH, RDP)
   - vCenter connectivity status
   - Network reachability tests
   - Service endpoint validation

2. Metrics Collection
   - Resource utilization (CPU, RAM, Disk)
   - Network I/O statistics
   - User activity metrics
   - Lab completion rates

3. Alerting
   - Failed provisioning detection
   - Resource exhaustion warnings
   - Unusual activity detection
   - Cost threshold alerts

4. Dashboard Data
   - Active instance counts by status
   - Resource pool utilization
   - User engagement metrics
   - Error rate tracking

5. Log Aggregation
   - Collect VM logs
   - Aggregate event streams
   - Error pattern detection
   - Performance bottleneck identification

MONITORING INTERVALS:
---------------------
- VM health: Every 60 seconds (active instances)
- Resource metrics: Every 5 minutes
- Expiry checks: Every 1 minute
- Inactivity checks: Every 5 minutes
- Full system health: Every 30 seconds

ALERT LEVELS:
-------------
- INFO: Normal operational events
- WARNING: Degraded performance, approaching limits
- ERROR: Service failures, provisioning errors
- CRITICAL: Data loss risk, system outages

INTEGRATIONS:
-------------
- Prometheus metrics export
- Grafana dashboards
- PagerDuty/OpsGenie for critical alerts
- Slack/Teams notifications
"""

from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models.LabInstance import LabInstance, LabInstanceStatus, LabInstanceVM


class LabMonitoringService:
    """
    Monitoring and health check service for lab infrastructure.
    
    Provides visibility into instance health, resource usage,
    and operational metrics.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_system_metrics(self) -> Dict[str, Any]:
        """
        Get overall system health metrics.
        
        Returns:
            Dict with counts, resource usage, and health status
        """
        # Instance counts by status
        status_counts = await self._get_status_counts()
        
        # Resource utilization
        resource_usage = await self._get_resource_usage()
        
        # Recent errors
        error_count = await self._get_recent_error_count()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "instances": status_counts,
            "resources": resource_usage,
            "errors_last_hour": error_count,
            "health_status": self._calculate_health_status(status_counts, error_count)
        }
    
    async def check_instance_health(self, instance_id: UUID) -> Dict[str, Any]:
        """
        Perform health check on a specific instance.
        
        Args:
            instance_id: UUID of instance to check
            
        Returns:
            Health check results with VM statuses
        """
        result = await self.db.execute(
            select(LabInstance)
            .where(LabInstance.id == instance_id)
            .options(selectinload(LabInstance.vms))
        )
        instance = result.scalar_one_or_none()
        
        if not instance:
            return {"status": "not_found"}
        
        vm_healths = []
        for vm in instance.vms:
            health = await self._check_vm_health(vm)
            vm_healths.append(health)
        
        overall_healthy = all(vm["healthy"] for vm in vm_healths)
        
        return {
            "instance_id": str(instance_id),
            "status": instance.status,
            "overall_healthy": overall_healthy,
            "vms": vm_healths,
            "last_activity": instance.last_activity_at.isoformat() if instance.last_activity_at else None,
            "expires_in_minutes": instance.remaining_minutes if instance.is_active else 0
        }
    
    async def get_user_activity_summary(
        self, 
        user_id: UUID,
        days: int = 7
    ) -> Dict[str, Any]:
        """
        Get activity summary for a specific user.
        
        Args:
            user_id: UUID of user
            days: Number of days to look back
            
        Returns:
            Activity metrics including labs completed, time spent, etc.
        """
        since = datetime.utcnow() - timedelta(days=days)
        
        # Labs completed
        completed_result = await self.db.execute(
            select(func.count(LabInstance.id)).where(
                and_(
                    LabInstance.user_id == user_id,
                    LabInstance.status == LabInstanceStatus.COMPLETED,
                    LabInstance.ended_at >= since
                )
            )
        )
        completed_count = completed_result.scalar()
        
        # Time spent
        time_result = await self.db.execute(
            select(func.sum(LabInstance.actual_duration_minutes)).where(
                and_(
                    LabInstance.user_id == user_id,
                    LabInstance.ended_at >= since
                )
            )
        )
        total_minutes = time_result.scalar() or 0
        
        # Current active
        active_result = await self.db.execute(
            select(func.count(LabInstance.id)).where(
                and_(
                    LabInstance.user_id == user_id,
                    LabInstance.status.in_([
                        LabInstanceStatus.RUNNING,
                        LabInstanceStatus.PAUSED
                    ])
                )
            )
        )
        active_count = active_result.scalar()
        
        return {
            "user_id": str(user_id),
            "period_days": days,
            "labs_completed": completed_count,
            "total_time_minutes": total_minutes,
            "current_active_instances": active_count,
            "average_session_minutes": (
                total_minutes / completed_count if completed_count > 0 else 0
            )
        }
    
    async def find_expiring_instances(
        self, 
        warning_minutes: int = 15
    ) -> List[LabInstance]:
        """
        Find instances approaching expiration.
        
        Args:
            warning_minutes: Find instances expiring within this window
            
        Returns:
            List of instances needing warnings
        """
        cutoff = datetime.utcnow() + timedelta(minutes=warning_minutes)
        
        result = await self.db.execute(
            select(LabInstance).where(
                and_(
                    LabInstance.status.in_([
                        LabInstanceStatus.RUNNING,
                        LabInstanceStatus.PAUSED
                    ]),
                    LabInstance.expires_at <= cutoff,
                    LabInstance.expires_at > datetime.utcnow(),
                    LabInstance.has_been_warned == False
                )
            )
        )
        
        return list(result.scalars().all())
    
    async def find_inactive_instances(
        self, 
        inactive_minutes: int = 30
    ) -> List[LabInstance]:
        """
        Find instances with no recent user activity.
        
        Args:
            inactive_minutes: Inactivity threshold
            
        Returns:
            List of inactive instances
        """
        cutoff = datetime.utcnow() - timedelta(minutes=inactive_minutes)
        
        result = await self.db.execute(
            select(LabInstance).where(
                and_(
                    LabInstance.status == LabInstanceStatus.RUNNING,
                    or_(
                        LabInstance.last_activity_at < cutoff,
                        LabInstance.last_activity_at == None
                    )
                )
            )
        )
        
        return list(result.scalars().all())
    
    async def _get_status_counts(self) -> Dict[str, int]:
        """Get instance counts grouped by status."""
        result = await self.db.execute(
            select(LabInstance.status, func.count(LabInstance.id))
            .group_by(LabInstance.status)
        )
        
        counts = {status.value: 0 for status in LabInstanceStatus}
        for status, count in result.all():
            counts[status] = count
        
        return counts
    
    async def _get_resource_usage(self) -> Dict[str, Any]:
        """Calculate aggregate resource usage."""
        # Get all active VMs
        result = await self.db.execute(
            select(LabInstanceVM).join(LabInstance).where(
                LabInstance.status.in_([
                    LabInstanceStatus.RUNNING,
                    LabInstanceStatus.PAUSED
                ])
            )
        )
        vms = result.scalars().all()
        
        total_cpu = sum(vm.cpu_cores or 0 for vm in vms)
        total_ram = sum(vm.ram_mb or 0 for vm in vms)
        total_disk = sum(vm.disk_gb or 0 for vm in vms)
        
        return {
            "active_vms": len(vms),
            "total_cpu_cores": total_cpu,
            "total_ram_mb": total_ram,
            "total_disk_gb": total_disk,
            "active_network_segments": len(set(vm.network_segment for vm in vms if vm.network_segment))
        }
    
    async def _get_recent_error_count(self, hours: int = 1) -> int:
        """Count recent errors."""
        since = datetime.utcnow() - timedelta(hours=hours)
        
        result = await self.db.execute(
            select(func.count(LabInstance.id)).where(
                and_(
                    LabInstance.status == LabInstanceStatus.FAILED,
                    LabInstance.ended_at >= since
                )
            )
        )
        
        return result.scalar()
    
    async def _check_vm_health(self, vm: LabInstanceVM) -> Dict[str, Any]:
        """Check health of a single VM."""
        # TODO: Implement actual health checks
        # - Ping test
        # - SSH/RDP port check
        # - VMware Tools status
        # - Application health endpoints
        
        return {
            "vm_id": str(vm.id),
            "name": getattr(vm, "name", f"vm-{vm.order}"),
            "healthy": vm.vm_status == "poweredOn",
            "status": vm.vm_status,
            "ip_address": str(vm.ip_address) if vm.ip_address else None,
            "tools_status": vm.tools_status,
            "checks": {
                "power": vm.vm_status == "poweredOn",
                "network": vm.ip_address is not None,
                "tools": vm.tools_status == "toolsOk"
            }
        }
    
    def _calculate_health_status(
        self, 
        counts: Dict[str, int], 
        error_count: int
    ) -> str:
        """Calculate overall system health status."""
        failed = counts.get(LabInstanceStatus.FAILED.value, 0)
        total = sum(counts.values())
        
        if error_count > 10 or (total > 0 and failed / total > 0.2):
            return "critical"
        elif error_count > 5 or failed > 0:
            return "warning"
        else:
            return "healthy"


from sqlalchemy.orm import selectinload