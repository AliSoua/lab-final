# app/main.py
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from dotenv import load_dotenv

load_dotenv()

# Check test mode
TEST_MODE = os.getenv("TEST_MODE", "false").lower() == "true"

from app.routers.credentials import router as credentials_router
from app.routers.users import admin
from app.routers.auth import router as auth_router
from app.routers.vsphere import vcenter_router, esxi_router
from app.routers.LabDefinition import lab_definition_router
from app.config.connection.postgres_client import init_db  # Changed from create_db_tables/drop_db_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────────
    # Initialize database: creates tables (optionally drops first if uncommented in init_db)
    init_db()
    
    yield

    # ── Shutdown ───────────────────────────────────────────────────────────────
    # No database cleanup on shutdown (data persists between restarts)
    pass


app = FastAPI(
    title="Lab Platform API",
    version="1.0.0",
    description="API with Keycloak Authentication",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

# Security scheme
security = HTTPBearer(auto_error=False)

# Include standard routers
app.include_router(credentials_router)
app.include_router(auth_router)
app.include_router(admin.router)
app.include_router(vcenter_router)
app.include_router(esxi_router)
app.include_router(lab_definition_router)

# Conditionally include test routers
if TEST_MODE:
    from app.routers.vsphere.esxi_test import router as esxi_test_router
    from app.routers.vsphere.vcenter_test import router as vcenter_test_router
    
    app.include_router(esxi_test_router)
    app.include_router(vcenter_test_router)
    
    print(f"⚠️  TEST MODE ENABLED:")
    print(f"   - ESXi test routes: /vsphere/esxi-test/")
    print(f"   - vCenter test routes: /vsphere/vcenter-test/")
    print(f"   Using ESXi host: {os.getenv('ESXI_TEST_HOST', 'Not set')}")
    print(f"   Using vCenter host: {os.getenv('VCENTER_HOST', 'Not set')}")

@app.get("/")
def root():
    return {"message": "Lab Platform API is running"}

# Custom OpenAPI schema with Bearer security
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Lab Platform API",
        version="1.0.0",
        description="Lab Platform API with Keycloak Auth",
        routes=app.routes,
    )
    
    # Add Bearer security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'"
        }
    }
    
    # Apply security to specific paths (production routes only)
    paths_to_secure = [
        "/auth/check",
        "/auth/logout", 
        "/admin/users", 
        "/admin/users/{user_id}/roles",
        "/credentials/moderators/",
        "/credentials/moderators/{user_id}",
        "/vsphere/vcenter/health",  # Production vCenter routes
        "/vsphere/vcenter/hosts",
        "/vsphere/vcenter/templates",
        "/vsphere/esxi/connection",  # Production ESXi routes
        "/vsphere/esxi/templates",
        "/vsphere/esxi/info",
        "/lab-definitions/",
        "/lab-definitions/full",
        "/lab-definitions/{lab_id}",
    ]
    
    for path in paths_to_secure:
        if path in openapi_schema["paths"]:
            for method in openapi_schema["paths"][path]:
                openapi_schema["paths"][path][method]["security"] = [{"bearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Custom Swagger UI
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="Lab Platform API - Swagger UI",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
        swagger_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
        init_oauth={
            "clientId": "lab-backend",
            "usePkceWithAuthorizationCodeGrant": True,
        },
    )

@app.get("/openapi.json", include_in_schema=False)
async def get_openapi_endpoint():
    return custom_openapi()