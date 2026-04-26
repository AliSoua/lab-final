# app/routers/LabInstance/lifecycle.py
"""
Lab Instance Lifecycle Operations
POST /lab-instances/ (launch)
POST /lab-instances/{id}/stop
DELETE /lab-instances/{id} (terminate)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.config.connection.postgres_client import get_db
from app.dependencies.keycloak.keycloak_roles import require_any_role
from app.schemas.LabDefinition.lab_instance import (
    LabInstanceCreate,
    LabInstanceResponse,
)
from app.services.LabInstance.LaunchInstance import enqueue_launch
from app.services.LabInstance.ManageInstance import stop_instance
from app.services.LabInstance.TerminateInstance import enqueue_terminate
from .common import get_trainee_id

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
    trainee_id = get_trainee_id(userinfo, db)

    try:
        instance = enqueue_launch(
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


@router.post(
    "/{instance_id}/stop",
    response_model=LabInstanceResponse,
    summary="Stop a running lab instance",
)
def stop_lab_instance(
    instance_id: uuid.UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = get_trainee_id(userinfo, db)
    try:
        return stop_instance(db, instance_id, trainee_id)
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
def terminate_lab_instance(
    instance_id: uuid.UUID,
    db: Session = Depends(get_db),
    userinfo: dict = Depends(require_all),
):
    trainee_id = get_trainee_id(userinfo, db)
    try:
        instance = enqueue_terminate(db, instance_id, trainee_id)
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