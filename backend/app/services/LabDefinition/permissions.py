# app/services/LabDefinition/permissions.py
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.query import Query

from app.models.LabDefinition.core import LabDefinition


class LabPermissions:
    """Business logic for LabDefinition access control"""
    
    @staticmethod
    def check_ownership(lab: LabDefinition, current_user: dict) -> bool:
        """
        Check if the current user can access/modify the lab.
        
        Rules:
        - Admin: full access to all labs
        - Moderator: only access to labs they created (created_by == user.sub)
        """
        user_roles = current_user.get("roles", [])
        user_sub = current_user.get("sub")
        
        # Admin can access everything
        if "admin" in user_roles:
            return True
        
        # Moderator can only access their own labs
        if "moderator" in user_roles:
            if str(lab.created_by) != str(user_sub):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You can only manage lab definitions you created"
                )
            return True
        
        # Should not reach here if require_any_role(["admin", "moderator"]) is used
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Insufficient permissions"
        )

    @staticmethod
    def filter_by_ownership(query: Query, current_user: dict) -> Query:
        """
        Filter labs query based on user role.
        
        - Admin: sees all labs
        - Moderator: sees only their own labs
        """
        user_roles = current_user.get("roles", [])
        user_sub = current_user.get("sub")
        
        # Admin sees all labs - no filter applied
        if "admin" in user_roles:
            return query
        
        # Moderator sees only their own labs
        if "moderator" in user_roles:
            return query.filter(LabDefinition.created_by == user_sub)
        
        # Fallback - should not happen if proper auth is enforced
        return query.filter(LabDefinition.created_by == user_sub)