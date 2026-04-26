# app/routers/LabInstance/common.py

"""
Shared utilities for LabInstance routers.
"""

import uuid
import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.services.user_service import user_service
from app.schemas.user import UserSyncRequest

logger = logging.getLogger(__name__)


def get_trainee_id(userinfo: dict, db: Session) -> uuid.UUID:
    """
    Resolve Keycloak 'sub' to local users.id.
    Auto-creates user profile on first access (same pattern as /profile/me).
    """
    keycloak_id = userinfo.get("sub")
    if not keycloak_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier",
        )

    user = user_service.get_by_keycloak_id(db, keycloak_id)
    if not user:
        # ── Auto-provision on first access ──────────────────────────────
        email = userinfo.get("email")
        username = userinfo.get("preferred_username")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token: missing email claim required for profile sync",
            )

        # Role extraction (mirrors profile/routes.py logic)
        roles = userinfo.get("roles", [])
        if not roles:
            role = "trainee"
        elif "admin" in roles:
            role = "admin"
        elif "moderator" in roles:
            role = "moderator"
        elif "trainee" in roles:
            role = "trainee"
        else:
            role = roles[0]

        sync_data = UserSyncRequest(
            keycloak_id=keycloak_id,
            email=email,
            username=username or email,
            first_name=userinfo.get("given_name"),
            last_name=userinfo.get("family_name"),
            role=role,
        )
        user = user_service.sync_from_keycloak(db, sync_data)
        logger.info(f"Auto-provisioned user on first lab access: {keycloak_id}")
        # ────────────────────────────────────────────────────────────────

    return user.id