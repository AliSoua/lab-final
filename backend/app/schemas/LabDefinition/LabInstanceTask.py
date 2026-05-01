# backend/app/schemas/LabDefinition/LabInstanceTask.py
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class LabInstanceTaskResponse(BaseModel):
    id: UUID
    lab_instance_id: UUID
    task_type: str
    stage: Optional[str] = None
    status: str
    progress_percent: Optional[int] = None
    enqueued_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    worker_pid: Optional[int] = None
    worker_host: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LabInstanceTaskListResponse(BaseModel):
    items: list[LabInstanceTaskResponse]
    total: int