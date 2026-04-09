# app/routers/vsphere/esxi_test.py
import os
from fastapi import APIRouter, HTTPException, status
from typing import List, Dict
from dotenv import load_dotenv

from app.config.connection.esxi_client import ESXiClient

load_dotenv()

router = APIRouter(prefix="/vsphere/esxi-test", tags=["vsphere-test"])

# Read credentials from environment
ESXI_TEST_HOST = os.getenv("ESXI_TEST_HOST", "192.168.1.100")
ESXI_TEST_USERNAME = os.getenv("ESXI_TEST_USERNAME", "root")
ESXI_TEST_PASSWORD = os.getenv("ESXI_TEST_PASSWORD", "password123")

@router.get("/connection")
def esxi_connection_health():
    """
    TEST ENDPOINT: Check ESXi connection using credentials from .env.
    No authentication required.
    """
    client = ESXiClient(
        host=ESXI_TEST_HOST,
        username=ESXI_TEST_USERNAME,
        password=ESXI_TEST_PASSWORD
    )

    try:
        if not client.connect():
            return {
                "status": "connection_failed",
                "connected": False,
                "host": client.host,
                "message": "Failed to connect to ESXi host with provided credentials"
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
def get_esxi_templates():
    """
    TEST ENDPOINT: Get VM templates using credentials from .env.
    No authentication required.
    """
    client = ESXiClient(
        host=ESXI_TEST_HOST,
        username=ESXI_TEST_USERNAME,
        password=ESXI_TEST_PASSWORD
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
def get_esxi_info():
    """
    TEST ENDPOINT: Get ESXi host info using credentials from .env.
    No authentication required.
    """
    client = ESXiClient(
        host=ESXI_TEST_HOST,
        username=ESXI_TEST_USERNAME,
        password=ESXI_TEST_PASSWORD
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