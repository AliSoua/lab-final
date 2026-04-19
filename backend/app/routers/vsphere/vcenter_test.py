# app/routers/vsphere/vcenter_test.py
import os
from fastapi import APIRouter, HTTPException, status
from typing import List, Dict
from dotenv import load_dotenv

from app.config.connection.vcenter_client import VCenterClient

load_dotenv()

router = APIRouter(prefix="/vsphere/vcenter-test", tags=["vsphere-test"])

# vCenter credentials from environment
VCENTER_HOST = os.getenv("VCENTER_HOST")
VCENTER_USER = os.getenv("VCENTER_USER")
VCENTER_PASSWORD = os.getenv("VCENTER_PASSWORD")

def ensure_vcenter_connected():
    """Ensure vCenter connection is established."""
    if not VCenterClient._connected:
        if not all([VCENTER_HOST, VCENTER_USER, VCENTER_PASSWORD]):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="vCenter configuration incomplete. Check VCENTER_HOST, VCENTER_USER, VCENTER_PASSWORD in .env"
            )
        
        success = VCenterClient.connect(VCENTER_HOST, VCENTER_USER, VCENTER_PASSWORD)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to connect to vCenter at {VCENTER_HOST}"
            )

@router.get("/health")
def vcenter_health():
    """
    TEST ENDPOINT: Check vCenter connection health.
    No authentication required. Uses credentials from .env.
    """
    # Try to connect if not connected
    if not VCenterClient._connected:
        if not all([VCENTER_HOST, VCENTER_USER, VCENTER_PASSWORD]):
            return {
                "status": "not_configured",
                "message": "vCenter credentials not configured in .env",
                "configured_host": VCENTER_HOST or "Not set",
                "configured_user": VCENTER_USER or "Not set",
                "password_set": bool(VCENTER_PASSWORD)
            }
        
        success = VCenterClient.connect(VCENTER_HOST, VCENTER_USER, VCENTER_PASSWORD)
        if not success:
            return {
                "status": "connection_failed",
                "message": f"Failed to connect to vCenter at {VCENTER_HOST}",
                "host": VCENTER_HOST,
                "user": VCENTER_USER
            }
    
    health = VCenterClient.health_check()
    return health

@router.get("/hosts", response_model=List[Dict])
def get_all_hosts():
    """
    TEST ENDPOINT: Get all ESXi hosts managed by vCenter.
    No authentication required. Uses credentials from .env.
    """
    try:
        ensure_vcenter_connected()
        hosts = VCenterClient.get_all_hosts()
        return hosts
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve hosts: {str(e)}"
        )

@router.get("/templates", response_model=List[Dict])
def get_all_templates():
    """
    TEST ENDPOINT: Get all VM templates from vCenter.
    No authentication required. Uses credentials from .env.
    """
    try:
        ensure_vcenter_connected()
        templates = VCenterClient.get_all_templates()
        return templates
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve templates: {str(e)}"
        )

@router.get("/vms", response_model=List[Dict])
def get_all_vms():
    """
    TEST ENDPOINT: Get all VMs from vCenter (across all hosts).
    """
    try:
        ensure_vcenter_connected()
        
        from pyVmomi import vim
        vms = []
        container = VCenterClient._content.viewManager.CreateContainerView(
            VCenterClient._content.rootFolder, [vim.VirtualMachine], True
        )
        
        for vm in container.view:
            if not vm.config.template:
                summary = vm.summary
                vm_data = {
                    "name": vm.name,
                    "power_state": summary.runtime.powerState,
                    "guest_os": summary.config.guestFullName,
                    "cpu_count": summary.config.numCpu,
                    "memory_mb": summary.config.memorySizeMB,
                    "ip_address": summary.guest.ipAddress if summary.guest else None,
                    "host": summary.runtime.host.name if summary.runtime.host else None,
                }
                vms.append(vm_data)
        
        container.Destroy()
        return vms
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve VMs: {str(e)}"
        )

@router.get("/datastores", response_model=List[Dict])
def get_all_datastores():
    """
    TEST ENDPOINT: Get all datastores from vCenter.
    """
    try:
        ensure_vcenter_connected()
        
        from pyVmomi import vim
        datastores = []
        container = VCenterClient._content.viewManager.CreateContainerView(
            VCenterClient._content.rootFolder, [vim.Datastore], True
        )
        
        for ds in container.view:
            info = ds.summary
            ds_data = {
                "name": info.name,
                "type": info.type,
                "capacity_gb": round(info.capacity / (1024**3), 2) if info.capacity else 0,
                "free_gb": round(info.freeSpace / (1024**3), 2) if info.freeSpace else 0,
                "used_gb": round((info.capacity - info.freeSpace) / (1024**3), 2) if info.capacity else 0,
                "accessible": info.accessible,
                "vm_count": len(ds.vm),
            }
            datastores.append(ds_data)
        
        container.Destroy()
        return datastores
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve datastores: {str(e)}"
        )

@router.get("/vms/{vm_name}")
def get_vm_details(vm_name: str):
    """
    TEST ENDPOINT: Get detailed info for specific VM.
    """
    try:
        ensure_vcenter_connected()
        
        from pyVmomi import vim
        container = VCenterClient._content.viewManager.CreateContainerView(
            VCenterClient._content.rootFolder, [vim.VirtualMachine], True
        )
        
        vm_data = None
        for vm in container.view:
            if vm.name == vm_name:
                summary = vm.summary
                
                # Get network adapters
                networks = []
                if vm.config and vm.config.hardware:
                    for device in vm.config.hardware.device:
                        if isinstance(device, vim.vm.device.VirtualEthernetCard):
                            networks.append({
                                "label": device.deviceInfo.label,
                                "mac_address": device.macAddress
                            })
                
                vm_data = {
                    "name": vm.name,
                    "power_state": summary.runtime.powerState,
                    "guest_os": summary.config.guestFullName,
                    "cpu_count": summary.config.numCpu,
                    "memory_mb": summary.config.memorySizeMB,
                    "ip_address": summary.guest.ipAddress if summary.guest else None,
                    "host": summary.runtime.host.name if summary.runtime.host else None,
                    "path": summary.config.vmPathName,
                    "networks": networks,
                }
                break
        
        container.Destroy()
        
        if not vm_data:
            raise HTTPException(status_code=404, detail=f"VM '{vm_name}' not found")
        
        return vm_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve VM: {str(e)}"
        )