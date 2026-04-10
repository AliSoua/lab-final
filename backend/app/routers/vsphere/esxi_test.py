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
def get_vm_details(
    vm_name: str,
    include_cloud_init: bool = False,
    include_snapshots: bool = False,
    include_performance: bool = False
):
    """
    TEST ENDPOINT: Get detailed info for specific VM.
    
    Query params:
    - include_cloud_init: Include cloud-init/customization settings
    - include_snapshots: Include snapshot tree
    - include_performance: Include real-time performance metrics
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
                config = vm.config
                runtime = vm.runtime
                guest = vm.guest
                
                # Basic info
                vm_data = {
                    "name": vm.name,
                    "instance_uuid": config.instanceUuid if config else None,
                    "power_state": summary.runtime.powerState,
                    "host": client.host,
                    
                    # Guest OS Info
                    "guest_os": {
                        "configured": summary.config.guestFullName,
                        "running": guest.guestFullName if guest else None,
                        "family": guest.guestFamily if guest else None,
                        "hostname": guest.hostName if guest else None,
                        "tools_status": str(guest.toolsStatus) if guest else None,
                        "tools_version": guest.toolsVersion if guest else None,
                    },
                    
                    # Resource Configuration
                    "resources": {
                        "cpu": {
                            "count": summary.config.numCpu,
                            "cores_per_socket": summary.config.numCoresPerSocket if hasattr(summary.config, 'numCoresPerSocket') else summary.config.numCpu,
                            "mhz": summary.runtime.maxCpuUsage if runtime else 0,
                            "reservation": config.cpuAllocation.reservation if config and config.cpuAllocation else 0,
                            "limit": config.cpuAllocation.limit if config and config.cpuAllocation else -1,
                        },
                        "memory": {
                            "configured_mb": summary.config.memorySizeMB,
                            "used_mb": guest.guestMemoryUsage if guest else 0,
                            "reservation": config.memoryAllocation.reservation if config and config.memoryAllocation else 0,
                            "limit": config.memoryAllocation.limit if config and config.memoryAllocation else -1,
                            "ballooned_mb": summary.quickStats.balloonedMemory if hasattr(summary.quickStats, 'balloonedMemory') else 0,
                            "swapped_mb": summary.quickStats.swappedMemory if hasattr(summary.quickStats, 'swappedMemory') else 0,
                        }
                    },
                    
                    # Storage
                    "storage": {
                        "path": summary.config.vmPathName,
                        "disks": [],
                        "total_provisioned_gb": 0,
                        "total_used_gb": 0,
                    },
                    
                    # Networks
                    "networks": [],
                    
                    # Connection Info
                    "connection": {
                        "console_ip": client.host,
                        "guest_ip": guest.ipAddress if guest else None,
                        "uptime_seconds": summary.quickStats.uptimeSeconds if hasattr(summary.quickStats, 'uptimeSeconds') else 0,
                    },
                    
                    # Metadata
                    "annotation": config.annotation if config and config.annotation else None,
                    "version": config.version if config else None,
                    "hardware_version": config.hardware.version if config and config.hardware else None,
                    "is_template": config.template if config else False,
                    "change_version": config.changeVersion if config else None,
                }
                
                # Detailed Disk Info
                if config and config.hardware:
                    for device in config.hardware.device:
                        if isinstance(device, vim.vm.device.VirtualDisk):
                            disk_info = {
                                "label": device.deviceInfo.label,
                                "capacity_gb": round(device.capacityInKB / (1024**2), 2),
                                "file_name": device.backing.fileName if hasattr(device.backing, 'fileName') else "Unknown",
                                "thin_provisioned": getattr(device.backing, 'thinProvisioned', False),
                                "disk_mode": device.backing.diskMode if hasattr(device.backing, 'diskMode') else "persistent",
                                "datastore": device.backing.fileName.split(']')[0].strip('[') if hasattr(device.backing, 'fileName') else None,
                            }
                            vm_data["storage"]["disks"].append(disk_info)
                            vm_data["storage"]["total_provisioned_gb"] += disk_info["capacity_gb"]
                
                # Network Adapters
                if config and config.hardware:
                    for device in config.hardware.device:
                        if isinstance(device, vim.vm.device.VirtualEthernetCard):
                            net_info = {
                                "label": device.deviceInfo.label,
                                "mac_address": device.macAddress,
                                "connected": device.connectable.connected if device.connectable else False,
                                "start_connected": device.connectable.startConnected if device.connectable else False,
                                "adapter_type": type(device).__name__.replace('Virtual', '').replace('Card', ''),
                                "network": None,
                                "ip_addresses": []
                            }
                            
                            # Get network name
                            if device.backing and hasattr(device.backing, 'network'):
                                try:
                                    net_info["network"] = device.backing.network.name
                                except:
                                    net_info["network"] = str(device.backing.network)
                            
                            # Match with guest network info
                            if guest and guest.net:
                                for nic in guest.net:
                                    if nic.macAddress == device.macAddress:
                                        net_info["ip_addresses"] = nic.ipAddress if nic.ipAddress else []
                                        net_info["connected"] = nic.connected
                            
                            vm_data["networks"].append(net_info)
                
                # Cloud-init / Customization Settings
                if include_cloud_init and config and config.vAppConfig and config.vAppConfig.property:
                    cloud_init_props = []
                    for prop in config.vAppConfig.property:
                        if prop.id and ('cloud-init' in prop.id.lower() or 'user-data' in prop.id.lower() or 'hostname' in prop.id.lower()):
                            cloud_init_props.append({
                                "key": prop.id,
                                "label": prop.label,
                                "value": prop.value if hasattr(prop, 'value') else None,
                                "type": prop.type,
                            })
                    vm_data["cloud_init"] = cloud_init_props
                
                # ExtraConfig (includes cloud-init, guestinfo, etc.)
                if include_cloud_init and config and config.extraConfig:
                    extra_config = {}
                    for opt in config.extraConfig:
                        key = opt.key
                        if any(x in key for x in ['guestinfo', 'cloud-init', 'vcloud', 'guestosinfo']):
                            extra_config[key] = opt.value
                    if extra_config:
                        vm_data["extra_config"] = extra_config
                
                # Snapshots
                if include_snapshots and vm.snapshot:
                    def snapshot_to_dict(snap):
                        data = {
                            "name": snap.name,
                            "description": snap.description,
                            "created": str(snap.createTime),
                            "state": str(snap.state),
                            "quiesced": snap.quiesced,
                            "memory": snap.memory,
                        }
                        if snap.childSnapshotList:
                            data["children"] = [snapshot_to_dict(child) for child in snap.childSnapshotList]
                        return data
                    
                    vm_data["snapshots"] = {
                        "current": vm.snapshot.currentSnapshot.name if vm.snapshot.currentSnapshot else None,
                        "root_snapshots": [snapshot_to_dict(root) for root in vm.snapshot.rootSnapshotList]
                    }
                
                # Performance Metrics (if requested and available)
                if include_performance and runtime:
                    perf_manager = client._content.perfManager
                    # Get real-time metrics if available
                    try:
                        vm_data["performance"] = {
                            "overall_cpu_usage_mhz": summary.quickStats.overallCpuUsage if hasattr(summary.quickStats, 'overallCpuUsage') else 0,
                            "overall_memory_usage_mb": summary.quickStats.guestMemoryUsage if hasattr(summary.quickStats, 'guestMemoryUsage') else 0,
                            "host_memory_usage_mb": summary.quickStats.hostMemoryUsage if hasattr(summary.quickStats, 'hostMemoryUsage') else 0,
                            "compressed_memory_kb": summary.quickStats.compressedMemory if hasattr(summary.quickStats, 'compressedMemory') else 0,
                            "consumed_overhead_mb": summary.quickStats.consumedOverheadMemory if hasattr(summary.quickStats, 'consumedOverheadMemory') else 0,
                            "ft_latency": summary.quickStats.ftLatencyStatus if hasattr(summary.quickStats, 'ftLatencyStatus') else None,
                        }
                    except:
                        pass
                
                # Boot Options
                if config and config.bootOptions:
                    vm_data["boot"] = {
                        "boot_delay": config.bootOptions.bootDelay,
                        "enter_bios": config.bootOptions.enterBIOSSetup,
                        "boot_retry_enabled": config.bootOptions.bootRetryEnabled,
                        "boot_retry_delay": config.bootOptions.bootRetryDelay,
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