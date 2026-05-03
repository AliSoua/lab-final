# app/config/connection/vcenter_client.py
from pyVim.connect import SmartConnect, Disconnect
from pyVmomi import vim
import ssl
import logging
from typing import List, Dict, Optional
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class VCenterClient:
    """Client for vCenter Server connection."""

    def __init__(self, host: str, username: str, password: str, port: int = 443):
        self.host = host
        self.username = username
        self.password = password
        self.port = port
        self._service_instance = None
        self._content = None

    def connect(self) -> bool:
        """Connect to vCenter Server."""
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
            logger.info(f"Connected to vCenter: {self.host}")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to vCenter {self.host}: {e}")
            return False

    def disconnect(self):
        """Disconnect from vCenter."""
        if self._service_instance:
            Disconnect(self._service_instance)
            logger.info(f"Disconnected from vCenter: {self.host}")

    def health_check(self) -> Dict:
        """Check vCenter connection health."""
        if not self._service_instance:
            return {"status": "disconnected", "connected": False, "host": self.host}

        try:
            self._service_instance.CurrentTime()
            return {
                "status": "connected",
                "connected": True,
                "host": self.host,
                "api_version": self._content.about.apiVersion,
                "vcenter_version": self._content.about.fullName,
                "instance_uuid": self._content.about.instanceUuid,
            }
        except Exception as e:
            logger.error(f"vCenter health check failed for {self.host}: {e}")
            return {"status": "error", "connected": False, "host": self.host, "error": str(e)}

    def get_datacenters(self) -> List[Dict]:
        """Get all datacenters in vCenter."""
        if not self._service_instance:
            raise RuntimeError("Not connected to vCenter")

        datacenters = []
        container = self._content.viewManager.CreateContainerView(
            self._content.rootFolder, [vim.Datacenter], True
        )

        try:
            for dc in container.view:
                try:
                    datacenters.append({
                        "name": dc.name,
                        "vm_folder": dc.vmFolder.name if dc.vmFolder else None,
                        "host_folder": dc.hostFolder.name if dc.hostFolder else None,
                        "datastore_folder": dc.datastoreFolder.name if dc.datastoreFolder else None,
                        "network_folder": dc.networkFolder.name if dc.networkFolder else None,
                    })
                except Exception as e:
                    dc_name = getattr(dc, "name", "unknown")
                    logger.warning(f"Skipping datacenter '{dc_name}' on {self.host}: {e}")
                    continue
        finally:
            container.Destroy()

        return datacenters

    def get_clusters(self) -> List[Dict]:
        """Get all clusters in vCenter."""
        if not self._service_instance:
            raise RuntimeError("Not connected to vCenter")

        clusters = []
        container = self._content.viewManager.CreateContainerView(
            self._content.rootFolder, [vim.ClusterComputeResource], True
        )

        try:
            for cluster in container.view:
                try:
                    summary = cluster.summary
                    config = cluster.configuration

                    clusters.append({
                        "name": cluster.name,
                        "datacenter": self._get_parent_datacenter_name(cluster),
                        "total_cpu_mhz": summary.totalCpu if summary else 0,
                        "total_memory_mb": summary.totalMemory // (1024 * 1024) if summary else 0,
                        "num_hosts": summary.numHosts if summary else 0,
                        "num_effective_hosts": summary.numEffectiveHosts if summary else 0,
                        "overall_status": str(summary.overallStatus) if summary else "gray",
                        "drs_enabled": config.drsConfig.enabled if config and config.drsConfig else False,
                        "ha_enabled": config.dasConfig.enabled if config and config.dasConfig else False,
                    })
                except Exception as e:
                    cluster_name = getattr(cluster, "name", "unknown")
                    logger.warning(f"Skipping cluster '{cluster_name}' on {self.host}: {e}")
                    continue
        finally:
            container.Destroy()

        return clusters

    def get_hosts(self) -> List[Dict]:
        """Get all ESXi hosts managed by vCenter."""
        if not self._service_instance:
            raise RuntimeError("Not connected to vCenter")

        hosts = []
        container = self._content.viewManager.CreateContainerView(
            self._content.rootFolder, [vim.HostSystem], True
        )

        try:
            for host in container.view:
                try:
                    hardware = host.hardware
                    config = host.config
                    runtime = host.runtime
                    summary = host.summary

                    cpu_model = None
                    if hardware and hardware.cpuPkg:
                        cpu_model = hardware.cpuPkg[0].description

                    hosts.append({
                        "name": host.name,
                        "datacenter": self._get_parent_datacenter_name(host),
                        "cluster": self._get_parent_cluster_name(host),
                        "model": hardware.systemInfo.model if hardware else None,
                        "vendor": hardware.systemInfo.vendor if hardware else None,
                        "cpu_model": cpu_model,
                        "cpu_cores": hardware.cpuInfo.numCpuCores if hardware else 0,
                        "cpu_threads": hardware.cpuInfo.numCpuThreads if hardware else 0,
                        "cpu_mhz": round(hardware.cpuInfo.hz / (10 ** 6), 2) if hardware and hardware.cpuInfo else 0,
                        "memory_gb": round(hardware.memorySize / (1024 ** 3), 2) if hardware else 0,
                        "esxi_version": config.product.version if config and config.product else None,
                        "esxi_build": config.product.build if config and config.product else None,
                        "connection_state": str(runtime.connectionState),
                        "power_state": str(runtime.powerState),
                        "in_maintenance_mode": runtime.inMaintenanceMode if runtime else False,
                        "overall_status": str(summary.overallStatus) if summary else "gray",
                        "vm_count": len(host.vm) if host.vm else 0,
                        "boot_time": runtime.bootTime.isoformat() if runtime.bootTime else None,
                    })
                except Exception as e:
                    host_name = getattr(host, "name", "unknown")
                    logger.warning(f"Skipping host '{host_name}' on {self.host}: {e}")
                    continue
        finally:
            container.Destroy()

        return hosts

    def get_templates(self) -> List[Dict]:
        """Get all VM templates across vCenter."""
        if not self._service_instance:
            raise RuntimeError("Not connected to vCenter")

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
                        "uuid": vm.config.uuid,
                        "name": vm.name,
                        "guest_os": vm.config.guestFullName,
                        "cpu_count": getattr(hardware, "numCPU", 0) if hardware else 0,
                        "memory_mb": getattr(hardware, "memoryMB", 0) if hardware else 0,
                        "path": getattr(files, "vmPathName", None) if files else None,
                        "datacenter": self._get_parent_datacenter_name(vm),
                        "cluster": self._get_parent_cluster_name(vm),
                        "host": vm.runtime.host.name if vm.runtime and vm.runtime.host else None,
                    })
                except Exception as e:
                    vm_name = getattr(vm, "name", "unknown")
                    logger.warning(f"Skipping template '{vm_name}' on {self.host}: {e}")
                    continue
        finally:
            container.Destroy()

        return templates


    def get_vms(self) -> List[Dict]:
        """Get all non-template VMs across vCenter."""
        if not self._service_instance:
            raise RuntimeError("Not connected to vCenter")

        vms = []
        container = self._content.viewManager.CreateContainerView(
            self._content.rootFolder, [vim.VirtualMachine], True
        )

        try:
            for vm in container.view:
                try:
                    config = vm.config
                    if not config or config.template:
                        continue

                    vms.append({
                        "uuid": config.uuid,
                        "name": vm.name,
                        "guest_os": config.guestFullName,
                        "cpu_count": getattr(config.hardware, "numCPU", 0) if config.hardware else 0,
                        "memory_mb": getattr(config.hardware, "memoryMB", 0) if config.hardware else 0,
                        "path": getattr(config.files, "vmPathName", None) if config.files else None,
                        "datacenter": self._get_parent_datacenter_name(vm),
                        "cluster": self._get_parent_cluster_name(vm),
                        "host": vm.runtime.host.name if vm.runtime and vm.runtime.host else None,
                        "has_snapshots": vm.snapshot is not None,
                    })
                except Exception as e:
                    vm_name = getattr(vm, "name", "unknown")
                    logger.warning(f"Skipping VM '{vm_name}' on {self.host}: {e}")
                    continue
        finally:
            container.Destroy()

        return vms

    def get_snapshots(self, vm_uuid: str) -> List[Dict]:
        """Get all snapshots for a VM by UUID. Returns list of {name, moid, description, create_time, path}."""
        if not self._service_instance:
            raise RuntimeError("Not connected to vCenter")

        vm = self.find_vm_by_uuid(vm_uuid)
        if not vm:
            raise ValueError(f"VM with UUID {vm_uuid} not found on {self.host}")
        if not vm.snapshot:
            return []

        snapshots = []

        def traverse(node, parent_path=""):
            current_path = f"{parent_path}/{node.name}" if parent_path else node.name
            snapshots.append({
                "name": node.name,
                "moid": node.snapshot._moId,
                "description": node.description or "",
                "create_time": node.createTime.isoformat() if node.createTime else None,
                "path": current_path,
            })
            for child in node.childSnapshotList:
                traverse(child, current_path)

        for root in vm.snapshot.rootSnapshotList:
            traverse(root)

        return snapshots


    def _get_parent_host_name(self, entity) -> Optional[str]:
        """Walk up the parent chain to find the ESXi host name."""
        current = entity
        while current:
            if isinstance(current, vim.HostSystem):
                return current.name
            if hasattr(current, 'parent'):
                current = current.parent
            else:
                break
        return None

    def get_datastores(self) -> List[Dict]:
        """Get all datastores in vCenter."""
        if not self._service_instance:
            raise RuntimeError("Not connected to vCenter")

        datastores = []
        container = self._content.viewManager.CreateContainerView(
            self._content.rootFolder, [vim.Datastore], True
        )

        try:
            for ds in container.view:
                try:
                    summary = ds.summary
                    info = ds.info

                    datastores.append({
                        "name": ds.name,
                        "datacenter": self._get_parent_datacenter_name(ds),
                        "type": summary.type,
                        "capacity_gb": round(summary.capacity / (1024 ** 3), 2) if summary.capacity else 0,
                        "free_space_gb": round(summary.freeSpace / (1024 ** 3), 2) if summary.freeSpace else 0,
                        "accessible": summary.accessible if summary else False,
                        "maintenance_mode": str(summary.maintenanceMode) if summary else None,
                        "url": summary.url if summary else None,
                    })
                except Exception as e:
                    ds_name = getattr(ds, "name", "unknown")
                    logger.warning(f"Skipping datastore '{ds_name}' on {self.host}: {e}")
                    continue
        finally:
            container.Destroy()

        return datastores

    def get_networks(self) -> List[Dict]:
        """Get all networks in vCenter."""
        if not self._service_instance:
            raise RuntimeError("Not connected to vCenter")

        networks = []
        container = self._content.viewManager.CreateContainerView(
            self._content.rootFolder, [vim.Network], True
        )

        try:
            for net in container.view:
                try:
                    networks.append({
                        "name": net.name,
                        "datacenter": self._get_parent_datacenter_name(net),
                        "accessible": True,
                    })
                except Exception as e:
                    net_name = getattr(net, "name", "unknown")
                    logger.warning(f"Skipping network '{net_name}' on {self.host}: {e}")
                    continue
        finally:
            container.Destroy()

        return networks

    def _get_parent_datacenter_name(self, entity) -> Optional[str]:
        """Walk up the parent chain to find the datacenter name."""
        current = entity
        while current:
            if isinstance(current, vim.Datacenter):
                return current.name
            if hasattr(current, 'parent'):
                current = current.parent
            else:
                break
        return None

    def _get_parent_cluster_name(self, entity) -> Optional[str]:
        """Walk up the parent chain to find the cluster name."""
        current = entity
        while current:
            if isinstance(current, vim.ClusterComputeResource):
                return current.name
            if isinstance(current, vim.ResourcePool) and current.name != "Resources":
                # Skip default resource pool names
                pass
            if hasattr(current, 'parent'):
                current = current.parent
            else:
                break
        return None

    # ------------------------------------------------------------------
    # VM Lifecycle (add inside VCenterClient class)
    # ------------------------------------------------------------------

    def find_vm_by_uuid(self, uuid: str):
        """Find a VM or template by its config.uuid."""
        if not self._service_instance:
            raise RuntimeError("Not connected to vCenter")

        container = self._content.viewManager.CreateContainerView(
            self._content.rootFolder, [vim.VirtualMachine], True
        )
        try:
            for vm in container.view:
                if vm.config and vm.config.uuid == uuid:
                    return vm
            return None
        finally:
            container.Destroy()

    def _wait_for_task(self, task, timeout: int = 300):
        """Block until a vCenter task completes or fails."""
        import time

        start = time.time()
        while task.info.state not in [
            vim.TaskInfo.State.success,
            vim.TaskInfo.State.error,
        ]:
            if time.time() - start > timeout:
                raise TimeoutError(f"vCenter task timed out after {timeout}s")
            time.sleep(1)

        if task.info.state == vim.TaskInfo.State.error:
            raise RuntimeError(f"vCenter task failed: {task.info.error}")
        return task.info.result

    def clone_vm(
        self,
        template_uuid: str,
        new_vm_name: str,
        datacenter_name: Optional[str] = None,
        cluster_name: Optional[str] = None,
    ) -> dict:
        """Clone a VM/template into the target datacenter/cluster."""
        template = self.find_vm_by_uuid(template_uuid)
        if not template:
            raise ValueError(
                f"Template with UUID {template_uuid} not found on {self.host}"
            )

        # Resolve datacenter
        datacenter = None
        if datacenter_name:
            container = self._content.viewManager.CreateContainerView(
                self._content.rootFolder, [vim.Datacenter], True
            )
            try:
                for dc in container.view:
                    if dc.name == datacenter_name:
                        datacenter = dc
                        break
            finally:
                container.Destroy()
        else:
            datacenter = self._get_parent_datacenter_obj(template)

        if not datacenter:
            raise ValueError("Could not determine target datacenter")

        # Resolve resource pool
        resource_pool = None
        if cluster_name:
            container = self._content.viewManager.CreateContainerView(
                self._content.rootFolder, [vim.ClusterComputeResource], True
            )
            try:
                for cluster in container.view:
                    if cluster.name == cluster_name:
                        resource_pool = cluster.resourcePool
                        break
            finally:
                container.Destroy()
        else:
            for child in datacenter.hostFolder.childEntity:
                if isinstance(child, vim.ClusterComputeResource):
                    resource_pool = child.resourcePool
                    break
                elif isinstance(child, vim.Folder):
                    for sub in child.childEntity:
                        if isinstance(sub, vim.ClusterComputeResource):
                            resource_pool = sub.resourcePool
                            break

        if not resource_pool:
            resource_pool = template.resourcePool

        relocate_spec = vim.vm.RelocateSpec(pool=resource_pool)
        clone_spec = vim.vm.CloneSpec(location=relocate_spec, powerOn=False)

        folder = datacenter.vmFolder
        task = template.CloneVM_Task(
            folder=folder, name=new_vm_name, spec=clone_spec
        )
        new_vm = self._wait_for_task(task)

        return {
            "uuid": new_vm.config.uuid,
            "name": new_vm.name,
            "datacenter": datacenter.name,
        }

    def power_on_vm(self, vm_uuid: str) -> str:
        """Power on a VM by UUID. Returns the VM name."""
        vm = self.find_vm_by_uuid(vm_uuid)
        if not vm:
            raise ValueError(f"VM with UUID {vm_uuid} not found")
        task = vm.PowerOnVM_Task()
        self._wait_for_task(task)
        return vm.name

    def get_vm_power_state(self, vm_uuid: str) -> str:
        """Return current power state string."""
        vm = self.find_vm_by_uuid(vm_uuid)
        if not vm or not vm.runtime:
            return "unknown"
        return str(vm.runtime.powerState)

    def get_vm_ip(self, vm_uuid: str) -> Optional[str]:
        """Return guest IP if available, None if not ready."""
        vm = self.find_vm_by_uuid(vm_uuid)
        if not vm or not vm.guest:
            return None
        return vm.guest.ipAddress

    def get_vm_esxi_host(self, vm_uuid: str) -> Optional[str]:
        """
        Return the ESXi host name where the VM is currently running.
        Returns None if the VM is not found or host info is unavailable.
        """
        if not self._service_instance:
            raise RuntimeError("Not connected to vCenter")

        vm = self.find_vm_by_uuid(vm_uuid)
        if not vm:
            return None

        # runtime.host is a ManagedObjectReference to HostSystem
        host_ref = vm.runtime.host
        if not host_ref:
            return None

        # host_ref.name is the ESXi hostname (FQDN or short name)
        return host_ref.name

    def _get_parent_datacenter_obj(self, entity):
        """Walk up parents and return the datacenter object."""
        current = entity
        while current:
            if isinstance(current, vim.Datacenter):
                return current
            if hasattr(current, "parent"):
                current = current.parent
            else:
                break
        return None

        
    def find_host_moid(self, host_name: str) -> Optional[str]:
        """Find ESXi host MOID by name (FQDN or short name)."""
        if not self._service_instance:
            raise RuntimeError("Not connected to vCenter")

        container = self._content.viewManager.CreateContainerView(
            self._content.rootFolder, [vim.HostSystem], True
        )
        try:
            for host in container.view:
                # Match exact, FQDN, or short name
                names = {host.name, host.name.split(".")[0]}
                if host_name in names or host_name.split(".")[0] in names:
                    return host._moId
            return None
        finally:
            container.Destroy()

    def find_snapshot_moid(self, vm_uuid: str, snapshot_name: str) -> Optional[str]:
        """Traverse VM snapshot tree to find MOID by name."""
        vm = self.find_vm_by_uuid(vm_uuid)
        if not vm or not vm.snapshot:
            return None

        def traverse(nodes):
            for node in nodes:
                if node.name == snapshot_name:
                    return node.snapshot._moId
                if node.childSnapshotList:
                    found = traverse(node.childSnapshotList)
                    if found:
                        return found
            return None

        return traverse(vm.snapshot.rootSnapshotList)

    def linked_clone(
        self,
        source_vm_uuid: str,
        snapshot_moid: str,
        esxi_host_moid: str,
        new_vm_name: str,
        resource_pool_moid: Optional[str] = None,
        datastore_moid: Optional[str] = None,
    ) -> dict:
        """
        Create a linked clone from a snapshot onto a specific ESXi host.
        """
        source_vm = self.find_vm_by_uuid(source_vm_uuid)
        if not source_vm:
            raise ValueError(f"Source VM {source_vm_uuid} not found on {self.host}")

        # Build relocate spec — pin to specific ESXi host
        # Use vim.HostSystem(moid, stub) instead of vim.ManagedObject()
        host_obj = vim.HostSystem(esxi_host_moid, self._service_instance._stub)
        relocate_spec = vim.vm.RelocateSpec(host=host_obj)

        # Use provided resource pool or fall back to source VM's pool
        if resource_pool_moid:
            pool_obj = vim.ResourcePool(resource_pool_moid, self._service_instance._stub)
            relocate_spec.pool = pool_obj
        else:
            relocate_spec.pool = source_vm.resourcePool

        if datastore_moid:
            ds_obj = vim.Datastore(datastore_moid, self._service_instance._stub)
            relocate_spec.datastore = ds_obj

        # Build clone spec with snapshot reference
        # snapshot must be a vim.VirtualMachineSnapshot object
        snapshot_obj = vim.VirtualMachineSnapshot(snapshot_moid, self._service_instance._stub)
        clone_spec = vim.vm.CloneSpec(
            location=relocate_spec,
            snapshot=snapshot_obj,
            linkedClone=True,
            powerOn=False,
        )

        # Clone into the same folder as source VM
        folder = source_vm.parent
        task = source_vm.CloneVM_Task(
            folder=folder,
            name=new_vm_name,
            spec=clone_spec,
        )

        new_vm = self._wait_for_task(task)

        return {
            "uuid": new_vm.config.uuid,
            "name": new_vm.name,
            "moid": new_vm._moId,
        }

@contextmanager
def vcenter_connection(host: str, username: str, password: str):
    """Context manager for vCenter connections."""
    client = VCenterClient(host, username, password)
    try:
        if client.connect():
            yield client
        else:
            yield None
    finally:
        client.disconnect()