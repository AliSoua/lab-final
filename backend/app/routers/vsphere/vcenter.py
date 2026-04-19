# app/routers/vsphere/vcenter.py
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict
import os
from dotenv import load_dotenv

from app.dependencies.keycloak.keycloak_roles import require_role
from app.config.connection.vcenter_client import VCenterClient

load_dotenv()

router = APIRouter(prefix="/vsphere/vcenter", tags=["vsphere"])

# vCenter admin credentials from env (or Vault)
VCENTER_HOST = os.getenv("VCENTER_HOST")
VCENTER_USER = os.getenv("VCENTER_USER")
VCENTER_PASSWORD = os.getenv("VCENTER_PASSWORD")

def ensure_vcenter_connected():
    """Ensure vCenter connection is established."""
    if not VCenterClient._connected:
        if not all([VCENTER_HOST, VCENTER_USER, VCENTER_PASSWORD]):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="vCenter configuration incomplete"
            )
        
        success = VCenterClient.connect(VCENTER_HOST, VCENTER_USER, VCENTER_PASSWORD)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to connect to vCenter"
            )

@router.get("/health")
def vcenter_health(userinfo=Depends(require_role("admin"))):
    """
    Check vCenter connection health.
    Requires admin role.
    """
    # Try to connect if not connected
    if not VCenterClient._connected:
        if not all([VCENTER_HOST, VCENTER_USER, VCENTER_PASSWORD]):
            return {
                "status": "not_configured",
                "message": "vCenter credentials not configured"
            }
        
        success = VCenterClient.connect(VCENTER_HOST, VCENTER_USER, VCENTER_PASSWORD)
        if not success:
            return {
                "status": "connection_failed",
                "message": "Failed to connect to vCenter"
            }
    
    health = VCenterClient.health_check()
    return health

@router.get("/hosts", response_model=List[Dict])
def get_all_hosts(userinfo=Depends(require_role("admin"))):
    """
    Get all ESXi hosts managed by vCenter.
    Requires admin role.
    """
    try:
        ensure_vcenter_connected()
        hosts = VCenterClient.get_all_hosts()
        return hosts
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve hosts: {str(e)}"
        )

@router.get("/templates", response_model=List[Dict])
def get_all_templates(userinfo=Depends(require_role("admin"))):
    """
    Get all VM templates from vCenter.
    Requires admin role.
    """
    try:
        ensure_vcenter_connected()
        templates = VCenterClient.get_all_templates()
        return templates
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve templates: {str(e)}"
        )