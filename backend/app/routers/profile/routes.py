# app/routers/profile/routes.py
"""
Profile router for user management.
Authenticated users can view/update their own profile.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config.connection.postgres_client import get_db
from app.services.user_service import user_service
from app.schemas.user import UserResponse, UserProfileUpdate, UserStatsResponse, UserSyncRequest
from app.dependencies.keycloak.keycloak_roles import require_any_role

router = APIRouter(
    prefix="/profile",
    tags=["profile"],
    responses={
        401: {"description": "Unauthorized - Invalid or missing token"},
        403: {"description": "Forbidden - Insufficient permissions"},
        404: {"description": "User profile not found"},
    }
)


def _extract_role(current_user: dict) -> str:
    """
    Extract the primary role from current_user.
    Priority: admin > moderator > trainee
    """
    roles = current_user.get("roles", [])

    if not roles:
        return "trainee"

    # Priority order
    if "admin" in roles:
        return "admin"
    elif "moderator" in roles:
        return "moderator"
    elif "trainee" in roles:
        return "trainee"
    else:
        # Fallback to first role if none of the expected ones
        return roles[0]


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    description="Returns the full profile of the authenticated user. Auto-creates profile on first access.",
)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role(["trainee", "moderator", "admin"])),
):
    """
    Get current user's full profile including platform metadata.
    Called by frontend when user clicks "Profile" or on app load.

    Auto-creates user profile from Keycloak data if not exists.
    """
    keycloak_id = current_user.get("sub")
    email = current_user.get("email")
    username = current_user.get("preferred_username")

    if not keycloak_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token: missing required claims (sub or email)"
        )

    # Try to find existing user
    user = user_service.get_by_keycloak_id(db, keycloak_id)

    if not user:
        # First time access - create from Keycloak data
        sync_data = UserSyncRequest(
            keycloak_id=keycloak_id,
            email=email,
            username=username or email,  # Fallback to email if username missing
            first_name=current_user.get("given_name"),
            last_name=current_user.get("family_name"),
            role=_extract_role(current_user)
        )
        user = user_service.sync_from_keycloak(db, sync_data)

    return user


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
    description="Updates editable profile fields. Keycloak fields (email, name, role) are read-only.",
)
def update_my_profile(
    data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role(["trainee", "moderator", "admin"])),
):
    """
    Update current user's profile (editable fields only).

    Editable fields:
    - avatar_url, bio, job_title, department, phone, timezone
    - preferences (theme, notifications, language, email_digest)

    Keycloak fields (email, first_name, last_name, role) cannot be changed here.
    """
    keycloak_id = current_user.get("sub")

    if not keycloak_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token: missing sub claim"
        )

    user = user_service.get_by_keycloak_id(db, keycloak_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Please access /profile/me first to create profile."
        )

    updated_user = user_service.update_profile(db, user.id, data)
    return updated_user


@router.get(
    "/me/stats",
    response_model=UserStatsResponse,
    summary="Get user statistics",
    description="Returns quick stats for dashboard widgets.",
)
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role(["trainee", "moderator", "admin"])),
):
    """
    Get user's platform statistics formatted for dashboard display.

    Returns:
    - labs_completed, labs_in_progress
    - total_time_hours (converted from minutes)
    - skill_level, points, streak_days
    - badges_count, certifications_count
    """
    keycloak_id = current_user.get("sub")

    if not keycloak_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token: missing sub claim"
        )

    user = user_service.get_by_keycloak_id(db, keycloak_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserStatsResponse(
        labs_completed=user.total_labs_completed,
        labs_in_progress=user.total_labs_in_progress,
        total_time_hours=user.total_time_spent_minutes // 60,
        skill_level=user.skill_level,
        points=user.points,
        streak_days=user.streak_days,
        badges_count=len(user.badges) if user.badges else 0,
        certifications_count=len(user.certifications) if user.certifications else 0,
    )


@router.post(
    "/sync",
    summary="Sync profile from Keycloak",
    description="Force sync user data from Keycloak. Useful when Keycloak data changes.",
)
def sync_user_from_keycloak(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role(["trainee", "moderator", "admin"])),
):
    """
    Force sync user profile from Keycloak data.
    Updates email, username, first_name, last_name, role from Keycloak.
    """
    keycloak_id = current_user.get("sub")
    email = current_user.get("email")
    username = current_user.get("preferred_username")

    if not keycloak_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token: missing required claims"
        )

    sync_data = UserSyncRequest(
        keycloak_id=keycloak_id,
        email=email,
        username=username or email,
        first_name=current_user.get("given_name"),
        last_name=current_user.get("family_name"),
        role=_extract_role(current_user)
    )

    user = user_service.sync_from_keycloak(db, sync_data)
    return {
        "message": "Profile synced successfully from Keycloak",
        "user_id": str(user.id),
        "synced_at": user.synced_at.isoformat() if user.synced_at else None
    }