# app/services/LabDefinition/lab_vm_service.py
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.LabDefinition.LabVM import LabVM
from app.schemas.LabDefinition.LabVM import LabVMCreate, LabVMUpdate


class LabVMService:
    """
    Handles VM instances inside a LabDefinition (NOT runtime VMs)
    """

    def create(self, db: Session, data: LabVMCreate) -> LabVM:
        vm = LabVM(**data.model_dump())
        db.add(vm)
        db.commit()
        db.refresh(vm)
        return vm

    def get(self, db: Session, vm_id: UUID) -> LabVM | None:
        return db.query(LabVM).filter(LabVM.id == vm_id).first()

    def get_by_lab(self, db: Session, lab_id: UUID) -> list[LabVM]:
        return (
            db.query(LabVM)
            .filter(LabVM.lab_id == lab_id)
            .order_by(LabVM.order)
            .all()
        )

    def update(
        self,
        db: Session,
        vm: LabVM,
        data: LabVMUpdate
    ) -> LabVM:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(vm, key, value)

        db.commit()
        db.refresh(vm)
        return vm

    def delete(self, db: Session, vm: LabVM) -> None:
        db.delete(vm)
        db.commit()