# app/routers/LabInstance/events_sse.py
"""
SSE Event Stream for Lab Instances
Streams LabInstanceEventLog rows in real-time for a specific instance.
"""

import asyncio
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, Cookie
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.config.connection.postgres_client import get_db
from app.dependencies.keycloak.keycloak_roles import require_any_role, verify_token
from app.models.LabDefinition.LabInstance import LabInstance
from app.models.LabDefinition.LabInstanceEventLog import LabInstanceEventLog
from app.schemas.LabDefinition.LabInstanceEvent import LabInstanceEventLogResponse

from .common import get_trainee_id

logger = logging.getLogger(__name__)

require_all = require_any_role(["trainee", "moderator", "admin"])

router = APIRouter(
    prefix="/lab-instances",
    tags=["lab-instance-events"],
    responses={
        401: {"description": "Unauthorized - Invalid or missing token"},
        403: {"description": "Forbidden - Insufficient permissions"},
        404: {"description": "Lab instance not found"},
    },
)


def _serialize_event(event: LabInstanceEventLog) -> str:
    """Serialize a single event log row into an SSE data line."""
    payload = {
        "id": str(event.id),
        "task_id": str(event.task_id),
        "lab_instance_id": str(event.lab_instance_id),
        "event_type": event.event_type,
        "event_code": event.event_code,
        "source": event.source,
        "severity": event.severity,
        "message": event.message,
        "metadata": event.metadata_ or {},
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }
    return f"data: {json.dumps(payload)}\n\n"


async def _event_stream(
    instance_id: uuid.UUID,
    db: Session,
    last_seen: Optional[datetime],
    severity_filter: Optional[str],
    source_filter: Optional[str],
    poll_interval: float = 5.0,
):
    """
    Async generator that polls the DB for new events and yields SSE lines.
    """
    while True:
        query = (
            db.query(LabInstanceEventLog)
            .filter(LabInstanceEventLog.lab_instance_id == instance_id)
        )

        if last_seen:
            query = query.filter(LabInstanceEventLog.created_at > last_seen)

        if severity_filter:
            query = query.filter(LabInstanceEventLog.severity == severity_filter)

        if source_filter:
            query = query.filter(LabInstanceEventLog.source == source_filter)

        events = query.order_by(LabInstanceEventLog.created_at.asc()).all()

        for event in events:
            yield _serialize_event(event)
            last_seen = event.created_at

        # Heartbeat to keep connection alive
        yield ":heartbeat\n\n"

        await asyncio.sleep(poll_interval)


@router.get(
    "/{instance_id}/events",
    response_class=StreamingResponse,
    summary="SSE stream of lab instance events",
    responses={
        200: {
            "description": "Server-sent event stream",
            "content": {
                "text/event-stream": {
                    "example": 'data: {"event_type":"stage_persisted","severity":"info","message":"..."}\n\n'
                }
            },
        },
    },
)
def instance_events(
    instance_id: uuid.UUID,
    request: Request,
    severity: Optional[str] = Query(None, description="Filter by severity (info, warning, error, critical)"),
    source: Optional[str] = Query(None, description="Filter by source (system, worker, vcenter, guacamole, user)"),
    access_token: Optional[str] = Cookie(None, alias="access_token"),
    db: Session = Depends(get_db),
):
    """
    Stream real-time events for a lab instance via SSE.

    Auth: reads `access_token` from HTTP cookie (browser sends it automatically
    with EventSource). Falls back to standard bearer header if cookie missing.

    - Trainees can only stream their own instances.
    - Moderators/admins can stream any instance.
    - Optionally filter by `severity` or `source`.
    """
    # ── Auth: try cookie first, then Authorization header ────────────────
    token = access_token

    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token",
        )

    try:
        userinfo = verify_token(token)
    except Exception as e:
        logger.warning("SSE auth failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # ── Instance lookup ────────────────────────────────────────────────
    instance = db.query(LabInstance).filter(LabInstance.id == instance_id).first()
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found",
        )

    # ── Ownership check ──────────────────────────────────────────────────
    trainee_id = get_trainee_id(userinfo, db)
    user_roles = userinfo.get("realm_access", {}).get("roles", [])

    if "admin" not in user_roles and "moderator" not in user_roles:
        if str(instance.trainee_id) != str(trainee_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only stream events for your own instances",
            )

    # ── Stream ─────────────────────────────────────────────────────────
    last_seen = datetime.now(timezone.utc)

    async def stream():
        async for line in _event_stream(
            instance_id=instance_id,
            db=db,
            last_seen=last_seen,
            severity_filter=severity,
            source_filter=source,
            poll_interval=2.0,
        ):
            yield line

            if await request.is_disconnected():
                logger.info("SSE client disconnected | instance_id=%s", instance_id)
                break

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )