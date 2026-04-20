# app/models/LabDefinition/LabGuide.py
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Integer, Text, ARRAY, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class LabGuide(Base):
    """Standalone guide. Knows nothing about running VMs."""
    __tablename__ = "lab_guides"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    title = Column(String(255), nullable=False)

    created_by = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(255), nullable=True)

    is_published = Column(Boolean, default=False, index=True)

    steps = relationship(
        "LabGuideStep",
        back_populates="guide",
        cascade="all, delete-orphan",
        order_by="LabGuideStep.order"
    )

    lab_definitions = relationship("LabDefinition", back_populates="guide")

    def __repr__(self):
        return f"<LabGuide(id={self.id}, title={self.title}, steps={len(self.steps)})>"


class LabGuideStep(Base):
    """
    Pedagogical container.
    VM-agnostic. Execution targets live inside commands & validations only.
    """
    __tablename__ = "lab_guide_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    guide_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lab_guides.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    order = Column(Integer, default=0, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # ── Pure Content (no VM coupling) ────────────────────────────────────────
    theory_content = Column(Text, nullable=True)

    # ── Execution (runtime-bound) ────────────────────────────────────────────
    commands = Column(JSONB, default=list, nullable=False)
    # Each command MAY specify target.vm_name. If omitted, runtime resolves it.

    # ── Assessment ───────────────────────────────────────────────────────────
    # 1. Cognitive (quiz) — no VM needed
    quiz = Column(JSONB, nullable=True)

    # 2. Procedural (checklist) — learner self-reports, no VM needed
    tasks = Column(JSONB, default=list, nullable=False)

    # 3. Automated (validation) — MAY target a VM, but step itself is agnostic
    validations = Column(JSONB, default=list, nullable=False)

    # ── Support ──────────────────────────────────────────────────────────────
    hints = Column(JSONB, default=list, nullable=False)

    # ── Scoring ──────────────────────────────────────────────────────────────
    points = Column(Integer, default=10, nullable=False)

    guide = relationship("LabGuide", back_populates="steps")

    def __repr__(self):
        return f"<LabGuideStep(id={self.id}, order={self.order}, title={self.title})>"