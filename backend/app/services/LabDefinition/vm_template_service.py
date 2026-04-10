# app/services/LabDefinition/vm_template_service.py
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.LabDefinition.VMTemplate import VMTemplate
from app.schemas.LabDefinition.VMTemplate import (
    VMTemplateCreate,
    VMTemplateUpdate
)


class VMTemplateService:
    """
    Business logic for VM Templates (vSphere base images)
    """

    def create(self, db: Session, data: VMTemplateCreate) -> VMTemplate:
        vm = VMTemplate(**data.model_dump())
        db.add(vm)
        db.commit()
        db.refresh(vm)
        return vm

    def get(self, db: Session, vm_id: UUID) -> VMTemplate | None:
        return db.query(VMTemplate).filter(VMTemplate.id == vm_id).first()

    def list_all(self, db: Session) -> list[VMTemplate]:
        return db.query(VMTemplate).all()

    def update(
        self,
        db: Session,
        vm: VMTemplate,
        data: VMTemplateUpdate
    ) -> VMTemplate:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(vm, key, value)

        db.commit()
        db.refresh(vm)
        return vm

    def delete(self, db: Session, vm: VMTemplate) -> None:
        db.delete(vm)
        db.commit()