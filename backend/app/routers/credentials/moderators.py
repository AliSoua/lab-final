# app/routers/credentials/moderators.py
from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import List, Dict, Any, Set
from app.config.connection.vault_client import (
    list_admin_vcenters,
    read_credentials,
)
import hvac
from app.config.connection.vault_client import client as vault_client
from app.config.connection.vcenter_client import VCenterClient
import logging
import re

from app.config.connection.vault_client import (
    create_or_update_credentials,
    read_credentials,
    read_secret_metadata,
    delete_credentials,
    exists_credentials,
    list_moderator_hosts,
)
from app.dependencies.keycloak.keycloak_roles import require_role
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


def _get_user_id(userinfo) -> str:
    uid = userinfo.get("sub")
    if not uid or not re.match(r'^[a-zA-Z0-9._:@-]+$', uid):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing or malformed user identifier",
        )
    return uid


def _validate_host_name(host: str) -> str:
    """Validate ESXi host for safe Vault path usage.

    Rejects invalid characters outright (no silent mangling) to prevent
    path-collision attacks where 'host!1' and 'host@1' map to the same key.
    """
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


@router.post(
    "/",
    response_model=CredentialsResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_credentials(
    data: CredentialsCreate,
    request: Request,
    userinfo=Depends(require_role("moderator")),
):
    """Store ESXi credentials for a new host.

    CAS=0 guarantees an atomic create-only operation; if another request
    creates the same host simultaneously, exactly one will succeed.
    """
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
            cas=0,  # atomic create-only
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
    userinfo=Depends(require_role("moderator")),
):
    """List all ESXi hosts stored by this moderator.

    Passwords are NEVER loaded into memory. Only Vault metadata is queried.
    Legacy secrets without metadata will show empty usernames until updated.
    """
    user_id = _get_user_id(userinfo)

    try:
        hosts = list_moderator_hosts(user_id)
        result: List[HostInfo] = []
        for host_name in hosts:
            path = _build_path(user_id, host_name)
            try:
                meta = read_secret_metadata(path)
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
    userinfo=Depends(require_role("moderator")),
):
    """Get username for a specific ESXi host.

    For legacy secrets without metadata, falls back to a single secret read
    (password enters memory for that one host only).
    """
    user_id = _get_user_id(userinfo)
    safe_host = _validate_host_name(esxi_host)
    path = _build_path(user_id, safe_host)

    if not exists_credentials(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credentials not found",
        )

    try:
        meta = read_secret_metadata(path)
        meta_data = meta.get("data", {}) or {}
        custom = meta_data.get("custom_metadata") or {}

        if custom:
            return HostInfo(
                esxi_host=custom.get("host", esxi_host),
                username=custom.get("username", ""),
            )

        # Legacy fallback: secret was created before metadata logic existed.
        logger.warning("Legacy secret detected (no metadata): %s", path)
        data = read_credentials(path)
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
    userinfo=Depends(require_role("moderator")),
):
    """Update credentials for an existing ESXi host.

    1. Verifies old_username + old_password match the current secret.
    2. If the host name (esxi_host) is being changed, performs an atomic
       rename: verifies the target name is free, creates the new secret,
       then deletes the old one.
    3. If the host name is unchanged, performs an in-place CAS update.
    """
    user_id = _get_user_id(userinfo)
    safe_host = _validate_host_name(esxi_host)
    path = _build_path(user_id, safe_host)

    if not exists_credentials(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credentials not found",
        )

    try:
        current = read_credentials(path)
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

    # Determine if this is a rename operation
    new_safe_host = _validate_host_name(data.esxi_host)
    new_path = _build_path(user_id, new_safe_host)
    is_rename = new_path != path

    if is_rename:
        # Prevent duplicate host names for this moderator
        if exists_credentials(new_path):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Host '{data.esxi_host}' already exists for this moderator. "
                    "Choose a different name or delete the existing entry first."
                ),
            )

        # Atomic rename: create new first (so we never lose verified data),
        # then delete old.
        try:
            create_or_update_credentials(
                path=new_path,
                esxi_host=data.esxi_host,
                username=data.username,
                password=data.password.get_secret_value(),
                actor=user_id,
                cas=0,  # atomic create-only
            )
        except FileExistsError:
            # Race condition: target created between check and write
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
            delete_credentials(path, actor=user_id)
        except Exception as e:
            # Non-fatal orphan: new credentials are the source of truth.
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

    # In-place update (no rename) with CAS to prevent lost updates
    try:
        meta = read_secret_metadata(path)
        meta_data = meta.get("data", {}) or {}
        current_version = meta_data.get("current_version") or 0

        create_or_update_credentials(
            path=path,
            esxi_host=data.esxi_host,
            username=data.username,
            password=data.password.get_secret_value(),
            actor=user_id,
            cas=current_version,
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
    userinfo=Depends(require_role("moderator")),
):
    """Delete credentials for a specific ESXi host."""
    user_id = _get_user_id(userinfo)
    safe_host = _validate_host_name(esxi_host)
    path = _build_path(user_id, safe_host)

    if not exists_credentials(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credentials not found",
        )

    try:
        delete_credentials(path, actor=user_id)
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
    userinfo=Depends(require_role("moderator")),
):
    """
    Retrieve VM templates from all vCenter servers registered by any admin.
    
    - Fetches all admin vCenter credentials from Vault
    - Connects to each unique vCenter host (deduplicated by host field)
    - Returns aggregated templates with vCenter attribution
    """
    user_id = _get_user_id(userinfo)

    logger.info(
        "Moderator %s requesting templates from all vCenters (ip=%s)",
        user_id,
        request.client.host if request.client else "unknown",
    )

    # Step 1: Get all admin IDs from Vault
    try:
        admin_ids = _list_all_admin_ids()
    except Exception as e:
        logger.error("Failed to list admin IDs from Vault: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve admin credentials list",
        )

    if not admin_ids:
        return []

    # Step 2: Collect all vCenter credentials, deduplicated by host field
    all_credentials: List[Dict[str, str]] = []
    seen_hosts: Set[str] = set()

    for admin_id in admin_ids:
        try:
            hosts = list_admin_vcenters(admin_id)
            for host in hosts:
                path = f"credentials/admin/{admin_id}/{host}"
                try:
                    creds = read_credentials(path)
                    host_value = creds.get("host", "").strip().lower()
                    
                    # Deduplicate by host field - keep first occurrence
                    if not host_value or host_value in seen_hosts:
                        if host_value:
                            logger.debug(
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

    # Step 3: Connect to each vCenter and fetch templates
    templates_aggregate: List[Dict[str, Any]] = []

    for cred in all_credentials:
        vcenter_host = cred["host"]
        username = cred["username"]
        password = cred["password"]
        admin_id = cred["admin_id"]

        client = VCenterClient(
            host=vcenter_host,
            username=username,
            password=password,
        )

        try:
            if not client.connect():
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

            # Fetch templates from vCenter
            templates = client.get_templates()

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
            client.disconnect()

    return templates_aggregate


def _list_all_admin_ids() -> List[str]:
    """Helper to list all admin user IDs from Vault credentials path."""
    try:
        result = vault_client.secrets.kv.v2.list_secrets(path="credentials/admin")
        keys = result["data"]["keys"]
        # Vault returns folder keys with trailing slashes; strip them.
        return [k.rstrip("/") for k in keys]
    except hvac.exceptions.InvalidPath:
        return []
    except Exception as e:
        logger.error("Failed to list admin IDs from Vault: %s", e)
        raise