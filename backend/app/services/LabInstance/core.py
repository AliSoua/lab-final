# app/services/LabInstance/core.py
"""
Lab Instance Core Service
=========================

Primary service class for LabInstance business logic.

FEATURES:
-----------
1. Instance Lifecycle Management
   - Create new lab instances from definitions
   - Track instance state transitions
   - Handle user-initiated actions (start, stop, pause, resume)
   - Manage instance metadata and user progress

2. Access Control
   - Verify user permissions for instance operations
   - Enforce concurrent instance limits per user
   - Validate lab definition availability

3. Resource Coordination
   - Coordinate with provisioning service for VM allocation
   - Track resource usage and limits
   - Manage network segment allocation

4. Progress Tracking
   - Update user progress through lab guides
   - Calculate completion percentages
   - Track time spent and remaining

5. Audit & Logging
   - Log all state changes via Event system
   - Track user actions for compliance
   - Maintain immutable event history

ARCHITECTURE:
-------------
- Uses Repository pattern for database operations
- Delegates VM operations to LabProvisioningService
- Delegates lifecycle to LabLifecycleService
- Async/await throughout for I/O bound operations
- Transactional integrity for state changes

DEPENDENCIES:
-------------
- SQLAlchemy AsyncSession for database operations
- app.models.LabInstance.* for data models
- app.schemas.LabInstance.* for validation
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from app.models.LabInstance import LabInstance, LabInstanceStatus, LabInstanceEvent
from app.models.LabDefinition.core import LabDefinition
from app.models.user import User
from app.schemas.LabInstance import (
    LabInstanceCreate,
    LabInstanceUpdate,
    LabInstanceResponse,
    LabInstanceSummary,
    LabInstanceListParams
)
from app.services.LabInstance.provisioning import LabProvisioningService
from app.services.LabInstance.lifecycle import LabLifecycleService


class LabInstanceService:
    """
    Primary service for lab instance management.
    
    Handles CRUD operations, state transitions, and coordinates
    with specialized services for provisioning and lifecycle.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.provisioning = LabProvisioningService(db)
        self.lifecycle = LabLifecycleService(db)
    
    async def create_instance(
        self, 
        user_id: UUID,
        create_data: LabInstanceCreate
    ) -> LabInstance:
        """
        Create a new lab instance for a user.
        """
        from uuid import uuid4  # Add this import if not at top
        
        # Fetch lab definition WITH eagerly loaded guide_blocks
        result = await self.db.execute(
            select(LabDefinition)
            .options(selectinload(LabDefinition.guide_blocks))  # EAGER LOAD
            .where(
                and_(
                    LabDefinition.id == create_data.lab_definition_id,
                    LabDefinition.status == "published"
                )
            )
        )
        lab_def = result.scalar_one_or_none()
        
        if not lab_def:
            raise ValueError("Lab definition not found or not published")
        
        # Check concurrent limits
        await self._validate_user_limits(user_id, lab_def)
        
        # Now accessing guide_blocks is safe because it was eagerly loaded
        instance = LabInstance(
            id=uuid4(),
            lab_definition_id=create_data.lab_definition_id,
            user_id=user_id,
            status=LabInstanceStatus.SCHEDULED,
            allocated_duration_minutes=lab_def.duration_minutes,
            expires_at=datetime.utcnow() + timedelta(minutes=lab_def.duration_minutes),
            total_steps=len(lab_def.guide_blocks) if lab_def.guide_blocks else 0,  # Now safe
            user_notes=create_data.user_notes,
            scheduled_start_at=create_data.scheduled_start_at
        )
        
        self.db.add(instance)
        await self.db.commit()
        await self.db.refresh(instance)
        
        # Log creation event
        await self._log_event(
            instance.id,
            "instance_created",
            f"Lab instance created for {lab_def.name}",
            {"lab_name": lab_def.name, "user_notes": create_data.user_notes}
        )
        
        return instance

    async def get_instance(
        self, 
        instance_id: UUID, 
        user_id: Optional[UUID] = None,
        load_relations: bool = False
    ) -> Optional[LabInstance]:
        """
        Retrieve a lab instance by ID.
        
        Args:
            instance_id: UUID of the instance
            user_id: If provided, verifies user ownership
            load_relations: If True, eagerly load VMs and events
            
        Returns:
            LabInstance or None if not found
        """
        query = select(LabInstance).where(LabInstance.id == instance_id)
        
        if user_id:
            query = query.where(LabInstance.user_id == user_id)
        
        if load_relations:
            query = query.options(
                selectinload(LabInstance.vms),
                selectinload(LabInstance.events)
            )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def list_instances(
        self,
        user_id: UUID,
        params: LabInstanceListParams
    ) -> tuple[List[LabInstance], int]:
        """
        List lab instances for a user with filtering and pagination.
        
        Args:
            user_id: UUID of the user
            params: LabInstanceListParams with filters
            
        Returns:
            Tuple of (instances list, total count)
        """
        # Build base query
        query = select(LabInstance).where(LabInstance.user_id == user_id)
        
        # Apply filters
        if params.status:
            query = query.where(LabInstance.status == params.status)
        
        if params.is_active is not None:
            if params.is_active:
                query = query.where(
                    LabInstance.status.in_([
                        LabInstanceStatus.RUNNING,
                        LabInstanceStatus.PAUSED
                    ])
                )
            else:
                query = query.where(
                    ~LabInstance.status.in_([
                        LabInstanceStatus.RUNNING,
                        LabInstanceStatus.PAUSED
                    ])
                )
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar()
        
        # Apply sorting
        sort_column = getattr(LabInstance, params.sort_by, LabInstance.created_at)
        if params.sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        # Apply pagination
        offset = (params.page - 1) * params.page_size
        query = query.offset(offset).limit(params.page_size)
        
        result = await self.db.execute(query)
        instances = result.scalars().all()
        
        return list(instances), total
    
    async def update_instance(
        self,
        instance_id: UUID,
        user_id: UUID,
        update_data: LabInstanceUpdate
    ) -> LabInstance:
        """
        Update an instance (user-initiated changes).
        
        Allowed updates:
        - Progress tracking (current_step, percent_complete)
        - User metadata (notes, rating, feedback)
        - Pin status
        - State transitions (pause/resume via status)
        
        Args:
            instance_id: UUID of instance to update
            user_id: User making the request (ownership check)
            update_data: LabInstanceUpdate schema
            
        Returns:
            Updated LabInstance
        """
        instance = await self.get_instance(instance_id, user_id)
        if not instance:
            raise ValueError("Instance not found")
        
        # Handle status transitions
        if update_data.status:
            await self.lifecycle.transition_state(
                instance, 
                update_data.status,
                user_id=str(user_id)
            )
        
        # Update progress fields
        if update_data.current_step is not None:
            instance.current_step = update_data.current_step
            # Recalculate percentage
            if instance.total_steps > 0:
                instance.percent_complete = int(
                    (instance.current_step / instance.total_steps) * 100
                )
        
        if update_data.percent_complete is not None:
            instance.percent_complete = update_data.percent_complete
        
        # Update metadata
        if update_data.user_notes is not None:
            instance.user_notes = update_data.user_notes
        
        if update_data.rating is not None:
            instance.rating = update_data.rating
        
        if update_data.feedback is not None:
            instance.feedback = update_data.feedback
        
        if update_data.is_pinned is not None:
            instance.is_pinned = update_data.is_pinned
        
        instance.last_activity_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(instance)
        
        return instance
    
    async def start_instance(self, instance_id: UUID, user_id: UUID):
        """Start instance using the connection client."""
        from app.config.connection.celery_client import celery_client
        
        instance = await self.get_instance(instance_id, user_id)
        if not instance:
            raise ValueError("Instance not found")
        
        # Transition state
        await self.lifecycle.transition_state(
            instance,
            LabInstanceStatus.PROVISIONING,
            user_id=str(user_id)
        )
        
        # Trigger via client
        celery_client.send_task(
            "app.tasks.LabInstance.provisioning.provision_lab_instance",
            args=[str(instance_id)],
            queue="lab.provisioning"
        )
        
        return instance

    async def stop_instance(self, instance_id: UUID, user_id: UUID, reason: Optional[str] = None):
        """Stop instance using the connection client."""
        from app.config.connection.celery_client import celery_client
        
        instance = await self.get_instance(instance_id, user_id)
        if not instance:
            raise ValueError("Instance not found")
        
        instance.terminated_by = "user"
        instance.termination_reason = reason or "User requested stop"
        
        await self.lifecycle.transition_state(
            instance,
            LabInstanceStatus.STOPPING,
            user_id=str(user_id)
        )
        
        celery_client.send_task(
            "app.tasks.LabInstance.cleanup.cleanup_lab_instance",
            args=[str(instance_id)],
            queue="lab.cleanup"
        )
        
        return instance
    
    async def extend_instance(
        self,
        instance_id: UUID,
        user_id: UUID,
        additional_minutes: int
    ) -> LabInstance:
        """
        Extend instance expiry time.
        
        Args:
            instance_id: Instance to extend
            user_id: User requesting extension
            additional_minutes: Minutes to add
            
        Returns:
            Updated LabInstance
        """
        instance = await self.get_instance(instance_id, user_id)
        if not instance:
            raise ValueError("Instance not found")
        
        if not instance.is_extendable:
            raise ValueError("Instance cannot be extended")
        
        if not instance.is_active:
            raise ValueError("Cannot extend inactive instance")
        
        instance.extended_minutes += additional_minutes
        instance.expires_at = instance.expires_at + timedelta(minutes=additional_minutes)
        
        await self._log_event(
            instance.id,
            "time_extended",
            f"Instance extended by {additional_minutes} minutes",
            {"additional_minutes": additional_minutes, "new_expiry": instance.expires_at.isoformat()}
        )
        
        await self.db.commit()
        await self.db.refresh(instance)
        
        return instance
    
    async def _validate_user_limits(
        self, 
        user_id: UUID, 
        lab_def: LabDefinition
    ) -> None:
        """
        Validate user has not exceeded concurrent/active limits.
        
        Raises:
            HTTPException: If limits exceeded
        """
        # Check active instances count
        result = await self.db.execute(
            select(func.count(LabInstance.id)).where(
                and_(
                    LabInstance.user_id == user_id,
                    LabInstance.status.in_([
                        LabInstanceStatus.SCHEDULED,
                        LabInstanceStatus.PROVISIONING,
                        LabInstanceStatus.RUNNING,
                        LabInstanceStatus.PAUSED
                    ])
                )
            )
        )
        active_count = result.scalar()
        
        # TODO: Get from user plan/role
        max_concurrent = 3  # Configurable per user tier
        
        if active_count >= max_concurrent:
            raise HTTPException(
                status_code=403,
                detail=f"Maximum concurrent instances ({max_concurrent}) reached"
            )
        
        # Check if already has instance of this lab
        result = await self.db.execute(
            select(LabInstance).where(
                and_(
                    LabInstance.user_id == user_id,
                    LabInstance.lab_definition_id == lab_def.id,
                    LabInstance.status.in_([
                        LabInstanceStatus.SCHEDULED,
                        LabInstanceStatus.PROVISIONING,
                        LabInstanceStatus.RUNNING,
                        LabInstanceStatus.PAUSED
                    ])
                )
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            raise HTTPException(
                status_code=409,
                detail="You already have an active instance of this lab"
            )
    
    async def _log_event(
        self,
        instance_id: UUID,
        event_type: str,
        message: str,
        metadata: Optional[dict] = None
    ) -> None:
        """Create an audit event for an instance."""
        event = LabInstanceEvent(
            lab_instance_id=instance_id,
            event_type=event_type,
            message=message,
            metadata=metadata or {},
            source="LabInstanceService"
        )
        self.db.add(event)
        await self.db.commit()


from fastapi import HTTPException
from uuid import uuid4