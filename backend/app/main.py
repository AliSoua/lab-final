# app/main.py
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware  # ADD THIS IMPORT
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from pathlib import Path
load_dotenv()

from app.routers.credentials import moderator_credentials_router, admin_credentials_router
from app.routers.users import admin
from app.routers.auth import router as auth_router
from app.routers.vsphere import vcenter_router, esxi_router
from app.routers.LabDefinition import lab_definition_router
from app.routers.profile import routes as profile_router
from app.routers.LabInstance import router as lab_instance_router
from app.routers.LabGuide import guides_router, steps_router

from app.config.connection.postgres_client import init_db  # Changed from create_db_tables/drop_db_tables
from app.routers.database import router as db_admin_router

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

# ============================================
# CORS CONFIGURATION - ADD THIS SECTION
# ============================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:80",
        "http://localhost:5173",    # Vite dev server
        "http://localhost:3000",    # Alternative React dev server
        "http://127.0.0.1:5173",    # Alternative localhost address
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
        "X-Total-Count",
    ],
)


# ============================================
# STATIC FILES - Serve uploaded images
# ============================================
uploads_dir = Path("uploads/images")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/images", StaticFiles(directory=str(uploads_dir)), name="images")

# ============================================
# Include standard routers
app.include_router(moderator_credentials_router)
app.include_router(admin_credentials_router)
app.include_router(auth_router)
app.include_router(admin.router)
app.include_router(vcenter_router)
app.include_router(esxi_router)
app.include_router(lab_definition_router)
app.include_router(profile_router.router)
app.include_router(lab_instance_router) 
app.include_router(guides_router)
app.include_router(steps_router)
app.include_router(db_admin_router)

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
        "/lab-definitions/{lab_id}/guide-blocks",
        "/lab-definitions/{lab_id}/guide-blocks/{block_id}",
        "/lab-definitions/featured",
        "/lab-definitions/{lab_id}/feature",
        "/lab-definitions/{lab_id}/feature/{priority}",
        "/lab-definitions/{lab_id}/unfeature",
        "/profile/me",
        "/profile/me/stats",
        "/profile/sync",
        "/credentials/moderators/wrap-token",
        "/credentials/moderators/hosts",
        "/credentials/moderators/hosts/{esxi_host}",
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