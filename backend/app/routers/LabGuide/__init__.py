# app/routers/LabGuide/__init__.py
from app.routers.LabGuide.guides import router as guides_router
from app.routers.LabGuide.steps import router as steps_router

__all__ = ["guides_router", "steps_router"]