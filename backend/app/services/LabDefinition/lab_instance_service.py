# app/services/LabDefinition/lab_instance_service.py
import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.LabDefinition.core import LabDefinition
from app.models.LabDefinition.LabInstance import LabInstance
from app.config.connection.vcenter_client import VCenterClient
from app.config.connection.vault_client import (
    read_credentials,
    list_admin_vcenters,
    client as vault_client,
)
import hvac

logger = logging.getLogger(__name__)


class LabInstanceService:
    def launch_instance(
        self,
        db: Session,
        lab_definition_id: uuid.UUID,
        trainee_id: uuid.UUID,
    ) -> LabInstance:
        """
        Simple launch flow:
        1. Validate lab def + VMs
        2. Discover which vCenter hosts the template
        3. Clone & power on
        4. Persist LabInstance
        """
        lab = (
            db.query(LabDefinition)
            .filter(LabDefinition.id == lab_definition_id)
            .first()
        )
        if not lab:
            raise ValueError("Lab definition not found")

        if not lab.vms:
            raise ValueError("Lab definition has no VMs configured")

        # Single-VM support only (router VM)
        vm_config = lab.vms[0]

        # Prevent duplicate active instances for this trainee+lab
        existing = (
            db.query(LabInstance)
            .filter(
                LabInstance.lab_definition_id == lab_definition_id,
                LabInstance.trainee_id == trainee_id,
                LabInstance.status.in_(["provisioning", "running"]),
            )
            .first()
        )
        if existing:
            raise ValueError(
                "An active instance of this lab already exists. "
                "Stop or terminate it before launching a new one."
            )

        # Discover vCenter credentials for this template UUID
        vcenter_creds = self._find_vcenter_for_template(vm_config.source_vm_id)
        if not vcenter_creds:
            raise ValueError(
                f"No vCenter found hosting template {vm_config.source_vm_id}. "
                "Ensure the template UUID is correct and a vCenter is registered."
            )

        client = VCenterClient(
            host=vcenter_creds["host"],
            username=vcenter_creds["username"],
            password=vcenter_creds["password"],
        )
        if not client.connect():
            raise RuntimeError(
                f"Failed to connect to vCenter {vcenter_creds['host']}"
            )

        try:
            new_vm_name = (
                f"{lab.slug}-{str(trainee_id)[:8]}-{uuid.uuid4().hex[:8]}"
            )   

            logger.info(
                "Cloning template %s → %s on vCenter %s for trainee %s",
                vm_config.source_vm_id,
                new_vm_name,
                vcenter_creds["host"],
                trainee_id,
            )

            clone_result = client.clone_vm(
                template_uuid=vm_config.source_vm_id,
                new_vm_name=new_vm_name,
            )

            vm_uuid = clone_result["uuid"]

            logger.info("Powering on VM %s (%s)", new_vm_name, vm_uuid)
            client.power_on_vm(vm_uuid)

            power_state = client.get_vm_power_state(vm_uuid)
            ip_address = client.get_vm_ip(vm_uuid)

            instance = LabInstance(
                lab_definition_id=lab_definition_id,
                trainee_id=trainee_id,
                vm_uuid=vm_uuid,
                vm_name=new_vm_name,
                vcenter_host=vcenter_creds["host"],
                status="running",
                power_state=power_state,
                ip_address=ip_address,
                started_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(hours=4),
            )
            db.add(instance)
            db.commit()
            db.refresh(instance)

            logger.info(
                "Lab instance %s launched for trainee %s",
                instance.id,
                trainee_id,
            )
            return instance

        finally:
            client.disconnect()

    def get_instance(
        self, db: Session, instance_id: uuid.UUID, trainee_id: uuid.UUID
    ) -> Optional[LabInstance]:
        return (
            db.query(LabInstance)
            .filter(
                LabInstance.id == instance_id,
                LabInstance.trainee_id == trainee_id,
            )
            .first()
        )

    def list_instances(
        self,
        db: Session,
        trainee_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[LabInstance], int]:
        query = db.query(LabInstance).filter(
            LabInstance.trainee_id == trainee_id
        )
        total = query.count()
        items = (
            query.order_by(desc(LabInstance.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    def stop_instance(
        self, db: Session, instance_id: uuid.UUID, trainee_id: uuid.UUID,
    ) -> LabInstance:
        instance = self.get_instance(db, instance_id, trainee_id)
        if not instance:
            raise ValueError("Instance not found")

        if instance.status in ["terminated", "stopped"]:
            return instance

        if instance.vm_uuid and instance.vcenter_host:
            creds = self._find_vcenter_credentials(instance.vcenter_host)
            if creds:
                client = VCenterClient(
                    host=creds["host"],
                    username=creds["username"],
                    password=creds["password"],
                )
                if client.connect():
                    try:
                        vm = client.find_vm_by_uuid(instance.vm_uuid)
                        if vm and str(vm.runtime.powerState) == "poweredOn":
                            task = vm.PowerOffVM_Task()
                            client._wait_for_task(task)
                        instance.power_state = "poweredOff"
                    except Exception as e:
                        logger.warning(
                            "Failed to power off VM %s: %s",
                            instance.vm_uuid,
                            e,
                        )
                    finally:
                        client.disconnect()

        instance.status = "stopped"
        instance.stopped_at = datetime.utcnow()
        db.commit()
        db.refresh(instance)
        return instance

    def terminate_instance(
        self, db: Session, instance_id: uuid.UUID, trainee_id: uuid.UUID,
    ) -> None:
        instance = self.get_instance(db, instance_id, trainee_id)
        if not instance:
            raise ValueError("Instance not found")

        if instance.vm_uuid and instance.vcenter_host:
            creds = self._find_vcenter_credentials(instance.vcenter_host)
            if creds:
                client = VCenterClient(
                    host=creds["host"],
                    username=creds["username"],
                    password=creds["password"],
                )
                if client.connect():
                    try:
                        vm = client.find_vm_by_uuid(instance.vm_uuid)
                        if vm:
                            if str(vm.runtime.powerState) == "poweredOn":
                                try:
                                    task = vm.PowerOffVM_Task()
                                    client._wait_for_task(task)
                                except Exception as e:
                                    logger.warning(
                                        "Power off before destroy failed: %s", e
                                    )
                            task = vm.Destroy_Task()
                            client._wait_for_task(task)
                            logger.info(
                                "Destroyed VM %s", instance.vm_uuid
                            )
                    except Exception as e:
                        logger.error(
                            "Failed to destroy VM %s: %s",
                            instance.vm_uuid,
                            e,
                        )
                    finally:
                        client.disconnect()

        instance.status = "terminated"
        instance.stopped_at = datetime.utcnow()
        db.commit()

    def refresh_instance_status(
        self, db: Session, instance_id: uuid.UUID, trainee_id: uuid.UUID,
    ) -> LabInstance:
        instance = self.get_instance(db, instance_id, trainee_id)
        if not instance or not instance.vm_uuid or not instance.vcenter_host:
            return instance

        creds = self._find_vcenter_credentials(instance.vcenter_host)
        if not creds:
            return instance

        client = VCenterClient(
            host=creds["host"],
            username=creds["username"],
            password=creds["password"],
        )
        if not client.connect():
            return instance

        try:
            instance.power_state = client.get_vm_power_state(
                instance.vm_uuid
            )
            instance.ip_address = client.get_vm_ip(instance.vm_uuid)
            db.commit()
            db.refresh(instance)
        except Exception as e:
            logger.warning(
                "Failed to refresh status for %s: %s", instance_id, e
            )
        finally:
            client.disconnect()

        return instance

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _find_vcenter_for_template(
        self, source_vm_id: str
    ) -> Optional[Dict[str, str]]:
        """Scan all admin vCenters to find the one hosting this template UUID."""
        admin_ids = self._list_all_admin_ids()
        if not admin_ids:
            return None

        for admin_id in admin_ids:
            try:
                hosts = list_admin_vcenters(admin_id)
                for host in hosts:
                    path = f"credentials/admin/{admin_id}/{host}"
                    try:
                        creds = read_credentials(path)
                        host_value = creds.get("host", "").strip().lower()
                        username = creds.get("username", "")
                        password = creds.get("password", "")
                        if not host_value:
                            continue

                        client = VCenterClient(
                            host=host_value,
                            username=username,
                            password=password,
                        )
                        if client.connect():
                            try:
                                vm = client.find_vm_by_uuid(source_vm_id)
                                if vm:
                                    return {
                                        "host": host_value,
                                        "username": username,
                                        "password": password,
                                    }
                            finally:
                                client.disconnect()
                    except Exception as e:
                        logger.debug(
                            "Skip vCenter %s for admin %s: %s",
                            host,
                            admin_id,
                            e,
                        )
                        continue
            except Exception as e:
                logger.debug("Skip admin %s: %s", admin_id, e)
                continue

        return None

    def _find_vcenter_credentials(
        self, vcenter_host: str
    ) -> Optional[Dict[str, str]]:
        """Fetch credentials for a known vCenter host."""
        admin_ids = self._list_all_admin_ids()
        target = vcenter_host.strip().lower()

        for admin_id in admin_ids:
            try:
                hosts = list_admin_vcenters(admin_id)
                for host in hosts:
                    path = f"credentials/admin/{admin_id}/{host}"
                    try:
                        creds = read_credentials(path)
                        if (
                            creds.get("host", "").strip().lower()
                            == target
                        ):
                            return {
                                "host": target,
                                "username": creds.get("username", ""),
                                "password": creds.get("password", ""),
                            }
                    except Exception:
                        continue
            except Exception:
                continue
        return None

    def _list_all_admin_ids(self) -> List[str]:
        try:
            result = vault_client.secrets.kv.v2.list_secrets(
                path="credentials/admin"
            )
            keys = result["data"]["keys"]
            return [k.rstrip("/") for k in keys]
        except hvac.exceptions.InvalidPath:
            return []
        except Exception as e:
            logger.error("Failed to list admin IDs from Vault: %s", e)
            return []