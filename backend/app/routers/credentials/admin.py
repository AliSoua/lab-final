# app/routers/credentials/admin.py
from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import List
import logging
import re

from app.config.connection.vault_client import (
    create_or_update_credentials,
    read_credentials,
    read_secret_metadata,
    delete_credentials,
    exists_credentials,
    list_admin_vcenters,
)
from app.dependencies.keycloak.keycloak_roles import require_role
from app.schemas.credentials.admin import (
    VCenterCredentialsCreate,
    VCenterCredentialsUpdate,
    VCenterCredentialsResponse,
    VCenterInfo,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/credentials/admin/vcenters",
    tags=["credentials"],
    dependencies=[Depends(require_role("admin"))],
)


def _get_user_id(userinfo) -> str:
    uid = userinfo.get("sub")
    if not uid or not re.match(r'^[a-zA-Z0-9._:@-]+$', uid):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing or malformed user identifier",
        )
    return uid


def _validate_vcenter_name(host: str) -> str:
    """Validate vCenter host for safe Vault path usage."""
    clean = host.strip().lower()

    if not re.match(r'^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$', clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid vCenter host name format",
        )
    if ".." in clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Host name cannot contain consecutive dots",
        )
    return clean


def _build_path(user_id: str, safe_host: str) -> str:
    return f"credentials/admin/{user_id}/{safe_host}"


@router.post(
    "/",
    response_model=VCenterCredentialsResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_vcenter_credentials(
    data: VCenterCredentialsCreate,
    request: Request,
    userinfo=Depends(require_role("admin")),
):
    """Store vCenter credentials for a new host."""
    user_id = _get_user_id(userinfo)
    safe_host = _validate_vcenter_name(data.vcenter_host)
    path = _build_path(user_id, safe_host)

    logger.info(
        "vCenter credential create attempt: user=%s host=%s ip=%s",
        user_id,
        safe_host,
        request.client.host,
    )

    try:
        create_or_update_credentials(
            path=path,
            esxi_host=data.vcenter_host,  # Maps to generic 'host' key in Vault
            username=data.username,
            password=data.password.get_secret_value(),
            actor=user_id,
            cas=0,
        )
        return VCenterCredentialsResponse(
            message=f"vCenter credentials for {data.vcenter_host} stored securely"
        )
    except FileExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Credentials for vCenter '{data.vcenter_host}' already exist. "
                "Use PUT to update."
            ),
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
            detail="Failed to store vCenter credentials",
        )


@router.get("/hosts", response_model=List[VCenterInfo])
def list_vcenter_hosts(
    request: Request,
    userinfo=Depends(require_role("admin")),
):
    """List all vCenter hosts stored by this admin."""
    user_id = _get_user_id(userinfo)

    try:
        hosts = list_admin_vcenters(user_id)
        result: List[VCenterInfo] = []
        for host_name in hosts:
            path = _build_path(user_id, host_name)
            try:
                meta = read_secret_metadata(path)
                meta_data = meta.get("data", {}) or {}
                custom = meta_data.get("custom_metadata") or {}
                result.append(
                    VCenterInfo(
                        vcenter_host=custom.get("host", host_name),
                        username=custom.get("username", ""),
                    )
                )
            except Exception as inner:
                logger.warning(
                    "Skipping vCenter %s for user %s: %s", host_name, user_id, inner
                )
                continue
        return result
    except Exception as e:
        logger.error("Failed to list vCenters for user=%s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve vCenter hosts",
        )


@router.get("/hosts/{vcenter_host}", response_model=VCenterInfo)
def get_vcenter_host(
    vcenter_host: str,
    request: Request,
    userinfo=Depends(require_role("admin")),
):
    """Get username for a specific vCenter host."""
    user_id = _get_user_id(userinfo)
    safe_host = _validate_vcenter_name(vcenter_host)
    path = _build_path(user_id, safe_host)

    if not exists_credentials(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="vCenter credentials not found",
        )

    try:
        meta = read_secret_metadata(path)
        meta_data = meta.get("data", {}) or {}
        custom = meta_data.get("custom_metadata") or {}

        if custom:
            return VCenterInfo(
                vcenter_host=custom.get("host", vcenter_host),
                username=custom.get("username", ""),
            )

        logger.warning("Legacy secret detected (no metadata): %s", path)
        data = read_credentials(path)
        return VCenterInfo(
            vcenter_host=data.get("host", vcenter_host),
            username=data.get("username", ""),
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="vCenter credentials not found",
        )
    except Exception as e:
        logger.error("Failed to read vCenter credentials for user=%s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read vCenter credentials",
        )


@router.put("/hosts/{vcenter_host}", response_model=VCenterCredentialsResponse)
def update_vcenter_credentials(
    vcenter_host: str,
    data: VCenterCredentialsUpdate,
    request: Request,
    userinfo=Depends(require_role("admin")),
):
    """Update credentials for an existing vCenter host."""
    user_id = _get_user_id(userinfo)
    safe_host = _validate_vcenter_name(vcenter_host)
    path = _build_path(user_id, safe_host)

    if not exists_credentials(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="vCenter credentials not found",
        )

    try:
        current = read_credentials(path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="vCenter credentials not found",
        )

    if (
        data.old_username != current.get("username")
        or data.old_password.get_secret_value() != current.get("password")
    ):
        logger.warning(
            "vCenter credential mismatch during update: user=%s host=%s ip=%s",
            user_id,
            safe_host,
            request.client.host,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Old credentials do not match. Update denied.",
        )

    new_safe_host = _validate_vcenter_name(data.vcenter_host)
    new_path = _build_path(user_id, new_safe_host)
    is_rename = new_path != path

    if is_rename:
        if exists_credentials(new_path):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"vCenter '{data.vcenter_host}' already exists for this admin. "
                    "Choose a different name or delete the existing entry first."
                ),
            )

        try:
            create_or_update_credentials(
                path=new_path,
                esxi_host=data.vcenter_host,
                username=data.username,
                password=data.password.get_secret_value(),
                actor=user_id,
                cas=0,
            )
        except FileExistsError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"vCenter '{data.vcenter_host}' already exists. Please retry.",
            )
        except Exception as e:
            logger.error(
                "Vault create failed during rename for user=%s: %s", user_id, e
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create renamed vCenter credentials",
            )

        try:
            delete_credentials(path, actor=user_id)
        except Exception as e:
            logger.error(
                "Failed to delete old vCenter credentials %s after rename: %s", path, e
            )

        logger.info(
            "vCenter credentials renamed: user=%s old_host=%s new_host=%s ip=%s",
            user_id,
            safe_host,
            new_safe_host,
            request.client.host,
        )
        return VCenterCredentialsResponse(
            message=f"vCenter credentials renamed to {data.vcenter_host} and updated successfully"
        )

    try:
        meta = read_secret_metadata(path)
        meta_data = meta.get("data", {}) or {}
        current_version = meta_data.get("current_version") or 0

        create_or_update_credentials(
            path=path,
            esxi_host=data.vcenter_host,
            username=data.username,
            password=data.password.get_secret_value(),
            actor=user_id,
            cas=current_version,
        )
        logger.info(
            "vCenter credentials updated: user=%s host=%s ip=%s",
            user_id,
            safe_host,
            request.client.host,
        )
        return VCenterCredentialsResponse(message="vCenter credentials updated successfully")
    except FileExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="vCenter credentials were modified by another request. Please retry.",
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
            detail="Failed to update vCenter credentials",
        )


@router.delete("/hosts/{vcenter_host}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vcenter_host(
    vcenter_host: str,
    request: Request,
    userinfo=Depends(require_role("admin")),
):
    """Delete credentials for a specific vCenter host."""
    user_id = _get_user_id(userinfo)
    safe_host = _validate_vcenter_name(vcenter_host)
    path = _build_path(user_id, safe_host)

    if not exists_credentials(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="vCenter credentials not found",
        )

    try:
        delete_credentials(path, actor=user_id)
        logger.info(
            "vCenter credentials deleted: user=%s host=%s ip=%s",
            user_id,
            safe_host,
            request.client.host,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="vCenter credentials not found",
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
            detail="Failed to delete vCenter credentials",
        )