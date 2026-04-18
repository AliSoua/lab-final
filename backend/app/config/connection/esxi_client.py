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
                try:
                    if not vm.config or not vm.config.template:
                        continue

                    hardware = vm.config.hardware
                    files = vm.config.files

                    templates.append({
                        "uuid": vm.config.uuid,                     # Canonical ID
                        "name": vm.name,
                        "guest_os": vm.config.guestFullName,
                        "cpu_count": getattr(hardware, "numCPU", 0) if hardware else 0,
                        "memory_mb": getattr(hardware, "memoryMB", 0) if hardware else 0,
                        "path": getattr(files, "vmPathName", None) if files else None,
                        "host": self.host,
                    })
                except Exception as e:
                    # Log and skip individual bad VMs instead of failing the whole host
                    vm_name = getattr(vm, "name", "unknown")
                    logger.warning(f"Skipping template '{vm_name}' on {self.host}: {e}")
                    continue
        finally:
            container.Destroy()

        return templates

    def get_vms(self) -> List[Dict]:
        """Get all non-template VMs with power status."""
        if not self._service_instance:
            raise RuntimeError("Not connected to ESXi")

        vms = []
        container = self._content.viewManager.CreateContainerView(
            self._content.rootFolder, [vim.VirtualMachine], True
        )

        try:
            for vm in container.view:
                try:
                    summary = vm.summary

                    # Exclude templates — they belong to /templates
                    if summary.config and summary.config.template:
                        continue

                    guest = summary.guest
                    runtime = summary.runtime
                    config = summary.config

                    vms.append({
                        "uuid": vm.config.uuid if vm.config else None,
                        "name": vm.name,
                        "power_state": str(runtime.powerState) if runtime else "unknown",
                        "guest_os": config.guestFullName if config else None,
                        "cpu_count": getattr(config, "numCpu", 0) if config else 0,
                        "memory_mb": getattr(config, "memorySizeMB", 0) if config else 0,
                        "ip_address": guest.ipAddress if guest else None,
                        "tools_status": str(guest.toolsStatus) if guest else "toolsNotInstalled",
                        "is_template": summary.config.template if summary.config else False,
                        "host": self.host,
                    })
                except Exception as e:
                    vm_name = getattr(vm, "name", "unknown")
                    logger.warning(f"Skipping VM '{vm_name}' on {self.host}: {e}")
                    continue
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
        runtime = host_system.runtime
        summary = host_system.summary

        # CPU model from the first package description
        cpu_model = None
        if hardware and hardware.cpuPkg:
            cpu_model = hardware.cpuPkg[0].description

        # VM count directly from the host reference
        vm_count = len(host_system.vm) if host_system.vm else 0

        # Overall health status: gray, green, yellow, red
        overall_status = str(summary.overallStatus) if summary else "gray"

        return {
            "name": host_system.name,
            "model": hardware.systemInfo.model if hardware else None,
            "vendor": hardware.systemInfo.vendor if hardware else None,
            "cpu_model": cpu_model,
            "cpu_cores": hardware.cpuInfo.numCpuCores if hardware else 0,
            "cpu_threads": hardware.cpuInfo.numCpuThreads if hardware else 0,
            "cpu_packages": hardware.cpuInfo.numCpuPackages if hardware else 0,
            "cpu_mhz": round(hardware.cpuInfo.hz / (10 ** 6), 2) if hardware and hardware.cpuInfo else 0,
            "memory_gb": round(hardware.memorySize / (1024 ** 3), 2) if hardware else 0,
            "esxi_version": config.product.version if config and config.product else None,
            "esxi_build": config.product.build if config and config.product else None,
            "license_name": config.product.name if config and config.product else None,
            "connection_state": str(runtime.connectionState),
            "power_state": str(runtime.powerState),
            "in_maintenance_mode": runtime.inMaintenanceMode if runtime else False,
            "overall_status": overall_status,
            "vm_count": vm_count,
            "boot_time": runtime.bootTime.isoformat() if runtime.bootTime else None,
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