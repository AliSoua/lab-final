# app/config/connection/vcenter_client.py
import atexit
from pyVim.connect import SmartConnect, Disconnect
from pyVmomi import vim
import ssl
import logging
from typing import List, Dict, Optional
from app.config.connection.vault_client import read_credentials

logger = logging.getLogger(__name__)

class VCenterClient:
    def __init__(self):
        self._service_instance = None
        self._connected = False
        self._content = None
    
    def connect(self, host: str, username: str, password: str, port: int = 443) -> bool:
        """Connect to vCenter Server."""
        try:
            # Disable SSL verification for lab (enable in production)
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            
            self._service_instance = SmartConnect(
                host=host,
                user=username,
                pwd=password,
                port=port,
                sslContext=context
            )
            
            atexit.register(Disconnect, self._service_instance)
            self._content = self._service_instance.RetrieveContent()
            self._connected = True
            logger.info(f"Connected to vCenter: {host}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to vCenter {host}: {e}")
            self._connected = False
            return False
    
    def disconnect(self):
        """Disconnect from vCenter."""
        if self._service_instance:
            Disconnect(self._service_instance)
            self._connected = False
            logger.info("Disconnected from vCenter")
    
    def health_check(self) -> Dict:
        """Check vCenter connection health."""
        if not self._connected or not self._service_instance:
            return {"status": "disconnected", "connected": False}
        
        try:
            # Try to retrieve content to verify connection
            self._service_instance.CurrentTime()
            return {
                "status": "connected",
                "connected": True,
                "api_version": self._service_instance.content.about.apiVersion,
                "vcenter_name": self._service_instance.content.about.fullName
            }
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {"status": "error", "connected": False, "error": str(e)}
    
    def get_all_hosts(self) -> List[Dict]:
        """Get all ESXi hosts managed by vCenter."""
        if not self._connected:
            raise RuntimeError("Not connected to vCenter")
        
        hosts = []
        container = self._content.viewManager.CreateContainerView(
            self._content.rootFolder, [vim.HostSystem], True
        )
        
        for host in container.view:
            host_data = {
                "name": host.name,
                "connection_state": host.runtime.connectionState,
                "power_state": host.runtime.powerState,
                "in_maintenance_mode": host.runtime.inMaintenanceMode,
                "hardware_model": host.hardware.systemInfo.model if host.hardware else None,
                "cpu_cores": host.hardware.cpuInfo.numCpuCores if host.hardware else 0,
                "memory_gb": round(host.hardware.memorySize / (1024**3), 2) if host.hardware else 0,
                "esxi_version": host.config.product.version if host.config else None,
                "datastores": [ds.name for ds in host.datastore],
                "networks": [net.name for net in host.network]
            }
            hosts.append(host_data)
        
        container.Destroy()
        return hosts
    
    def get_all_templates(self) -> List[Dict]:
        """Get all VM templates from vCenter."""
        if not self._connected:
            raise RuntimeError("Not connected to vCenter")
        
        templates = []
        container = self._content.viewManager.CreateContainerView(
            self._content.rootFolder, [vim.VirtualMachine], True
        )
        
        for vm in container.view:
            if vm.config and vm.config.template:
                template_data = {
                    "name": vm.name,
                    "guest_os": vm.config.guestFullName,
                    "cpu_count": vm.config.hardware.numCPU,
                    "memory_mb": vm.config.hardware.memoryMB,
                    "disk_gb": sum(
                        device.capacityInKB / (1024**2) 
                        for device in vm.config.hardware.device 
                        if isinstance(device, vim.vm.device.VirtualDisk)
                    ),
                    "host": vm.runtime.host.name if vm.runtime.host else None,
                    "path": vm.config.files.vmPathName
                }
                templates.append(template_data)
        
        container.Destroy()
        return templates

# Global instance (singleton)
vcenter_client = VCenterClient()