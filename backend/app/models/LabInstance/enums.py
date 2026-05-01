# app/models/LabInstance/enums.py
"""
Unified enums for LabInstance lifecycle, tasks, and events.
All string-backed for JSON serialization and DB storage.
"""

from enum import Enum


class InstanceStatus(str, Enum):
    """
    High-level lifecycle status of a lab instance.
    """
    PENDING = "pending"           # Enqueued but not yet picked up by worker
    PROVISIONING = "provisioning" # Active provisioning in progress
    RUNNING = "running"           # VM ready, trainee can connect
    STOPPED = "stopped"           
    FAILED = "failed"             # Terminal failure state
    TERMINATING = "terminating"   # Cleanup in progress
    TERMINATED = "terminated"     # Terminal success state


class PowerState(str, Enum):
    """
    VM power state as reported by vCenter.
    """
    POWERED_ON = "powered_on"
    POWERED_OFF = "powered_off"
    UNKNOWN = "unknown"


class LaunchStage(str, Enum):
    """
    Granular provisioning stage for resumability.
    Stored on LabInstance.launch_stage to track progress.
    """
    VALIDATED = "validated"
    VCENTER_DISCOVERED = "vcenter_discovered"
    VM_CLONED = "vm_cloned"
    VM_POWERED_ON = "vm_powered_on"
    IP_DISCOVERED = "ip_discovered"
    GUACAMOLE_CONNECTED = "guacamole_connected"
    FINALIZED = "finalized"


class TerminationReason(str, Enum):
    """
    Why an instance was terminated.
    """
    USER_REQUESTED = "user_requested"
    EXPIRED = "expired"
    FAILED = "failed"
    ADMIN_ACTION = "admin_action"
    SYSTEM_CLEANUP = "system_cleanup"


class EventSeverity(str, Enum):
    """
    Severity classification for event logs.
    """
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class EventSource(str, Enum):
    """
    Which subsystem emitted the event.
    """
    SYSTEM = "system"
    WORKER = "worker"
    VCENTER = "vcenter"
    GUACAMOLE = "guacamole"
    USER = "user"