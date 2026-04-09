# app/routers/vsphere/esxi.py
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Optional

from app.dependencies.keycloak.keycloak_roles import require_role
from app.config.connection.esxi_client import get_esxi_client_from_vault, ESXiClient

router = APIRouter(prefix="/vsphere/esxi", tags=["vsphere"])

@router.get("/connection")
def esxi_connection_health(userinfo=Depends(require_role("moderator"))):
    """
    Check connection to ESXi host using stored credentials.
    Uses moderator's own credentials from Vault.
    """
    user_id = userinfo.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier"
        )
    
    # Get client using Vault credentials
    client = get_esxi_client_from_vault(user_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No ESXi credentials found for your account. Please configure credentials first."
        )
    
    try:
        if not client.connect():
            return {
                "status": "connection_failed",
                "connected": False,
                "host": client.host,
                "message": "Failed to connect to ESXi host with stored credentials"
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
def get_esxi_templates(userinfo=Depends(require_role("moderator"))):
    """
    Get all VM templates from ESXi host.
    Uses moderator's own credentials from Vault to connect.
    """
    user_id = userinfo.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier"
        )
    
    # Get client using Vault credentials
    client = get_esxi_client_from_vault(user_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No ESXi credentials found for your account. Please configure credentials first."
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
def get_esxi_info(userinfo=Depends(require_role("moderator"))):
    """
    Get ESXi host information.
    Uses moderator's own credentials from Vault.
    """
    user_id = userinfo.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier"
        )
    
    client = get_esxi_client_from_vault(user_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No ESXi credentials found for your account"
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