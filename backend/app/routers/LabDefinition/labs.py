# app/routers/LabDefinition/labs.py
from fastapi import APIRouter

# Import all sub-routers
from app.routers.LabDefinition.ListLabDefinition import router as list_router
from app.routers.LabDefinition.CreateLabDefinition import router as create_router
from app.routers.LabDefinition.GetLabDefinition import router as get_router
from app.routers.LabDefinition.UpdateLabDefinition import router as update_router
from app.routers.LabDefinition.PublishLabDefinition import router as publish_router
from app.routers.LabDefinition.DeleteLabDefinition import router as delete_router
from app.routers.LabDefinition.LabVMManagement import router as vm_router
from app.routers.LabDefinition.LabGuideManagement import router as guide_router
from app.routers.LabDefinition.FeatureLabDefinition import router as feature_router

# Import lab instances router
from app.routers.LabDefinition.lab_instances import router as lab_instances_router

# Main router with prefix and tags
router = APIRouter(
    prefix="/lab-definitions",
    tags=["lab-definitions"],
    responses={404: {"description": "Not found"}}
)

# Include all sub-routers
# Order matters for route resolution - specific routes before general ones
router.include_router(list_router)           # GET /
router.include_router(create_router)         # POST /, POST /full
router.include_router(publish_router)        # POST /{lab_id}/publish
router.include_router(vm_router)             # POST/GET /{lab_id}/vms, PUT/DELETE /{lab_id}/vms/{vm_id}
router.include_router(get_router)            # GET /{lab_id}, GET /slug/{slug}
router.include_router(update_router)         # PUT /{lab_id}
router.include_router(delete_router)         # DELETE /{lab_id}
router.include_router(guide_router)          # /{lab_id}/guide-blocks/*
router.include_router(feature_router)        # /{lab_id}/feature, /{lab_id}/unfeature, /{lab_id}/priority 


router.include_router(lab_instances_router)  # /{lab_id}/instances/*
