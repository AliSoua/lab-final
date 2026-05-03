# app/routers/credentials/moderators.py
from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import List, Dict, Any, Set
import hvac
import logging
import re

from app.config.connection.vcenter_client import VCenterClient
from app.config.connection.vault_client import VaultClient
from app.dependencies.keycloak.keycloak_roles import require_role
from app.dependencies.vault.vault_auth import require_vault_client
from app.services.vault.credentials import (
    create_or_update_credentials,
    read_credentials,
    read_secret_metadata,
    delete_credentials,
    exists_credentials,
    list_moderator_hosts,
    list_admin_vcenters,
)
from app.schemas.moderator import (
    CredentialsCreate,
    CredentialsUpdate,
    CredentialsResponse,
    HostInfo,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/credentials/moderators",
    tags=["credentials"],
    dependencies=[Depends(require_role("moderator"))],
)

def _host_matches(vm_host: str | None, target_hosts: list[str]) -> bool:
    """Check if vm_host matches any target host, handling FQDN vs short name."""
    if not vm_host:
        return False
    vm_lower = vm_host.lower()
    for target in target_hosts:
        if not target:
            continue
        target_lower = target.lower()
        # Exact match
        if vm_lower == target_lower:
            return True
        # One is substring of the other (FQDN vs short name)
        if vm_lower in target_lower or target_lower in vm_lower:
            return True
    return False


def _get_user_id(userinfo) -> str:
    uid = userinfo.get("sub")
    if not uid or not re.match(r'^[a-zA-Z0-9._:@-]+$', uid):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing or malformed user identifier",
        )
    return uid


def _validate_host_name(host: str) -> str:
    """Validate ESXi host for safe Vault path usage."""
    clean = host.strip().lower()

    if not re.match(r'^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$', clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid host name format",
        )
    if ".." in clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Host name cannot contain consecutive dots",
        )
    return clean


def _build_path(user_id: str, safe_host: str) -> str:
    return f"credentials/moderators/{user_id}/{safe_host}"


def _list_all_admin_ids(vault_client: hvac.Client) -> List[str]:
    """List all admin user IDs from Vault using the provided (user-scoped) client."""
    try:
        return VaultClient().list_secrets("credentials/admin", vault_client)
    except RuntimeError as e:
        logger.error("Failed to list admin IDs from Vault: %s", e)
        raise


# ── CRUD Endpoints ────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=CredentialsResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_credentials(
    data: CredentialsCreate,
    request: Request,
    vault_client: hvac.Client = Depends(require_vault_client),
    userinfo=Depends(require_role("moderator")),
):
    """Store ESXi credentials for a new host."""
    user_id = _get_user_id(userinfo)
    safe_host = _validate_host_name(data.esxi_host)
    path = _build_path(user_id, safe_host)

    logger.info(
        "Credential create attempt: user=%s host=%s ip=%s",
        user_id,
        safe_host,
        request.client.host,
    )

    try:
        create_or_update_credentials(
            path=path,
            esxi_host=data.esxi_host,
            username=data.username,
            password=data.password.get_secret_value(),
            actor=user_id,
            cas=0,
            user_client=vault_client,
        )
        return CredentialsResponse(
            message=f"Credentials for {data.esxi_host} stored securely"
        )
    except FileExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Credentials for host '{data.esxi_host}' already exist. Use PUT to update.",
        )
    except PermissionError as e:
        logger.warning("Vault permission denied for %s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied",
        )
    except Exception as e:
        logger.error("Vault write failed for user=%s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store credentials",
        )


@router.get("/hosts", response_model=List[HostInfo])
def list_hosts(
    request: Request,
    vault_client: hvac.Client = Depends(require_vault_client),
    userinfo=Depends(require_role("moderator")),
):
    """List all ESXi hosts stored by this moderator."""
    user_id = _get_user_id(userinfo)

    try:
        hosts = list_moderator_hosts(user_id, vault_client)
        result: List[HostInfo] = []
        for host_name in hosts:
            path = _build_path(user_id, host_name)
            try:
                meta = read_secret_metadata(path, vault_client)
                meta_data = meta.get("data", {}) or {}
                custom = meta_data.get("custom_metadata") or {}
                result.append(
                    HostInfo(
                        esxi_host=custom.get("host", host_name),
                        username=custom.get("username", ""),
                    )
                )
            except Exception as inner:
                logger.warning(
                    "Skipping host %s for user %s: %s", host_name, user_id, inner
                )
                continue
        return result
    except Exception as e:
        logger.error("Failed to list hosts for user=%s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve hosts",
        )


@router.get("/hosts/{esxi_host}", response_model=HostInfo)
def get_host(
    esxi_host: str,
    request: Request,
    vault_client: hvac.Client = Depends(require_vault_client),
    userinfo=Depends(require_role("moderator")),
):
    """Get username for a specific ESXi host."""
    user_id = _get_user_id(userinfo)
    safe_host = _validate_host_name(esxi_host)
    path = _build_path(user_id, safe_host)

    if not exists_credentials(path, vault_client):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credentials not found",
        )

    try:
        meta = read_secret_metadata(path, vault_client)
        meta_data = meta.get("data", {}) or {}
        custom = meta_data.get("custom_metadata") or {}

        if custom:
            return HostInfo(
                esxi_host=custom.get("host", esxi_host),
                username=custom.get("username", ""),
            )

        logger.warning("Legacy secret detected (no metadata): %s", path)
        data = read_credentials(path, vault_client)
        return HostInfo(
            esxi_host=data.get("host", esxi_host),
            username=data.get("username", ""),
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credentials not found",
        )
    except Exception as e:
        logger.error("Failed to read credentials for user=%s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read credentials",
        )


@router.put("/hosts/{esxi_host}", response_model=CredentialsResponse)
def update_credentials(
    esxi_host: str,
    data: CredentialsUpdate,
    request: Request,
    vault_client: hvac.Client = Depends(require_vault_client),
    userinfo=Depends(require_role("moderator")),
):
    """Update credentials for an existing ESXi host."""
    user_id = _get_user_id(userinfo)
    safe_host = _validate_host_name(esxi_host)
    path = _build_path(user_id, safe_host)

    if not exists_credentials(path, vault_client):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credentials not found",
        )

    try:
        current = read_credentials(path, vault_client)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credentials not found",
        )

    if (
        data.old_username != current.get("username")
        or data.old_password.get_secret_value() != current.get("password")
    ):
        logger.warning(
            "Credential mismatch during update: user=%s host=%s ip=%s",
            user_id,
            safe_host,
            request.client.host,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Old credentials do not match. Update denied.",
        )

    new_safe_host = _validate_host_name(data.esxi_host)
    new_path = _build_path(user_id, new_safe_host)
    is_rename = new_path != path

    if is_rename:
        if exists_credentials(new_path, vault_client):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Host '{data.esxi_host}' already exists for this moderator. "
                    "Choose a different name or delete the existing entry first."
                ),
            )

        try:
            create_or_update_credentials(
                path=new_path,
                esxi_host=data.esxi_host,
                username=data.username,
                password=data.password.get_secret_value(),
                actor=user_id,
                cas=0,
                user_client=vault_client,
            )
        except FileExistsError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Host '{data.esxi_host}' already exists. Please retry.",
            )
        except Exception as e:
            logger.error(
                "Vault create failed during rename for user=%s: %s", user_id, e
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create renamed credentials",
            )

        # New secret is established; now remove the old one.
        try:
            delete_credentials(path, actor=user_id, user_client=vault_client)
        except Exception as e:
            logger.error("Failed to delete old credentials %s after rename: %s", path, e)

        logger.info(
            "Credentials renamed: user=%s old_host=%s new_host=%s ip=%s",
            user_id,
            safe_host,
            new_safe_host,
            request.client.host,
        )
        return CredentialsResponse(
            message=f"Credentials renamed to {data.esxi_host} and updated successfully"
        )

    # In-place update (no rename) with CAS
    try:
        meta = read_secret_metadata(path, vault_client)
        meta_data = meta.get("data", {}) or {}
        current_version = meta_data.get("current_version") or 0

        create_or_update_credentials(
            path=path,
            esxi_host=data.esxi_host,
            username=data.username,
            password=data.password.get_secret_value(),
            actor=user_id,
            cas=current_version,
            user_client=vault_client,
        )
        logger.info(
            "Credentials updated: user=%s host=%s ip=%s",
            user_id,
            safe_host,
            request.client.host,
        )
        return CredentialsResponse(message="Credentials updated successfully")
    except FileExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Credentials were modified by another request. Please retry.",
        )
    except PermissionError as e:
        logger.warning("Vault permission denied for %s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied",
        )
    except Exception as e:
        logger.error("Vault update failed for user=%s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update credentials",
        )


@router.delete("/hosts/{esxi_host}", status_code=status.HTTP_204_NO_CONTENT)
def delete_host(
    esxi_host: str,
    request: Request,
    vault_client: hvac.Client = Depends(require_vault_client),
    userinfo=Depends(require_role("moderator")),
):
    """Delete credentials for a specific ESXi host."""
    user_id = _get_user_id(userinfo)
    safe_host = _validate_host_name(esxi_host)
    path = _build_path(user_id, safe_host)

    if not exists_credentials(path, vault_client):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credentials not found",
        )

    try:
        delete_credentials(path, actor=user_id, user_client=vault_client)
        logger.info(
            "Credentials deleted: user=%s host=%s ip=%s",
            user_id,
            safe_host,
            request.client.host,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credentials not found",
        )
    except PermissionError as e:
        logger.warning("Vault permission denied for %s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied",
        )
    except Exception as e:
        logger.error("Vault delete failed for user=%s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete credentials",
        )


@router.get(
    "/vcenters/templates",
    response_model=List[Dict[str, Any]],
    summary="Get VM templates from all registered vCenter servers",
)
def get_all_vcenter_templates(
    request: Request,
    vault_client: hvac.Client = Depends(require_vault_client),
    userinfo=Depends(require_role("moderator")),
):
    """
    Retrieve VM templates from all vCenter servers registered by any admin.
    """
    user_id = _get_user_id(userinfo)

    logger.info(
        "Moderator %s requesting templates from all vCenters (ip=%s)",
        user_id,
        request.client.host if request.client else "unknown",
    )

    try:
        admin_ids = _list_all_admin_ids(vault_client)
    except Exception as e:
        logger.error("Failed to list admin IDs from Vault: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve admin credentials list",
        )

    if not admin_ids:
        return []

    all_credentials: List[Dict[str, str]] = []
    seen_hosts: Set[str] = set()

    for admin_id in admin_ids:
        try:
            hosts = list_admin_vcenters(admin_id, vault_client)
            for host in hosts:
                path = f"credentials/admin/{admin_id}/{host}"
                try:
                    creds = read_credentials(path, vault_client)
                    host_value = creds.get("host", "").strip().lower()

                    if not host_value or host_value in seen_hosts:
                        if host_value:
                            logger.info(
                                "Skipping duplicate vCenter host: %s (admin=%s)",
                                host_value,
                                admin_id,
                            )
                        continue

                    seen_hosts.add(host_value)

                    all_credentials.append({
                        "admin_id": admin_id,
                        "host": host_value,
                        "username": creds.get("username", ""),
                        "password": creds.get("password", ""),
                        "path": path,
                    })
                except Exception as e:
                    logger.warning(
                        "Failed to read credentials at %s: %s", path, e
                    )
                    continue
        except Exception as e:
            logger.warning(
                "Failed to list vCenters for admin %s: %s", admin_id, e
            )
            continue

    if not all_credentials:
        return []

    templates_aggregate: List[Dict[str, Any]] = []

    for cred in all_credentials:
        vcenter_host = cred["host"]
        username = cred["username"]
        password = cred["password"]
        admin_id = cred["admin_id"]

        vc_client = VCenterClient(
            host=vcenter_host,
            username=username,
            password=password,
        )

        try:
            if not vc_client.connect():
                logger.warning(
                    "Failed to connect to vCenter %s (admin=%s)",
                    vcenter_host,
                    admin_id,
                )
                templates_aggregate.append({
                    "vcenter_host": vcenter_host,
                    "admin_id": admin_id,
                    "templates": [],
                    "count": 0,
                    "error": "Connection failed",
                })
                continue

            templates = vc_client.get_templates()

            templates_aggregate.append({
                "vcenter_host": vcenter_host,
                "admin_id": admin_id,
                "templates": templates,
                "count": len(templates),
            })

            logger.info(
                "Retrieved %d templates from vCenter %s (admin=%s)",
                len(templates),
                vcenter_host,
                admin_id,
            )

        except Exception as e:
            logger.error(
                "Failed to fetch templates from vCenter %s (admin=%s): %s",
                vcenter_host,
                admin_id,
                e,
            )
            templates_aggregate.append({
                "vcenter_host": vcenter_host,
                "admin_id": admin_id,
                "templates": [],
                "count": 0,
                "error": str(e),
            })
        finally:
            vc_client.disconnect()

    return templates_aggregate


@router.get(
    "/hosts/{esxi_host}/vms",
    response_model=List[Dict[str, Any]],
    summary="Get VMs on a specific ESXi host via vCenter",
)
def get_vms_on_host(
    esxi_host: str,
    request: Request,
    vault_client: hvac.Client = Depends(require_vault_client),
    userinfo=Depends(require_role("moderator")),
):
    """
    List all non-template VMs that are currently running on the moderator's ESXi host.
    Connects via vCenter (admin credentials) and filters by ESXi host name.
    """
    user_id = _get_user_id(userinfo)
    safe_host = _validate_host_name(esxi_host)
    esxi_path = _build_path(user_id, safe_host)

    # 1. Read moderator's ESXi credentials
    if not exists_credentials(esxi_path, vault_client):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ESXi host credentials not found",
        )

    try:
        esxi_creds = read_credentials(esxi_path, vault_client)
    except Exception as e:
        logger.error("Failed to read ESXi credentials for user=%s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read ESXi credentials",
        )

    # 2. Find which vCenter manages this ESXi host
    admin_ids = _list_all_admin_ids(vault_client)
    matching_vcenter = None

    for admin_id in admin_ids:
        try:
            vcenter_hosts = list_admin_vcenters(admin_id, vault_client)
            for vcenter_name in vcenter_hosts:
                vcenter_path = f"credentials/admin/{admin_id}/{vcenter_name}"
                try:
                    vcenter_creds = read_credentials(vcenter_path, vault_client)
                    vc_client = VCenterClient(
                        host=vcenter_creds.get("host"),
                        username=vcenter_creds.get("username"),
                        password=vcenter_creds.get("password"),
                    )
                    if not vc_client.connect():
                        continue

                    # Check if this vCenter has our ESXi host
                    hosts = vc_client.get_hosts()
                    host_names = {(h.get("name") or "").lower() for h in hosts}

                    if esxi_host.lower() in host_names or (esxi_creds.get("host") or "").lower() in host_names:
                        matching_vcenter = vc_client
                        break

                    vc_client.disconnect()
                except Exception:
                    continue

            if matching_vcenter:
                break
        except Exception:
            continue

    if not matching_vcenter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not find a vCenter managing this ESXi host",
        )

    try:
        # 3. Get all VMs and filter by ESXi host
        all_vms = matching_vcenter.get_vms()
        host_vms = [
            vm for vm in all_vms
            if _host_matches(vm.get("host"), [esxi_host, esxi_creds.get("host")])
        ]

        logger.info(
            "Retrieved %d VMs on ESXi host %s for moderator %s",
            len(host_vms),
            esxi_host,
            user_id,
        )
        return host_vms

    except Exception as e:
        logger.error(
            "Failed to fetch VMs for host %s (moderator=%s): %s",
            esxi_host,
            user_id,
            e,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch VMs from vCenter",
        )
    finally:
        matching_vcenter.disconnect()


@router.get(
    "/hosts/{esxi_host}/vms/{vm_uuid}/snapshots",
    response_model=List[Dict[str, Any]],
    summary="Get snapshots for a specific VM",
)
def get_vm_snapshots(
    esxi_host: str,
    vm_uuid: str,
    request: Request,
    vault_client: hvac.Client = Depends(require_vault_client),
    userinfo=Depends(require_role("moderator")),
):
    """
    List all snapshots for a specific VM on the moderator's ESXi host.
    """
    user_id = _get_user_id(userinfo)
    safe_host = _validate_host_name(esxi_host)
    esxi_path = _build_path(user_id, safe_host)

    if not exists_credentials(esxi_path, vault_client):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ESXi host credentials not found",
        )

    # Find vCenter that manages this ESXi host (same logic as above)
    admin_ids = _list_all_admin_ids(vault_client)
    matching_vcenter = None

    for admin_id in admin_ids:
        try:
            vcenter_hosts = list_admin_vcenters(admin_id, vault_client)
            for vcenter_name in vcenter_hosts:
                vcenter_path = f"credentials/admin/{admin_id}/{vcenter_name}"
                try:
                    vcenter_creds = read_credentials(vcenter_path, vault_client)
                    vc_client = VCenterClient(
                        host=vcenter_creds.get("host"),
                        username=vcenter_creds.get("username"),
                        password=vcenter_creds.get("password"),
                    )
                    if not vc_client.connect():
                        continue

                    hosts = vc_client.get_hosts()
                    host_names = {h.get("name", "").lower() for h in hosts}
                    
                    if esxi_host.lower() in host_names:
                        matching_vcenter = vc_client
                        break

                    vc_client.disconnect()
                except Exception:
                    continue

            if matching_vcenter:
                break
        except Exception:
            continue

    if not matching_vcenter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not find a vCenter managing this ESXi host",
        )

    try:
        snapshots = matching_vcenter.get_snapshots(vm_uuid)
        logger.info(
            "Retrieved %d snapshots for VM %s on host %s (moderator=%s)",
            len(snapshots),
            vm_uuid,
            esxi_host,
            user_id,
        )
        return snapshots

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(
            "Failed to fetch snapshots for VM %s (moderator=%s): %s",
            vm_uuid,
            user_id,
            e,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch snapshots from vCenter",
        )
    finally:
        matching_vcenter.disconnect()