# app/routers/LabDefinition/LabConnection.py
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import logging
import hvac

from app.config.connection.postgres_client import get_db
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.dependencies.vault.vault_auth import require_vault_client
from app.schemas.LabDefinition.LabConnection import (
    LabConnectionCreate,
    LabConnectionUpdate,
    LabConnectionResponse,
    LabConnectionDetailResponse,
    LabConnectionListItem,
    LabConnectionGroupedResponse,
)
from app.services.LabDefinition.LabConnection import (
    create_connection,
    get_connection_detail,
    list_connections,
    list_connections_grouped_by_slug,
    update_connection,
    delete_connection,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lab-connections", tags=["lab-connections"])


def _get_user_id(userinfo: dict) -> str:
    uid = userinfo.get("sub")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier",
        )
    return uid


@router.post(
    "/",
    response_model=LabConnectionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_connection_endpoint(
    data: LabConnectionCreate,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
    vault_user_client: hvac.Client = Depends(require_vault_client),
):
    user_id = _get_user_id(userinfo)
    logger.info(
        "LabConnection create attempt: user=%s slug=%s protocol=%s",
        user_id, data.slug, data.protocol,
    )
    connection = create_connection(db, data, user_id, vault_user_client)
    return connection


@router.get(
    "/",
    response_model=List[LabConnectionListItem],
)
def list_connections_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    protocol: Optional[str] = None,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["trainee", "moderator", "admin"])),
):
    connections, total = list_connections(db, skip, limit, search=search, protocol=protocol)
    return connections


@router.get(
    "/by-slug",
    response_model=List[LabConnectionGroupedResponse],
)
def list_connections_by_slug_endpoint(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["trainee", "moderator", "admin"])),
):
    """Return connections grouped by slug, showing which of the 3 protocols are configured."""
    return list_connections_grouped_by_slug(db, search=search)


@router.get(
    "/{connection_id}",
    response_model=LabConnectionDetailResponse,
)
def get_connection_endpoint(
    connection_id: UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
):
    connection, vault_path, username = get_connection_detail(db, connection_id)
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found.",
        )

    return LabConnectionDetailResponse(
        id=connection.id,
        slug=connection.slug,
        title=connection.title,
        protocol=connection.protocol,
        port=connection.port,
        config=connection.config,
        order=connection.order,
        created_at=connection.created_at,
        updated_at=connection.updated_at,
        vault_path=vault_path or "",
        username=username,
    )


@router.put(
    "/{connection_id}",
    response_model=LabConnectionResponse,
)
def update_connection_endpoint(
    connection_id: UUID,
    data: LabConnectionUpdate,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
    vault_user_client: hvac.Client = Depends(require_vault_client),
):
    user_id = _get_user_id(userinfo)
    logger.info(
        "LabConnection update attempt: user=%s connection_id=%s",
        user_id, connection_id,
    )
    connection = update_connection(db, connection_id, data, user_id, vault_user_client)
    return connection


@router.delete(
    "/{connection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_connection_endpoint(
    connection_id: UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_any_role(["moderator", "admin"])),
    vault_user_client: hvac.Client = Depends(require_vault_client),
):
    user_id = _get_user_id(userinfo)
    delete_connection(db, connection_id, user_id, vault_user_client)
    return None