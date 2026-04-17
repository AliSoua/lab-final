# app/routers/users/admin.py
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies.keycloak.keycloak_roles import require_role
from app.config.connection.keycloak_client import get_keycloak_connection

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users")
def get_all_users(userinfo=Depends(require_role("admin"))):
    """
    Get all users in the realm.
    Accessible only by users with the 'admin' role.
    """
    try:
        kc_conn = get_keycloak_connection()
        users = kc_conn.get_all_users(brief_representation=True)
        return {"users": users, "total": len(users)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")

@router.get("/users/{user_id}/roles")
def get_user_roles(user_id: str, userinfo=Depends(require_role("admin"))):
    """Get roles for a specific user."""
    try:
        kc_conn = get_keycloak_connection()
        roles = kc_conn.get_user_roles(user_id)
        return {"user_id": user_id, "roles": roles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch roles: {str(e)}")