from fastapi import APIRouter, HTTPException, Depends, status
from app.schemas.moderator import CredentialsCreate, CredentialsResponse, CredentialsInfo, CredentialsUpdate
from app.config.connection.vault_client import (
    create_or_update_credentials, 
    read_credentials, 
    delete_credentials, 
    exists_credentials,
)
from app.dependencies.keycloak.keycloak_roles import require_role

router = APIRouter(
    prefix="/credentials/moderators",
    tags=["credentials"],
    dependencies=[Depends(require_role("moderator"))]
)

@router.post("/", response_model=CredentialsResponse)
def create_credentials(
    data: CredentialsCreate, 
    userinfo=Depends(require_role("moderator"))
):
    """
    Create credentials for the authenticated moderator.
    Uses token sub (Keycloak User ID) automatically.
    Body: esxi_host, username, password
    """
    # Extract user_id from JWT token (sub claim)
    user_id = userinfo.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier"
        )
    
    # Check if already exists
    if exists_credentials(user_id):
        raise HTTPException(
            status_code=400, 
            detail="Credentials already exist. Use PUT to update."
        )
    
    path = create_or_update_credentials(
        user_id=user_id, 
        esxi_host=data.esxi_host, 
        username=data.username, 
        password=data.password
    )
    
    return CredentialsResponse(
        path=path, 
        message="Credentials created successfully"
    )

@router.get("/", response_model=CredentialsInfo)
def get_credentials(
    userinfo=Depends(require_role("moderator"))
):
    """
    Get own credentials (host and username only, no password).
    Uses token sub (Keycloak User ID) automatically.
    """
    user_id = userinfo.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier"
        )
    
    if not exists_credentials(user_id):
        raise HTTPException(
            status_code=404, 
            detail="No credentials found for your account"
        )
    
    try:
        data = read_credentials(user_id)
        return CredentialsInfo(
            host=data.get("host", ""), 
            username=data.get("username", "")
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, 
            detail="Credentials not found"
        )

@router.put("/", response_model=CredentialsResponse)
def update_credentials(
    data: CredentialsUpdate,
    userinfo=Depends(require_role("moderator"))
):
    """
    Update own credentials.
    Uses token sub (Keycloak User ID) automatically.
    """
    user_id = userinfo.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier"
        )
    
    if not exists_credentials(user_id):
        raise HTTPException(
            status_code=404, 
            detail="Credentials not found"
        )

    current = read_credentials(user_id)

    if (data.old_username != current.get("username") or 
        data.old_password != current.get("password")):
        raise HTTPException(
            status_code=403, 
            detail="Old credentials do not match. Update denied."
        )
    
    path = create_or_update_credentials(
        user_id=user_id,
        esxi_host=data.esxi_host,
        username=data.username,
        password=data.password
    )
    
    return CredentialsResponse(
        path=path, 
        message="Credentials updated successfully"
    )

@router.delete("/", response_model=CredentialsResponse)
def delete_moderator_credentials(
    userinfo=Depends(require_role("moderator"))
):
    """
    Delete own credentials.
    Uses token sub (Keycloak User ID) automatically.
    """
    user_id = userinfo.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier"
        )
    
    if not exists_credentials(user_id):
        raise HTTPException(
            status_code=404, 
            detail="Credentials not found"
        )
    
    try:
        path = delete_credentials(user_id)
        return CredentialsResponse(
            path=path, 
            message="Credentials deleted successfully"
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, 
            detail="Credentials not found"
        )