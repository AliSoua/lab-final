# app/routers/vsphere/esxi.py
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Callable

from app.dependencies.keycloak.keycloak_roles import require_role
from app.config.connection.esxi_client import ESXiClient
from app.config.connection.vault_client import list_moderator_hosts, read_credentials

router = APIRouter(prefix="/vsphere/esxi", tags=["vsphere"])


def _get_user_id(userinfo) -> str:
    user_id = userinfo.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier"
        )
    return user_id


def _fetch_for_all_hosts(user_id: str, fetch_fn: Callable[[ESXiClient], Dict | List]):
    """
    Helper that iterates every ESXi host stored in Vault for this moderator,
    connects to each, runs fetch_fn, and aggregates results.
    Partial failures are captured so one offline host doesn't break the whole request.
    """
    try:
        host_names = list_moderator_hosts(user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list hosts from Vault: {str(e)}"
        )

    if not host_names:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No ESXi credentials found for your account. Please configure credentials first."
        )

    results: List[Dict] = []
    errors: List[Dict] = []

    for host_name in host_names:
        path = f"credentials/moderators/{user_id}/{host_name}"
        client: ESXiClient | None = None

        try:
            creds = read_credentials(path)
            host = creds.get("host")
            username = creds.get("username")
            password = creds.get("password")

            if not all([host, username, password]):
                errors.append({
                    "host_name": host_name,
                    "error": "Incomplete credentials stored in Vault"
                })
                continue

            client = ESXiClient(host, username, password)

            if not client.connect():
                errors.append({
                    "host": host,
                    "error": "Failed to connect with stored credentials"
                })
                continue

            data = fetch_fn(client)
            client.disconnect()
            client = None

            results.append({
                "host": host,
                "data": data
            })

        except FileNotFoundError:
            errors.append({
                "host_name": host_name,
                "error": "Credentials not found in Vault"
            })
        except Exception as e:
            errors.append({
                "host": client.host if client else host_name,
                "error": str(e)
            })
        finally:
            if client:
                client.disconnect()

    return {
        "results": results,
        "errors": errors,
        "total_hosts": len(host_names),
        "successful": len(results),
        "failed": len(errors)
    }


@router.get("/connection")
def esxi_connection_health(userinfo=Depends(require_role("moderator"))):
    """
    Check connection health for ALL ESXi hosts stored in Vault.
    Returns per-host health status.
    """
    user_id = _get_user_id(userinfo)
    return _fetch_for_all_hosts(user_id, lambda client: client.health_check())


@router.get("/templates")
def get_esxi_templates(userinfo=Depends(require_role("moderator"))):
    """
    Get VM templates from ALL ESXi hosts.
    """
    user_id = _get_user_id(userinfo)
    return _fetch_for_all_hosts(user_id, lambda client: client.get_templates())


@router.get("/info")
def get_esxi_info(userinfo=Depends(require_role("moderator"))):
    """
    Get host information for ALL configured ESXi hosts.
    """
    user_id = _get_user_id(userinfo)
    return _fetch_for_all_hosts(user_id, lambda client: client.get_host_info())


@router.get("/vms")
def get_all_vms(userinfo=Depends(require_role("moderator"))):
    """
    Get all VMs from ALL ESXi hosts with power status.
    """
    user_id = _get_user_id(userinfo)
    return _fetch_for_all_hosts(user_id, lambda client: client.get_vms())