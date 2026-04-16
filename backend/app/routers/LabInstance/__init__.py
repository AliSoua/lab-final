# app/routers/LabInstance/__init__.py
"""
Lab Instance Routers
====================

API endpoints for lab instance lifecycle management.

USER ENDPOINTS:
- List my instances
- Create new instance
- Get instance details (with access URLs)
- Update progress
- Pause/Resume/Stop
- Extend time

ADMIN/MODERATOR ENDPOINTS:
- List all instances (system-wide)
- Force stop instances
- View instance events/logs
"""

from fastapi import APIRouter

from app.routers.LabInstance.ListLabInstance import router as list_router
from app.routers.LabInstance.CreateLabInstance import router as create_router
from app.routers.LabInstance.GetLabInstance import router as get_router
from app.routers.LabInstance.UpdateLabInstance import router as update_router

# Main router - mounts all sub-routers
router = APIRouter(prefix="/lab-instances", tags=["Lab Instances"])

# Include sub-routers
router.include_router(list_router)
router.include_router(create_router)
router.include_router(get_router)
router.include_router(update_router)

__all__ = ["router"]