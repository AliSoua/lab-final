# app/routers/LabDefinition/lab_instances.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.config.connection.postgres_client import get_db
from app.services.LabDefinition.lab_instance_service import LabInstanceService
from app.services.user_service import user_service  
from app.schemas.LabDefinition.lab_instance import (
    LabInstanceCreate,
    LabInstanceResponse,
    LabInstanceListResponse,
    LabInstanceStatusResponse,
)
from app.schemas.LabDefinition.LabInstanceTask import (
    LabInstanceTaskResponse,
    LabInstanceTaskListResponse,
)
from app.schemas.LabDefinition.LabInstanceEvent import (
    LabInstanceEventLogResponse,
    LabInstanceEventLogListResponse,
)
from app.models.LabDefinition.LabInstanceTask import LabInstanceTask
from app.models.LabDefinition.LabInstanceEventLog import LabInstanceEventLog
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.schemas.user import UserSyncRequest
import logging
logger = logging.getLogger(__name__)

require_all = require_any_role(["trainee", "moderator", "admin"])


router = APIRouter(
    prefix="/lab-instances",
    tags=["lab-instances"],
    responses={
        401: {"description": "Unauthorized - Invalid or missing token"},
        403: {"description": "Forbidden - Insufficient permissions"},
        404: {"description": "Lab instance not found"},
    }
)
lab_instance_service = LabInstanceService()


def _get_trainee_id(userinfo: dict, db: Session) -> uuid.UUID:
    """
    Resolve Keycloak 'sub' to local users.id.
    Auto-creates user profile on first access (same pattern as /profile/me).
    """
    keycloak_id = userinfo.get("sub")
    if not keycloak_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier",
        )

    user = user_service.get_by_keycloak_id(db, keycloak_id)
    if not user:
        # ── Auto-provision on first access ──────────────────────────────
        email = userinfo.get("email")
        username = userinfo.get("preferred_username")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token: missing email claim required for profile sync",
            )

        # Role extraction (mirrors profile/routes.py logic)
        roles = userinfo.get("roles", [])
        if not roles:
            role = "trainee"
        elif "admin" in roles:
            role = "admin"
        elif "moderator" in roles:
            role = "moderator"
        elif "trainee" in roles:
            role = "trainee"
        else:
            role = roles[0]

        sync_data = UserSyncRequest(
            keycloak_id=keycloak_id,
            email=email,
            username=username or email,
            first_name=userinfo.get("given_name"),
            last_name=userinfo.get("family_name"),
            role=role,
        )
        user = user_service.sync_from_keycloak(db, sync_data)
        logger.info(f"Auto-provisioned user on first lab access: {keycloak_id}")
        # ────────────────────────────────────────────────────────────────

    return user.id


@router.post(
    "/",
    response_model=LabInstanceResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Launch a lab instance",
)
def launch_lab_instance(
    data: LabInstanceCreate,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = _get_trainee_id(userinfo, db)

    try:
        instance = lab_instance_service.enqueue_launch(
            db=db,
            lab_definition_id=data.lab_definition_id,
            trainee_id=trainee_id,
        )
        return instance
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to launch lab instance: {str(e)}",
        )


@router.get(
    "/",
    response_model=LabInstanceListResponse,
    summary="List my lab instances",
)
def list_my_instances(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = _get_trainee_id(userinfo, db)
    items, total = lab_instance_service.list_instances(
        db, trainee_id, skip, limit
    )
    return LabInstanceListResponse(items=items, total=total)


@router.get(
    "/{instance_id}",
    response_model=LabInstanceResponse,
    summary="Get lab instance details",
)
def get_instance(
    instance_id: uuid.UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = _get_trainee_id(userinfo, db)
    instance = lab_instance_service.get_instance(
        db, instance_id, trainee_id
    )
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found",
        )
    return instance


@router.post(
    "/{instance_id}/refresh",
    response_model=LabInstanceResponse,
    summary="Refresh instance status from vCenter and sync Guacamole connections",
)
def refresh_instance_status(
    instance_id: uuid.UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = _get_trainee_id(userinfo, db)
    try:
        instance = lab_instance_service.refresh_instance_status(
            db, instance_id, trainee_id
        )
        if not instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instance not found",
            )
        return instance
    except HTTPException:
        raise
    except TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Refresh timed out while communicating with vCenter",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh status: {str(e)}",
        )


@router.post(
    "/{instance_id}/stop",
    response_model=LabInstanceResponse,
    summary="Stop a running lab instance",
)
def stop_instance(
    instance_id: uuid.UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = _get_trainee_id(userinfo, db)
    try:
        return lab_instance_service.stop_instance(
            db, instance_id, trainee_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop instance: {str(e)}",
        )


@router.delete(
    "/{instance_id}",
    response_model=LabInstanceResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Terminate and delete a lab instance",
)
def terminate_instance(
    instance_id: uuid.UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = _get_trainee_id(userinfo, db)
    try:
        instance = lab_instance_service.enqueue_terminate(
            db, instance_id, trainee_id
        )
        return instance
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to terminate instance: {str(e)}",
        )

@router.get(
    "/{instance_id}/tasks",
    response_model=LabInstanceTaskListResponse,
    summary="List audit tasks for a lab instance",
)
def list_instance_tasks(
    instance_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = _get_trainee_id(userinfo, db)
    instance = lab_instance_service.get_instance(db, instance_id, trainee_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found",
        )

    query = db.query(LabInstanceTask).filter(
        LabInstanceTask.lab_instance_id == instance_id
    )
    total = query.count()
    items = (
        query.order_by(LabInstanceTask.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return LabInstanceTaskListResponse(
        items=[LabInstanceTaskResponse.model_validate(t) for t in items],
        total=total,
    )


@router.get(
    "/{instance_id}/tasks/{task_id}",
    response_model=LabInstanceTaskResponse,
    summary="Get a single audit task",
)
def get_instance_task(
    instance_id: uuid.UUID,
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = _get_trainee_id(userinfo, db)
    instance = lab_instance_service.get_instance(db, instance_id, trainee_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found",
        )

    task = (
        db.query(LabInstanceTask)
        .filter(
            LabInstanceTask.id == task_id,
            LabInstanceTask.lab_instance_id == instance_id,
        )
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return task


@router.get(
    "/{instance_id}/events",
    response_model=LabInstanceEventLogListResponse,
    summary="List audit events for a lab instance",
)
def list_instance_events(
    instance_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = _get_trainee_id(userinfo, db)
    instance = lab_instance_service.get_instance(db, instance_id, trainee_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instance not found",
        )

    query = db.query(LabInstanceEventLog).filter(
        LabInstanceEventLog.lab_instance_id == instance_id
    )
    total = query.count()
    items = (
        query.order_by(LabInstanceEventLog.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return LabInstanceEventLogListResponse(
        items=[LabInstanceEventLogResponse.model_validate(e) for e in items],
        total=total,
    )