# app/services/user_service.py
"""
User service for profile management and Keycloak sync.
Follows the service pattern from file_upload_service.py.
"""
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
import logging

from app.models.user import User
from app.schemas.user import (
    UserSyncRequest,
    UserProfileUpdate,
    UserStatsUpdate,
    BadgeGrant,
    UserResponse,
)

logger = logging.getLogger(__name__)


class UserService:
    """
    Service class for user operations.
    Handles Keycloak sync, profile updates, and stats management.
    """

    # ==============================================================================
    # Retrieval Methods
    # ==============================================================================

    @staticmethod
    def get_by_id(db: Session, user_id: UUID) -> Optional[User]:
        """Get user by internal UUID."""
        return db.get(User, user_id)

    @staticmethod
    def get_by_keycloak_id(db: Session, keycloak_id: str) -> Optional[User]:
        """Get user by Keycloak ID (sub claim)."""
        return db.query(User).filter(User.keycloak_id == keycloak_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email address."""
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_by_username(db: Session, username: str) -> Optional[User]:
        """Get user by username."""
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def list_users(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[User]:
        """
        List users with optional filtering.
        For admin user management.
        """
        query = db.query(User)

        if role:
            query = query.filter(User.role == role)
        if is_active is not None:
            query = query.filter(User.is_active == is_active)

        return query.order_by(desc(User.created_at)).offset(skip).limit(limit).all()

    # ==============================================================================
    # Keycloak Sync
    # ==============================================================================

    @staticmethod
    def sync_from_keycloak(db: Session, data: UserSyncRequest) -> User:
        """
        Sync user data from Keycloak on login.

        - If user exists: update Keycloak fields
        - If user new: create with default platform metadata

        Args:
            db: Database session
            data: Sync request from Keycloak token

        Returns:
            User: Synced user model
        """
        user = UserService.get_by_keycloak_id(db, data.keycloak_id)

        now = datetime.now(timezone.utc)

        if user:
            # Update existing user from Keycloak
            user.email = data.email
            user.username = data.username
            user.first_name = data.first_name
            user.last_name = data.last_name
            user.role = data.role
            user.last_login_at = now
            user.synced_at = now
            logger.info(f"Synced existing user: {data.email}")
        else:
            # Create new user with defaults
            user = User(
                keycloak_id=data.keycloak_id,
                email=data.email,
                username=data.username,
                first_name=data.first_name,
                last_name=data.last_name,
                role=data.role,
                last_login_at=now,
                synced_at=now,
                # Platform defaults
                skill_level="beginner",
                certifications=[],
                badges=[],
                preferences={
                    "theme": "light",
                    "notifications": True,
                    "language": "en",
                    "email_digest": True,
                },
            )
            db.add(user)
            logger.info(f"Created new user from Keycloak: {data.email}")

        db.commit()
        db.refresh(user)
        return user

    # ==============================================================================
    # Profile Updates (Editable Fields)
    # ==============================================================================

    @staticmethod
    def update_profile(db: Session, user_id: UUID, data: UserProfileUpdate) -> User:
        """
        Update user profile (editable fields only).
        Keycloak fields (email, name, role) cannot be changed here.

        Args:
            db: Database session
            user_id: User UUID
            data: Profile update data

        Returns:
            User: Updated user

        Raises:
            HTTPException: If user not found
        """
        user = UserService.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Update only provided fields
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if field == "preferences" and value is not None:
                # Merge preferences instead of replacing
                current_prefs = user.preferences or {}
                current_prefs.update(value)
                setattr(user, field, current_prefs)
            else:
                setattr(user, field, value)

        db.commit()
        db.refresh(user)
        logger.info(f"Updated profile for user: {user.email}")
        return user

    # ==============================================================================
    # Stats & Gamification (Internal Platform Use)
    # ==============================================================================

    @staticmethod
    def update_stats(db: Session, user_id: UUID, data: UserStatsUpdate) -> User:
        """
        Update user platform stats.
        Called by lab completion hooks, etc.

        Args:
            db: Database session
            user_id: User UUID
            data: Stats update data

        Returns:
            User: Updated user
        """
        user = UserService.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        update_data = data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            if hasattr(user, key):
                setattr(user, key, value)

        # Always update last_activity_at for stats updates
        user.last_activity_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def grant_badge(db: Session, user_id: UUID, badge: BadgeGrant) -> User:
        """
        Grant a badge to user.

        Args:
            db: Database session
            user_id: User UUID
            badge: Badge to grant

        Returns:
            User: Updated user
        """
        user = UserService.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Initialize badges if None
        badges = user.badges or []

        # Check if badge already exists
        if any(b.get("id") == badge.id for b in badges):
            logger.warning(f"User {user.email} already has badge {badge.id}")
            return user

        # Add new badge with timestamp
        new_badge = {
            "id": badge.id,
            "name": badge.name,
            "icon": badge.icon,
            "earned_at": datetime.now(timezone.utc).isoformat(),
        }
        badges.append(new_badge)
        user.badges = badges

        db.commit()
        db.refresh(user)
        logger.info(f"Granted badge '{badge.name}' to user: {user.email}")
        return user

    @staticmethod
    def add_points(db: Session, user_id: UUID, points: int) -> User:
        """
        Add points to user (can be negative for deductions).

        Args:
            db: Database session
            user_id: User UUID
            points: Points to add (positive or negative)

        Returns:
            User: Updated user
        """
        user = UserService.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        user.points = max(0, user.points + points)  # Prevent negative points
        user.last_activity_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(user)
        return user

    # ==============================================================================
    # User Management (Admin)
    # ==============================================================================

    @staticmethod
    def deactivate_user(db: Session, user_id: UUID) -> User:
        """Deactivate user account."""
        user = UserService.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        user.is_active = False
        db.commit()
        db.refresh(user)
        logger.info(f"Deactivated user: {user.email}")
        return user

    @staticmethod
    def activate_user(db: Session, user_id: UUID) -> User:
        """Activate user account."""
        user = UserService.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        user.is_active = True
        db.commit()
        db.refresh(user)
        logger.info(f"Activated user: {user.email}")
        return user

    @staticmethod
    def delete_user(db: Session, user_id: UUID) -> None:
        """
        Permanently delete user.
        Use with caution - consider deactivation instead.
        """
        user = UserService.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        db.delete(user)
        db.commit()
        logger.info(f"Deleted user: {user.email}")


# Singleton instance (pattern from file_upload_service.py)
user_service = UserService()