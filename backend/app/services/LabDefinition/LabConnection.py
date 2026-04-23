# app/services/LabDefinition/LabConnection.py
import logging
import re
from typing import List, Optional, Tuple, Dict

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import asc, func
from uuid import UUID
import hvac

from app.models.LabDefinition.LabConnection import LabConnection
from app.schemas.LabDefinition.LabConnection import LabConnectionCreate, LabConnectionUpdate
from app.config.connection.vault_client import VaultClient
from app.services.vault.credentials import (
    read_credentials,
    exists_credentials,
)

logger = logging.getLogger(__name__)

VAULT_BASE_PATH = "credentials/lab_connections"


def _build_vault_path(slug: str, protocol: str) -> str:
    safe_slug = slug.strip().lower()
    safe_protocol = protocol.strip().lower()
    return f"{VAULT_BASE_PATH}/{safe_slug}/{safe_protocol}"


def _validate_slug(slug: str) -> str:
    safe = slug.strip().lower()
    if not re.match(r'^[a-z0-9]+(?:[._-][a-z0-9]+)*$', safe):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid slug format. Use lowercase alphanumeric with hyphens, dots, or underscores.",
        )
    if ".." in safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slug cannot contain consecutive dots.",
        )
    return safe


def _write_vault_creds(
    slug: str,
    protocol: str,
    username: str,
    password: str,
    vault_client: hvac.Client,
) -> None:
    path = _build_vault_path(slug, protocol)
    try:
        VaultClient().write_secret(
            path=path,
            secret={"username": username, "password": password},
            user_client=vault_client,
        )
        logger.info("Vault credentials written to %s", path)
    except Exception as e:
        logger.error("Vault write failed at %s: %s", path, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store credentials in Vault.",
        )


def _destroy_vault_path(slug: str, protocol: str, vault_client: hvac.Client) -> None:
    """Permanently delete ALL versions and metadata for a Vault path."""
    path = _build_vault_path(slug, protocol)
    try:
        VaultClient().delete_secret(path, user_client=vault_client)
        logger.info("Vault path permanently destroyed: %s", path)
    except Exception as e:
        logger.error("Failed to destroy Vault path %s: %s", path, e)
        # Non-fatal: DB record is already gone or going away.
        # Log for manual cleanup but don't block the API.


def create_connection(
    db: Session,
    data: LabConnectionCreate,
    user_id: str,
    vault_client: hvac.Client,
) -> LabConnection:
    """Create a LabConnection and store its credentials in Vault."""
    slug = _validate_slug(data.slug)
    protocol = data.protocol.value

    # Enforce max 3 protocols per slug (business rule, not DB constraint)
    count = db.query(func.count(LabConnection.id)).filter(
        LabConnection.slug == slug
    ).scalar()
    if count >= 3:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Slug '{slug}' already has the maximum of 3 connections.",
        )

    existing = (
        db.query(LabConnection)
        .filter(LabConnection.slug == slug, LabConnection.protocol == protocol)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Connection with slug '{slug}' and protocol '{protocol}' already exists.",
        )

    # Write credentials to Vault first (fail fast before DB commit)
    _write_vault_creds(slug, protocol, data.username, data.password, vault_client)

    connection = LabConnection(
        slug=slug,
        title=data.title,
        protocol=protocol,
        port=data.port,
        config=data.config,
        order=data.order,
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)

    logger.info(
        "LabConnection created: id=%s slug=%s protocol=%s user=%s",
        connection.id, slug, protocol, user_id,
    )
    return connection


def get_connection(db: Session, connection_id: UUID) -> Optional[LabConnection]:
    return db.query(LabConnection).filter(LabConnection.id == connection_id).first()


def get_connection_detail(
    db: Session,
    connection_id: UUID,
    vault_client: hvac.Client,
) -> Tuple[Optional[LabConnection], Optional[str], Optional[str]]:
    """Fetch connection plus Vault-derived path and username."""
    connection = get_connection(db, connection_id)
    if not connection:
        return None, None, None

    vault_path = _build_vault_path(connection.slug, connection.protocol)
    username = None

    try:
        if exists_credentials(vault_path, vault_client):
            creds = read_credentials(vault_path, vault_client)
            username = creds.get("username")
    except Exception as e:
        logger.warning("Failed to read Vault credentials at %s: %s", vault_path, e)

    return connection, vault_path, username


def list_connections(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    protocol: Optional[str] = None,
) -> Tuple[List[LabConnection], int]:
    query = db.query(LabConnection)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (LabConnection.slug.ilike(pattern)) | (LabConnection.title.ilike(pattern))
        )

    if protocol:
        query = query.filter(LabConnection.protocol == protocol.lower())

    total = query.count()
    items = (
        query.order_by(asc(LabConnection.order), asc(LabConnection.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )
    return items, total


def list_connections_grouped_by_slug(
    db: Session,
    search: Optional[str] = None,
) -> List[Dict]:
    """Return connections grouped by slug for the protocol-slot UI."""
    query = db.query(LabConnection)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (LabConnection.slug.ilike(pattern)) | (LabConnection.title.ilike(pattern))
        )

    connections = query.order_by(
        asc(LabConnection.slug), asc(LabConnection.order)
    ).all()

    groups: Dict[str, Dict] = {}
    for conn in connections:
        if conn.slug not in groups:
            groups[conn.slug] = {
                "slug": conn.slug,
                "connections": [],
            }
        groups[conn.slug]["connections"].append(conn)

    return list(groups.values())


def update_connection(
    db: Session,
    connection_id: UUID,
    data: LabConnectionUpdate,
    user_id: str,
    vault_client: hvac.Client,
) -> LabConnection:
    connection = get_connection(db, connection_id)
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found.",
        )

    # Protocol is IMMUTABLE because it is excluded from LabConnectionUpdate.
    # FastAPI rejects any request that tries to send it (422 validation error).
    # The only way to "change" protocol is delete + recreate.

    old_slug = connection.slug
    old_protocol = connection.protocol
    new_slug = _validate_slug(data.slug) if data.slug else old_slug

    if new_slug != old_slug:
        # Check collision at target slug+protocol
        collision = (
            db.query(LabConnection)
            .filter(
                LabConnection.slug == new_slug,
                LabConnection.protocol == old_protocol,
                LabConnection.id != connection_id,
            )
            .first()
        )
        if collision:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Slug '{new_slug}' already has a {old_protocol} connection.",
            )

        # Move Vault credentials: write new, destroy old
        try:
            old_path = _build_vault_path(old_slug, old_protocol)
            old_creds = read_credentials(old_path, vault_client) if exists_credentials(old_path, vault_client) else {}
            username = data.username if data.username else old_creds.get("username", "")
            password = data.password if data.password else old_creds.get("password", "")

            if not username or not password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username and password are required when renaming a connection.",
                )

            _write_vault_creds(new_slug, old_protocol, username, password, vault_client)
            _destroy_vault_path(old_slug, old_protocol, vault_client)
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to move Vault credentials: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update Vault credentials.",
            )

    elif data.username or data.password:
        # In-place credential rotation
        path = _build_vault_path(old_slug, old_protocol)
        try:
            old_creds = read_credentials(path, vault_client) if exists_credentials(path, vault_client) else {}
            merged_username = data.username if data.username else old_creds.get("username", "")
            merged_password = data.password if data.password else old_creds.get("password", "")

            _write_vault_creds(old_slug, old_protocol, merged_username, merged_password, vault_client)
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to rotate Vault credentials at %s: %s", path, e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update credentials in Vault.",
            )

    # Update DB record
    update_fields = data.model_dump(
        mode="json",
        exclude_unset=True,
        exclude={"username", "password"},
    )
    for field, value in update_fields.items():
        setattr(connection, field, value)

    db.commit()
    db.refresh(connection)
    logger.info("LabConnection updated: id=%s user=%s", connection_id, user_id)
    return connection


def delete_connection(
    db: Session,
    connection_id: UUID,
    user_id: str,
    vault_client: hvac.Client,
) -> None:
    connection = get_connection(db, connection_id)
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found.",
        )

    # Permanently destroy all Vault versions for this path
    _destroy_vault_path(connection.slug, connection.protocol, vault_client)

    db.delete(connection)
    db.commit()
    logger.info("LabConnection deleted: id=%s user=%s", connection_id, user_id)