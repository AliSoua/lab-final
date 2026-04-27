# app/main.py
import os
import logging
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.logging import configure_logging

# ── Configure logging BEFORE any other imports that might use logging ──
configure_logging()

logger = logging.getLogger(__name__)

from app.routers.credentials import moderator_credentials_router, admin_credentials_router
from app.routers.users import admin
from app.routers.auth import router as auth_router
from app.routers.vsphere import vcenter_router, esxi_router
from app.routers.LabDefinition import lab_definition_router
from app.routers.profile import routes as profile_router
from app.routers.LabGuide import guides_router

from app.config.connection.postgres_client import init_db
from app.utils.db_session import background_session
from app.models.LabDefinition.LabInstanceTask import LabInstanceTask
from app.models.LabDefinition.LabInstance import LabInstance
from app.models.LabDefinition.LabInstanceEventLog import LabInstanceEventLog
from app.routers.database import router as db_admin_router
from app.routers.LabInstance import router as LabInstance_router
from app.config.settings import settings


def _reap_unsent_tasks() -> None:
    """
    Startup reaper: tasks queued in our audit table but never published
    to Redis (API crashed between INSERT and apply_async).
    Celery handles all other orphan cases via acks_late.
    """
    with background_session() as db:
        stuck = (
            db.query(LabInstanceTask)
            .filter(
                LabInstanceTask.status == "queued",
                LabInstanceTask.enqueued_at < datetime.utcnow() - timedelta(seconds=60),
            )
            .all()
        )

        for task in stuck:
            task.status = "failed"
            task.error_message = "task never published"
            task.finished_at = datetime.utcnow()

            instance = (
                db.query(LabInstance)
                .filter(LabInstance.id == task.lab_instance_id)
                .first()
            )
            if instance and instance.status in ("provisioning", "terminating"):
                instance.status = "failed"
                instance.error_message = "task never published"

            event = LabInstanceEventLog(
                task_id=task.id,
                lab_instance_id=task.lab_instance_id,
                event_type="task_failed",
                message="Task was queued but never published to Redis (API crash during enqueue)",
                metadata_={},
            )
            db.add(event)

        db.commit()

        logger.warning(
            "Marked %d stuck task(s) as failed (never published to Redis)",
            len(stuck),
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────────
    init_db()
    _reap_unsent_tasks()

    yield

    # ── Shutdown ───────────────────────────────────────────────────────────────
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
# CORS CONFIGURATION
# ============================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://{settings.HOST_IP}",
        f"http://{settings.HOST_IP}:80",
        f"http://{settings.HOST_IP}:5173",
        "http://localhost:8080",
        "http://localhost:80",
        "http://localhost:5173",
        "http://guacamole:8080/guacamole",
        "http://guacamole-web:8080/guacamole",
        "http://guacamole-web:8081/guacamole",
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
# STATIC FILES
# ============================================
uploads_dir = Path("uploads/images")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/images", StaticFiles(directory=str(uploads_dir)), name="images")

# ============================================
# Include standard routers
# ============================================
app.include_router(moderator_credentials_router)
app.include_router(admin_credentials_router)
app.include_router(auth_router)
app.include_router(admin.router)
app.include_router(vcenter_router)
app.include_router(esxi_router)
app.include_router(lab_definition_router)
app.include_router(profile_router.router)
app.include_router(guides_router)
app.include_router(db_admin_router)
app.include_router(LabInstance_router)


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

    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'"
        }
    }

    paths_to_secure = [
        "/auth/check",
        "/auth/guacamole-sso",
        "/auth/logout",
        "/admin/users",
        "/admin/users/{user_id}/roles",
        "/credentials/moderators/",
        "/credentials/moderators/{user_id}",
        "/vsphere/vcenter/health",
        "/vsphere/vcenter/hosts",
        "/vsphere/vcenter/templates",
        "/vsphere/esxi/connection",
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