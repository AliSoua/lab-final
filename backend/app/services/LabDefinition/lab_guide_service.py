# app/services/LabDefinition/lab_guide_service.py

from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.LabDefinition.LabGuideBlock import LabGuideBlock, GuideBlockType
from app.schemas.LabDefinition.LabGuideBlock import LabGuideBlockCreate, LabGuideBlockUpdate


class LabGuideService:
    """Service for managing lab guide blocks"""
    
    def get_by_lab(self, db: Session, lab_id: UUID) -> List[LabGuideBlock]:
        """Get all guide blocks for a lab, ordered by order field"""
        return (
            db.query(LabGuideBlock)
            .filter(LabGuideBlock.lab_id == lab_id)
            .order_by(LabGuideBlock.order.asc())
            .all()
        )
    
    def get(self, db: Session, block_id: UUID) -> Optional[LabGuideBlock]:
        """Get a specific guide block by ID"""
        return db.query(LabGuideBlock).filter(LabGuideBlock.id == block_id).first()
    
    def create(
        self, 
        db: Session, 
        lab_id: UUID, 
        block_data: LabGuideBlockCreate
    ) -> LabGuideBlock:
        """Create a new guide block"""
        db_block = LabGuideBlock(
            lab_id=lab_id,
            block_type=block_data.block_type,
            content=block_data.content,
            title=block_data.title,
            order=block_data.order,
            block_metadata=block_data.block_metadata or {}
        )
        db.add(db_block)
        db.commit()
        db.refresh(db_block)
        return db_block
    
    def create_many(
        self,
        db: Session,
        lab_id: UUID,
        blocks_data: List[LabGuideBlockCreate]
    ) -> List[LabGuideBlock]:
        """Create multiple guide blocks at once (for full lab creation)"""
        db_blocks = []
        for idx, block_data in enumerate(blocks_data):
            db_block = LabGuideBlock(
                lab_id=lab_id,
                block_type=block_data.block_type,
                content=block_data.content,
                title=block_data.title,
                order=block_data.order if block_data.order is not None else idx,
                block_metadata=block_data.block_metadata or {}
            )
            db.add(db_block)
            db_blocks.append(db_block)
        
        db.commit()
        for block in db_blocks:
            db.refresh(block)
        return db_blocks
    
    def update(
        self,
        db: Session,
        block: LabGuideBlock,
        block_data: LabGuideBlockUpdate
    ) -> LabGuideBlock:
        """Update a guide block"""
        update_data = block_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(block, field, value)
        
        db.commit()
        db.refresh(block)
        return block
    
    def delete(self, db: Session, block: LabGuideBlock) -> None:
        """Delete a guide block"""
        db.delete(block)
        db.commit()
    
    def reorder_blocks(
        self,
        db: Session,
        lab_id: UUID,
        block_orders: List[UUID]
    ) -> List[LabGuideBlock]:
        """Reorder guide blocks by updating their order field"""
        blocks = []
        for new_order, block_id in enumerate(block_orders):
            block = self.get(db, block_id)
            if block and str(block.lab_id) == str(lab_id):
                block.order = new_order
                blocks.append(block)
        
        db.commit()
        return blocks
    
    def validate_guide(self, blocks: List[LabGuideBlockCreate]) -> None:
        """
        Validate guide blocks structure.
        Raises ValueError if invalid.
        """
        if not blocks:
            return
        
        for idx, block in enumerate(blocks):
            if block.block_type == GuideBlockType.CMD:
                # Validate that CMD blocks have actual content
                if not block.content or not block.content.strip():
                    raise ValueError(f"Command block at position {idx} cannot be empty")
                
                # Ensure block_metadata is dict
                if block.block_metadata is None:
                    block.block_metadata = {}