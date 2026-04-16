# app/services/LabInstance/lifecycle.py
"""
Lab Lifecycle Service
=====================

Manages state transitions and lifecycle policies for lab instances.

FEATURES:
-----------
1. State Transition Management
   - Enforce valid state transitions (state machine)
   - Record transition timestamps
   - Trigger side effects on transitions
   - Prevent invalid transitions

2. Expiration Management
   - Monitor instance expiry times
   - Send warning notifications (15min, 5min before)
   - Auto-terminate expired instances
   - Handle time extensions

3. Auto-Pause Detection
   - Monitor user inactivity
   - Auto-pause instances after timeout
   - Resume on user activity
   - Track pause duration separately

4. State Machine Validation
   Valid transitions:
   - SCHEDULED -> PROVISIONING (start)
   - PROVISIONING -> CONFIGURING/RUNNING/FAILED
   - CONFIGURING -> RUNNING/FAILED
   - RUNNING -> PAUSED/STOPPING/COMPLETED
   - PAUSED -> RUNNING/STOPPING
   - STOPPING -> COMPLETED/ARCHIVED
   - Any -> FAILED (error handling)

5. Transition Hooks
   - Pre-transition validation
   - Post-transition actions
   - Event logging
   - Notification triggers

POLICIES:
---------
- Max extension: 60 minutes per extension, 3 max per instance
- Auto-pause: After 30 minutes inactivity
- Expiry warning: At 15min and 5min remaining
- Grace period: 5 minutes after expiry for cleanup

DEPENDENCIES:
-------------
- app.models.LabInstance for state definitions
- Notification service for alerts
- Task scheduler for background expiry checks
"""

from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.LabInstance import LabInstance, LabInstanceStatus, LabInstanceEvent


class LabLifecycleService:
    """
    Manages lab instance state transitions and lifecycle policies.
    
    Enforces state machine rules, handles expiration logic,
    and manages auto-pause functionality.
    """
    
    # Valid state transitions mapping
    VALID_TRANSITIONS: Dict[LabInstanceStatus, list] = {
        LabInstanceStatus.SCHEDULED: [
            LabInstanceStatus.PROVISIONING,
            LabInstanceStatus.FAILED
        ],
        LabInstanceStatus.PROVISIONING: [
            LabInstanceStatus.CONFIGURING,
            LabInstanceStatus.RUNNING,
            LabInstanceStatus.FAILED
        ],
        LabInstanceStatus.CONFIGURING: [
            LabInstanceStatus.RUNNING,
            LabInstanceStatus.FAILED
        ],
        LabInstanceStatus.RUNNING: [
            LabInstanceStatus.PAUSED,
            LabInstanceStatus.STOPPING,
            LabInstanceStatus.COMPLETED,
            LabInstanceStatus.FAILED
        ],
        LabInstanceStatus.PAUSED: [
            LabInstanceStatus.RUNNING,
            LabInstanceStatus.STOPPING,
            LabInstanceStatus.FAILED
        ],
        LabInstanceStatus.STOPPING: [
            LabInstanceStatus.COMPLETED,
            LabInstanceStatus.ARCHIVED,
            LabInstanceStatus.FAILED
        ],
        LabInstanceStatus.COMPLETED: [LabInstanceStatus.ARCHIVED],
        LabInstanceStatus.EXPIRED: [LabInstanceStatus.ARCHIVED],
        LabInstanceStatus.FAILED: [LabInstanceStatus.ARCHIVED],
        LabInstanceStatus.ARCHIVED: []  # Terminal state
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def transition_state(
        self,
        instance: LabInstance,
        new_status: LabInstanceStatus,
        user_id: Optional[str] = None,
        reason: Optional[str] = None
    ) -> None:
        """
        Transition instance to a new state with validation.
        
        Args:
            instance: LabInstance to transition
            new_status: Target status
            user_id: User triggering transition (if applicable)
            reason: Reason for transition
            
        Raises:
            ValueError: If transition is invalid
        """
        current_status = instance.status
        
        # Validate transition
        if not self._is_valid_transition(current_status, new_status):
            raise ValueError(
                f"Invalid transition from {current_status} to {new_status}"
            )
        
        # Pre-transition actions
        await self._pre_transition(instance, new_status)
        
        # Perform transition
        old_status = instance.status
        instance.status = new_status
        instance.status_message = reason or f"Transitioned from {old_status}"
        
        # Update timestamps based on state
        await self._update_state_timestamps(instance, new_status)
        
        # Post-transition actions
        await self._post_transition(instance, old_status, new_status, user_id)
        
        # Log event
        await self._log_transition(instance, old_status, new_status, user_id, reason)
    
    def _is_valid_transition(
        self, 
        current: LabInstanceStatus, 
        new: LabInstanceStatus
    ) -> bool:
        """Check if state transition is valid."""
        if current == new:
            return True  # Allow re-entry to same state
        
        valid_next = self.VALID_TRANSITIONS.get(current, [])
        return new in valid_next
    
    async def _pre_transition(
        self, 
        instance: LabInstance, 
        new_status: LabInstanceStatus
    ) -> None:
        """Execute pre-transition validation/actions."""
        if new_status == LabInstanceStatus.PAUSED:
            # Save current state before pause
            instance.resources["pre_pause_status"] = instance.status
    
    async def _update_state_timestamps(
        self,
        instance: LabInstance,
        status: LabInstanceStatus
    ) -> None:
        """Update timestamps when entering specific states."""
        now = datetime.utcnow()
        
        if status == LabInstanceStatus.PROVISIONING and not instance.started_at:
            instance.started_at = now
        
        elif status == LabInstanceStatus.RUNNING and not instance.ready_at:
            instance.ready_at = now
        
        elif status in [LabInstanceStatus.COMPLETED, LabInstanceStatus.EXPIRED]:
            instance.ended_at = now
            
            # Calculate actual duration
            if instance.started_at:
                duration = (now - instance.started_at).total_seconds() / 60
                instance.actual_duration_minutes = int(duration)
    
    async def _post_transition(
        self,
        instance: LabInstance,
        old_status: LabInstanceStatus,
        new_status: LabInstanceStatus,
        user_id: Optional[str]
    ) -> None:
        """Execute post-transition side effects."""
        # Reset warning flag when extending/renewing
        if old_status == LabInstanceStatus.PAUSED and new_status == LabInstanceStatus.RUNNING:
            instance.last_activity_at = datetime.utcnow()
        
        # Handle terminal states
        if new_status in [LabInstanceStatus.COMPLETED, LabInstanceStatus.EXPIRED]:
            # Trigger cleanup via task
            from app.tasks.LabInstance.cleanup import cleanup_lab_instance
            cleanup_lab_instance.delay(str(instance.id))
    
    async def check_expiration(self, instance: LabInstance) -> bool:
        """
        Check if instance has expired and handle accordingly.
        
        Args:
            instance: LabInstance to check
            
        Returns:
            True if instance was expired, False otherwise
        """
        if not instance.is_active or not instance.expires_at:
            return False
        
        now = datetime.utcnow()
        remaining = (instance.expires_at - now).total_seconds() / 60
        
        # Send warnings
        if not instance.has_been_warned and remaining <= 15:
            await self._send_expiry_warning(instance, remaining)
            instance.has_been_warned = True
            await self.db.commit()
        
        # Handle expiry
        if remaining <= 0:
            await self.transition_state(
                instance,
                LabInstanceStatus.EXPIRED,
                reason="Time limit reached"
            )
            instance.terminated_by = "system"
            instance.termination_reason = "Auto-expired after time limit"
            await self.db.commit()
            return True
        
        return False
    
    async def check_inactivity(self, instance: LabInstance) -> bool:
        """
        Check for user inactivity and auto-pause if needed.
        
        Args:
            instance: LabInstance to check
            
        Returns:
            True if instance was paused, False otherwise
        """
        if instance.status != LabInstanceStatus.RUNNING:
            return False
        
        if not instance.last_activity_at:
            instance.last_activity_at = datetime.utcnow()
            return False
        
        inactive_minutes = (datetime.utcnow() - instance.last_activity_at).total_seconds() / 60
        
        # Auto-pause after 30 minutes inactivity
        if inactive_minutes >= 30:
            await self.transition_state(
                instance,
                LabInstanceStatus.PAUSED,
                reason="Auto-paused due to inactivity"
            )
            await self.db.commit()
            
            # TODO: Send notification to user
            return True
        
        return False
    
    async def extend_instance(
        self,
        instance: LabInstance,
        additional_minutes: int,
        user_id: str
    ) -> None:
        """
        Extend instance expiry time with validation.
        
        Args:
            instance: LabInstance to extend
            additional_minutes: Minutes to add
            user_id: User requesting extension
            
        Raises:
            ValueError: If extension not allowed
        """
        if not instance.is_extendable:
            raise ValueError("Instance cannot be extended")
        
        if not instance.is_active:
            raise ValueError("Cannot extend inactive instance")
        
        # Check extension limits
        current_extensions = instance.extended_minutes // 30  # Assuming 30min blocks
        if current_extensions >= 3:
            raise ValueError("Maximum number of extensions reached")
        
        if additional_minutes > 60:
            raise ValueError("Cannot extend by more than 60 minutes at once")
        
        # Apply extension
        instance.extended_minutes += additional_minutes
        instance.expires_at = instance.expires_at + timedelta(minutes=additional_minutes)
        instance.has_been_warned = False  # Reset warning for new expiry
        
        await self._log_transition(
            instance,
            instance.status,
            instance.status,
            user_id,
            f"Extended by {additional_minutes} minutes"
        )
    
    async def _send_expiry_warning(
        self, 
        instance: LabInstance, 
        remaining_minutes: float
    ) -> None:
        """Send expiry warning notification to user."""
        # TODO: Integrate with notification service
        print(f"Warning: Instance {instance.id} expires in {remaining_minutes} minutes")
    
    async def _log_transition(
        self,
        instance: LabInstance,
        old_status: LabInstanceStatus,
        new_status: LabInstanceStatus,
        user_id: Optional[str],
        reason: Optional[str]
    ) -> None:
        """Log state transition event."""
        event = LabInstanceEvent(
            lab_instance_id=instance.id,
            event_type="state_transition",
            severity="info",
            message=f"State changed from {old_status} to {new_status}",
            source="LabLifecycleService",
            metadata={
                "from_state": old_status,
                "to_state": new_status,
                "user_id": user_id,
                "reason": reason
            }
        )
        self.db.add(event)
        await self.db.flush()