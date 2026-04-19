# app/models/LabDefinition/LabGuide.py
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Integer, Text, ARRAY, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class LabGuide(Base):
    """Standalone guide that can be created independently and assigned to labs."""
    __tablename__ = "lab_guides"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Classification
    category = Column(String(100), nullable=True, index=True)
    difficulty = Column(String(50), default="beginner")
    estimated_duration_minutes = Column(Integer, default=30)

    tags = Column(ARRAY(String), default=list, nullable=False)

    # Audit
    created_by = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(255), nullable=True)

    # Publishing
    is_published = Column(Boolean, default=False, index=True)

    # Relationships
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
    """A single step inside a guide. Contains rich content as structured JSONB."""
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

    # Which VM in the lab this step primarily targets (matches LabVM.name)
    target_vm_name = Column(String(255), nullable=True)

    # ── Content Blocks (stored as validated JSONB) ───────────────────────────

    # 1. Theory / Explanation (markdown)
    theory_content = Column(Text, nullable=True)

    # 2. Commands (list of executable commands)
    commands = Column(JSONB, default=list, nullable=False)
    # [{ "label": "Scan target", "command": "nmap -sV 192.168.1.10", "timeout": 300, "sudo": false }]

    # 3. Tasks / Objectives
    tasks = Column(JSONB, default=list, nullable=False)
    # [{ "description": "Find the open ports", "is_required": true }]

    # 4. Hints (progressive, 3 levels)
    hints = Column(JSONB, default=list, nullable=False)
    # [{ "level": 1, "content": "Try a port scanner" }, { "level": 2, "content": "nmap is your friend" }]

    # 5. Validation / Auto-checks
    validations = Column(JSONB, default=list, nullable=False)
    # [{ "type": "port_open", "target_host": "192.168.1.10", "port": 22, "is_blocking": false }]

    # 6. Quiz (one per step, optional)
    quiz = Column(JSONB, nullable=True)
    # { "question": "What port is SSH?", "type": "multiple_choice", "options": ["21","22","80"], "correct_answer": "22" }

    # Scoring
    points = Column(Integer, default=10, nullable=False)

    # Relationships
    guide = relationship("LabGuide", back_populates="steps")

    def __repr__(self):
        return f"<LabGuideStep(id={self.id}, order={self.order}, title={self.title})>"