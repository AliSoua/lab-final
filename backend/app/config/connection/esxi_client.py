# app/config/connection/esxi_client.py
from pyVim.connect import SmartConnect, Disconnect
from pyVmomi import vim
import ssl
import logging
from typing import List, Dict, Optional
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class ESXiClient:
    """Client for direct ESXi host connection."""

    def __init__(self, host: str, username: str, password: str, port: int = 443):
        self.host = host
        self.username = username
        self.password = password
        self.port = port
        self._service_instance = None
        self._content = None

    def connect(self) -> bool:
        """Connect to ESXi host."""
        try:
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE

            self._service_instance = SmartConnect(
                host=self.host,
                user=self.username,
                pwd=self.password,
                port=self.port,
                sslContext=context
            )

            self._content = self._service_instance.RetrieveContent()
            logger.info(f"Connected to ESXi host: {self.host}")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to ESXi {self.host}: {e}")
            return False

    def disconnect(self):
        """Disconnect from ESXi."""
        if self._service_instance:
            Disconnect(self._service_instance)
            logger.info(f"Disconnected from ESXi: {self.host}")

    def health_check(self) -> Dict:
        """Check ESXi connection health."""
        if not self._service_instance:
            return {"status": "disconnected", "connected": False, "host": self.host}

        try:
            self._service_instance.CurrentTime()
            return {
                "status": "connected",
                "connected": True,
                "host": self.host,
                "api_version": self._content.about.apiVersion,
                "esxi_version": self._content.about.fullName
            }
        except Exception as e:
            logger.error(f"ESXi health check failed for {self.host}: {e}")
            return {"status": "error", "connected": False, "host": self.host, "error": str(e)}

    def get_templates(self) -> List[Dict]:
        """Get all VM templates on this ESXi host."""
        if not self._service_instance:
            raise RuntimeError("Not connected to ESXi")

        templates = []
        container = self._content.viewManager.CreateContainerView(
            self._content.rootFolder, [vim.VirtualMachine], True
        )

        try:
            for vm in container.view:
                if vm.config and vm.config.template:
                    templates.append({
                        "name": vm.name,
                        "guest_os": vm.config.guestFullName,
                        "cpu_count": vm.config.hardware.numCPU,
                        "memory_mb": vm.config.hardware.memoryMB,
                        "path": vm.config.files.vmPathName,
                        "host": self.host
                    })
        finally:
            container.Destroy()

        return templates

    def get_vms(self) -> List[Dict]:
        """Get all VMs with power status."""
        if not self._service_instance:
            raise RuntimeError("Not connected to ESXi")

        vms = []
        container = self._content.viewManager.CreateContainerView(
            self._content.rootFolder, [vim.VirtualMachine], True
        )

        try:
            for vm in container.view:
                summary = vm.summary
                vms.append({
                    "name": vm.name,
                    "power_state": str(summary.runtime.powerState),
                    "guest_os": summary.config.guestFullName,
                    "cpu_count": summary.config.numCpu,
                    "memory_mb": summary.config.memorySizeMB,
                    "ip_address": summary.guest.ipAddress if summary.guest else None,
                    "is_template": summary.config.template,
                    "host": self.host
                })
        finally:
            container.Destroy()

        return vms

    def get_host_info(self) -> Dict:
        """Get ESXi host information."""
        if not self._service_instance:
            raise RuntimeError("Not connected to ESXi")

        host_system = None
        container = self._content.viewManager.CreateContainerView(
            self._content.rootFolder, [vim.HostSystem], True
        )

        try:
            for host in container.view:
                host_system = host
                break
        finally:
            container.Destroy()

        if not host_system:
            return {}

        hardware = host_system.hardware
        config = host_system.config

        return {
            "name": host_system.name,
            "model": hardware.systemInfo.model if hardware else None,
            "cpu_cores": hardware.cpuInfo.numCpuCores if hardware else 0,
            "memory_gb": round(hardware.memorySize / (1024 ** 3), 2) if hardware else 0,
            "esxi_version": config.product.version if config and config.product else None,
            "connection_state": str(host_system.runtime.connectionState),
            "power_state": str(host_system.runtime.powerState)
        }


@contextmanager
def esxi_connection(host: str, username: str, password: str):
    """Context manager for ESXi connections."""
    client = ESXiClient(host, username, password)
    try:
        if client.connect():
            yield client
        else:
            yield None
    finally:
        client.disconnect()