# app/routers/vsphere/esxi_test.py
import os
from fastapi import APIRouter, HTTPException, status
from typing import List, Dict
from dotenv import load_dotenv

from app.config.connection.esxi_client import ESXiClient

load_dotenv()

router = APIRouter(prefix="/vsphere/esxi-test", tags=["vsphere-test"])

# Read credentials from environment
ESXI_TEST_HOST = os.getenv("ESXI_TEST_HOST", "192.168.1.100")
ESXI_TEST_USERNAME = os.getenv("ESXI_TEST_USERNAME", "root")
ESXI_TEST_PASSWORD = os.getenv("ESXI_TEST_PASSWORD", "password123")

@router.get("/connection")
def esxi_connection_health():
    """
    TEST ENDPOINT: Check ESXi connection using credentials from .env.
    No authentication required.
    """
    client = ESXiClient(
        host=ESXI_TEST_HOST,
        username=ESXI_TEST_USERNAME,
        password=ESXI_TEST_PASSWORD
    )

    try:
        if not client.connect():
            return {
                "status": "connection_failed",
                "connected": False,
                "host": client.host,
                "message": "Failed to connect to ESXi host with provided credentials"
            }

        health = client.health_check()
        client.disconnect()
        return health

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection error: {str(e)}"
        )

@router.get("/templates", response_model=List[Dict])
def get_esxi_templates():
    """
    TEST ENDPOINT: Get VM templates using credentials from .env.
    No authentication required.
    """
    client = ESXiClient(
        host=ESXI_TEST_HOST,
        username=ESXI_TEST_USERNAME,
        password=ESXI_TEST_PASSWORD
    )

    try:
        if not client.connect():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to connect to ESXi host {client.host}"
            )

        templates = client.get_templates()
        client.disconnect()
        return templates

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve templates: {str(e)}"
        )

@router.get("/info")
def get_esxi_info():
    """
    TEST ENDPOINT: Get ESXi host info using credentials from .env.
    No authentication required.
    """
    client = ESXiClient(
        host=ESXI_TEST_HOST,
        username=ESXI_TEST_USERNAME,
        password=ESXI_TEST_PASSWORD
    )

    try:
        if not client.connect():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to connect to ESXi host {client.host}"
            )

        info = client.get_host_info()
        client.disconnect()
        return info

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve host info: {str(e)}"
        )

@router.get("/vms", response_model=List[Dict])
def get_all_vms():
    """
    TEST ENDPOINT: Get all VMs from ESXi host with power status.
    """
    client = ESXiClient(
        host=ESXI_TEST_HOST,
        username=ESXI_TEST_USERNAME,
        password=ESXI_TEST_PASSWORD
    )

    try:
        if not client.connect():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to connect to ESXi host {client.host}"
            )

        # Get all VMs (not just templates)
        from pyVmomi import vim
        vms = []
        container = client._content.viewManager.CreateContainerView(
            client._content.rootFolder, [vim.VirtualMachine], True
        )
        
        for vm in container.view:
            summary = vm.summary
            vm_data = {
                "name": vm.name,
                "power_state": summary.runtime.powerState,
                "guest_os": summary.config.guestFullName,
                "cpu_count": summary.config.numCpu,
                "memory_mb": summary.config.memorySizeMB,
                "ip_address": summary.guest.ipAddress if summary.guest else None,
                "host": client.host,
                "is_template": summary.config.template
            }
            vms.append(vm_data)
        
        container.Destroy()
        client.disconnect()
        return vms

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve VMs: {str(e)}"
        )

@router.get("/datastores", response_model=List[Dict])
def get_datastores():
    """
    TEST ENDPOINT: Get all datastores with capacity info.
    """
    client = ESXiClient(
        host=ESXI_TEST_HOST,
        username=ESXI_TEST_USERNAME,
        password=ESXI_TEST_PASSWORD
    )

    try:
        if not client.connect():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to connect to ESXi host {client.host}"
            )

        from pyVmomi import vim
        datastores = []
        container = client._content.viewManager.CreateContainerView(
            client._content.rootFolder, [vim.Datastore], True
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
                "host": client.host
            }
            datastores.append(ds_data)
        
        container.Destroy()
        client.disconnect()
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
    client = ESXiClient(
        host=ESXI_TEST_HOST,
        username=ESXI_TEST_USERNAME,
        password=ESXI_TEST_PASSWORD
    )

    try:
        if not client.connect():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to connect to ESXi host {client.host}"
            )

        from pyVmomi import vim
        container = client._content.viewManager.CreateContainerView(
            client._content.rootFolder, [vim.VirtualMachine], True
        )
        
        vm_data = None
        for vm in container.view:
            if vm.name == vm_name:
                summary = vm.summary
                vm_data = {
                    "name": vm.name,
                    "power_state": summary.runtime.powerState,
                    "guest_os": summary.config.guestFullName,
                    "cpu_count": summary.config.numCpu,
                    "memory_mb": summary.config.memorySizeMB,
                    "disk_gb": sum(
                        device.capacityInKB / (1024**2) 
                        for device in vm.config.hardware.device 
                        if isinstance(device, vim.vm.device.VirtualDisk)
                    ) if vm.config else 0,
                    "ip_address": summary.guest.ipAddress if summary.guest else None,
                    "host": client.host,
                    "path": summary.config.vmPathName
                }
                break
        
        container.Destroy()
        client.disconnect()
        
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

@router.post("/vms/{vm_name}/power")
def toggle_vm_power(vm_name: str, action: str = "toggle"):
    """
    TEST ENDPOINT: Power on/off VM. Action: 'on', 'off', 'toggle'.
    """
    client = ESXiClient(
        host=ESXI_TEST_HOST,
        username=ESXI_TEST_USERNAME,
        password=ESXI_TEST_PASSWORD
    )

    try:
        if not client.connect():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to connect to ESXi host {client.host}"
            )

        from pyVmomi import vim
        container = client._content.viewManager.CreateContainerView(
            client._content.rootFolder, [vim.VirtualMachine], True
        )
        
        vm_obj = None
        for vm in container.view:
            if vm.name == vm_name:
                vm_obj = vm
                break
        
        container.Destroy()
        
        if not vm_obj:
            raise HTTPException(status_code=404, detail=f"VM '{vm_name}' not found")
        
        current_state = vm_obj.summary.runtime.powerState
        
        if action == "on" and current_state != vim.VirtualMachinePowerState.poweredOn:
            task = vm_obj.PowerOn()
            result = "powering_on"
        elif action == "off" and current_state != vim.VirtualMachinePowerState.poweredOff:
            task = vm_obj.PowerOff()
            result = "powering_off"
        elif action == "toggle":
            if current_state == vim.VirtualMachinePowerState.poweredOn:
                task = vm_obj.PowerOff()
                result = "powering_off"
            else:
                task = vm_obj.PowerOn()
                result = "powering_on"
        else:
            result = f"no_action_needed (current: {current_state})"
        
        client.disconnect()
        return {
            "vm_name": vm_name,
            "action": action,
            "result": result,
            "previous_state": current_state
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to power VM: {str(e)}"
        )