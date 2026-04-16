# app/services/LabInstance/provisioning.py
"""
Lab Provisioning Service
========================

Handles VM provisioning, network allocation, and infrastructure orchestration.

FEATURES:
-----------
1. VM Lifecycle Management
   - Clone VMs from vCenter templates
   - Configure VM resources (CPU, RAM, Disk)
   - Set up networking (VLANs, segments, IPs)
   - Power on and validate VM readiness

2. Network Allocation
   - Allocate isolated network segments per lab instance
   - Configure virtual switches and port groups
   - Assign IP ranges and gateways
   - Track network resource utilization

3. vCenter Integration
   - Async vSphere API operations
   - VM configuration and customization
   - Snapshot management for lab reset
   - Resource pool management

4. Parallel Provisioning
   - Provision multiple VMs concurrently
   - Track individual VM status
   - Handle partial failures and rollback

5. Access Configuration
   - Generate console URLs (VNC, Guacamole)
   - Configure SSH/RDP access
   - Set up credential injection
   - Update firewall rules

STATE MACHINE:
--------------
SCHEDULED -> PROVISIONING -> CONFIGURING -> RUNNING
   |              |              |            |
   |              v              v            v
   +---------> FAILED         FAILED      STOPPING

ROLLBACK:
---------
On failure at any stage:
  1. Power off created VMs
  2. Unregister from vCenter
  3. Release network segments
  4. Update instance status to FAILED
  5. Log error details

DEPENDENCIES:
-------------
- vSphere SDK (pyvmomi or asyncio alternative)
- Network management service
- Credential vault (HashiCorp Vault or similar)
- Task queue (Celery) for background ops
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.LabInstance import LabInstance, LabInstanceStatus, LabInstanceVM, LabInstanceEvent
from app.models.LabDefinition import LabVM


class LabProvisioningService:
    """
    Service for VM provisioning and infrastructure management.
    
    Coordinates with vCenter to clone templates, configure VMs,
    and set up networking for lab instances.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        # TODO: Initialize vCenter client
        # self.vcenter = vCenterClient()
    
    async def start_provisioning(self, instance_id: UUID) -> None:
        """
        Initiate background provisioning for an instance.
        
        This method is called synchronously but triggers async tasks
        for the actual provisioning work.
        
        Args:
            instance_id: UUID of instance to provision
        """
        # Import here to avoid circular imports
        from app.tasks.LabInstance.provisioning import provision_lab_instance
        
        # Trigger Celery task
        provision_lab_instance.delay(str(instance_id))
    
    async def provision_instance(self, instance_id: UUID) -> bool:
        """
        Execute provisioning workflow for a lab instance.
        
        Steps:
        1. Fetch instance and lab definition
        2. Allocate network segment
        3. Clone VMs from templates (parallel)
        4. Configure VM resources
        5. Power on and wait for readiness
        6. Update access URLs
        7. Transition to RUNNING
        
        Args:
            instance_id: UUID of instance
            
        Returns:
            True if successful, False on failure
        """
        try:
            # Load instance with VMs definition
            result = await self.db.execute(
                select(LabInstance)
                .where(LabInstance.id == instance_id)
                .options(selectinload(LabInstance.lab_definition).selectinload(LabDefinition.vms))
            )
            instance = result.scalar_one()
            
            lab_def = instance.lab_definition
            
            await self._log_event(instance_id, "provision_start", "Starting VM provisioning")
            
            # 1. Allocate network
            network_config = await self._allocate_network(instance)
            instance.resources["network"] = network_config
            await self.db.commit()
            
            # 2. Provision VMs in parallel
            vm_tasks = []
            for lab_vm in lab_def.vms:
                task = self._provision_vm(instance, lab_vm, network_config)
                vm_tasks.append(task)
            
            vm_results = await asyncio.gather(*vm_tasks, return_exceptions=True)
            
            # Check for failures
            failed_vms = [r for r in vm_results if isinstance(r, Exception)]
            if failed_vms:
                await self._handle_provisioning_failure(instance, failed_vms)
                return False
            
            # 3. Configure access URLs
            await self._configure_access(instance, vm_results)
            
            # 4. Transition to RUNNING
            instance.status = LabInstanceStatus.RUNNING
            instance.ready_at = datetime.utcnow()
            instance.last_activity_at = datetime.utcnow()
            
            await self._log_event(
                instance_id, 
                "provision_complete", 
                f"Successfully provisioned {len(vm_results)} VMs"
            )
            
            await self.db.commit()
            return True
            
        except Exception as e:
            await self._handle_provisioning_failure(instance, [e])
            return False
    
    async def _provision_vm(
        self, 
        instance: LabInstance, 
        lab_vm: LabVM,
        network_config: Dict[str, Any]
    ) -> LabInstanceVM:
        """
        Provision a single VM from template.
        
        Args:
            instance: Parent lab instance
            lab_vm: VM definition
            network_config: Network segment configuration
            
        Returns:
            Created LabInstanceVM record
        """
        # TODO: Implement vCenter VM cloning
        # 1. Clone from template
        # 2. Reconfigure CPU/RAM/Disk
        # 3. Connect to network
        # 4. Power on
        # 5. Wait for IP
        
        # Mock implementation for structure
        vm_record = LabInstanceVM(
            lab_instance_id=instance.id,
            lab_vm_id=lab_vm.id,
            vcenter_vm_id=f"vm-{lab_vm.id}",
            vcenter_instance_uuid=str(uuid4()),
            esxi_host_id="host-01",
            network_segment=network_config.get("segment_name"),
            cpu_cores=lab_vm.config.get("cpu_cores", 2),
            ram_mb=lab_vm.config.get("memory_mb", 4096),
            disk_gb=lab_vm.config.get("disk_gb", 50),
            order=lab_vm.order
        )
        
        self.db.add(vm_record)
        await self.db.flush()  # Get ID without committing transaction
        
        return vm_record
    
    async def _allocate_network(self, instance: LabInstance) -> Dict[str, Any]:
        """
        Allocate network resources for an instance.
        
        Args:
            instance: Lab instance
            
        Returns:
            Network configuration dict with segment_id, CIDR, gateway
        """
        # TODO: Implement network allocation logic
        # This would interact with NSX, VLAN manager, or similar
        
        return {
            "segment_id": f"seg-{instance.id}",
            "cidr": "10.0.0.0/24",
            "gateway": "10.0.0.1",
            "vlan_id": 100,
            "segment_name": f"lab-{instance.id[:8]}"
        }
    
    async def _configure_access(
        self, 
        instance: LabInstance, 
        vms: List[LabInstanceVM]
    ) -> None:
        """
        Configure access URLs and credentials for VMs.
        
        Args:
            instance: Lab instance
            vms: List of provisioned VMs
        """
        access_urls = {}
        
        for vm in vms:
            if vm.order == 0:  # Primary VM
                access_urls["primary_vnc"] = f"https://vnc.platform.com/vm/{vm.id}"
                access_urls["guacamole"] = f"https://labs.platform.com/guac/{instance.id}"
            
            # Per-VM console access
            access_urls[f"vm_{vm.order}_console"] = vm.console_url
        
        instance.access_urls = access_urls
        
        # Generate credentials (or fetch from vault)
        instance.credentials = {
            "username": "labuser",
            "password_ref": f"vault://lab/{instance.id}/password"
        }
    
    async def start_cleanup(self, instance_id: UUID) -> None:
        """
        Initiate background cleanup for an instance.
        
        Args:
            instance_id: UUID of instance to cleanup
        """
        from app.tasks.LabInstance.cleanup import cleanup_lab_instance
        cleanup_lab_instance.delay(str(instance_id))
    
    async def cleanup_instance(self, instance_id: UUID) -> bool:
        """
        Execute cleanup workflow for a lab instance.
        
        Steps:
        1. Power off all VMs
        2. Unregister VMs from vCenter
        3. Release network segments
        4. Delete associated resources
        5. Transition to COMPLETED/ARCHIVED
        
        Args:
            instance_id: UUID of instance
            
        Returns:
            True if successful
        """
        try:
            result = await self.db.execute(
                select(LabInstance)
                .where(LabInstance.id == instance_id)
                .options(selectinload(LabInstance.vms))
            )
            instance = result.scalar_one()
            
            await self._log_event(instance_id, "cleanup_start", "Starting resource cleanup")
            
            # Power off and delete VMs
            for vm in instance.vms:
                await self._cleanup_vm(vm)
            
            # Release network
            await self._release_network(instance)
            
            # Update status
            if instance.status == LabInstanceStatus.STOPPING:
                instance.status = LabInstanceStatus.COMPLETED
                instance.ended_at = datetime.utcnow()
                
                # Calculate actual duration
                if instance.started_at:
                    duration = (instance.ended_at - instance.started_at).total_seconds() / 60
                    instance.actual_duration_minutes = int(duration)
            
            await self._log_event(instance_id, "cleanup_complete", "Resource cleanup finished")
            await self.db.commit()
            
            return True
            
        except Exception as e:
            await self._log_event(
                instance_id, 
                "cleanup_error", 
                f"Cleanup failed: {str(e)}",
                {"error": str(e)}
            )
            await self.db.commit()
            return False
    
    async def _cleanup_vm(self, vm: LabInstanceVM) -> None:
        """Power off and unregister a single VM."""
        # TODO: Implement vCenter cleanup
        vm.powered_off_at = datetime.utcnow()
        vm.vm_status = "poweredOff"
    
    async def _release_network(self, instance: LabInstance) -> None:
        """Release network segment allocation."""
        # TODO: Implement network release
        if "network" in instance.resources:
            instance.resources["network"]["released_at"] = datetime.utcnow().isoformat()
    
    async def _handle_provisioning_failure(
        self, 
        instance: LabInstance, 
        errors: List[Exception]
    ) -> None:
        """
        Handle provisioning failure with rollback.
        
        Args:
            instance: Lab instance
            errors: List of exceptions that occurred
        """
        error_msg = "; ".join([str(e) for e in errors])
        
        instance.status = LabInstanceStatus.FAILED
        instance.error_code = "PROVISIONING_FAILED"
        instance.error_message = error_msg
        instance.error_details = {"errors": [str(e) for e in errors]}
        
        await self._log_event(
            instance.id,
            "provision_failed",
            f"Provisioning failed: {error_msg}",
            {"errors": [str(e) for e in errors]}
        )
        
        # Attempt rollback
        try:
            await self.cleanup_instance(instance.id)
        except Exception as rollback_error:
            await self._log_event(
                instance.id,
                "rollback_failed",
                f"Rollback failed: {str(rollback_error)}"
            )
        
        await self.db.commit()
    
    async def _log_event(
        self,
        instance_id: UUID,
        event_type: str,
        message: str,
        metadata: Optional[Dict] = None
    ) -> None:
        """Log a provisioning event."""
        event = LabInstanceEvent(
            lab_instance_id=instance_id,
            event_type=event_type,
            message=message,
            metadata=metadata or {},
            source="LabProvisioningService"
        )
        self.db.add(event)
        await self.db.flush()


from datetime import datetime
from uuid import uuid4
from sqlalchemy.orm import selectinload