# app/routers/LabInstance/__init__.py
from fastapi import APIRouter

# Import all sub-routers
from app.routers.LabInstance.audit import router as audit_router
from app.routers.LabInstance.lifecycle import router as lifecycle_router
from app.routers.LabInstance.runtime import router as runtime_router
from app.routers.LabInstance.core import router as core_router
from app.routers.LabInstance.events_sse import router as sse_router

# Main router with prefix and tags
router = APIRouter(
    prefix="",
    tags=["lab-instances"],
    responses={404: {"description": "Not found"}}
)

# Include all sub-routers
# Order matters for route resolution - specific routes before general ones
router.include_router(core_router)
router.include_router(lifecycle_router)
router.include_router(runtime_router)
router.include_router(audit_router)
router.include_router(sse_router)

