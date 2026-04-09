# app/routers/vsphere/__init__.py
from .vcenter import router as vcenter_router
from .esxi import router as esxi_router

__all__ = ["vcenter_router", "esxi_router"]