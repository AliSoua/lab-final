# app/models/LabDefinition/LabGuideBlock.py
import uuid
from enum import Enum as PyEnum

from sqlalchemy import Column, String, Integer, ForeignKey, Text, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base


class GuideBlockType(str, PyEnum):
    TEXT = "text"  # Markdown content
    CMD = "cmd"    # Executable command


class LabGuideBlock(Base):
    __tablename__ = "lab_guide_blocks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Relationship to LabDefinition
    lab_id = Column(UUID(as_uuid=True), ForeignKey("lab_definitions.id", ondelete="CASCADE"), nullable=False)
    
    # Ordering within the guide
    order = Column(Integer, default=0, nullable=False, index=True)
    
    # Block type: text or cmd
    block_type = Column(Enum(GuideBlockType), nullable=False)
    
    # Content (markdown for text, command string for cmd)
    content = Column(Text, nullable=False)
    
    # Metadata for CMD blocks (JSONB for flexibility)
    # Renamed from 'metadata' to 'block_metadata' to avoid SQLAlchemy reserved name
    block_metadata = Column(JSONB, default=dict, nullable=False)
    
    # Optional title for the block
    title = Column(String(255), nullable=True)
    
    # Relationships
    lab = relationship("LabDefinition", back_populates="guide_blocks")

    def __repr__(self):
        return f"<LabGuideBlock(id={self.id}, type={self.block_type}, order={self.order})>"