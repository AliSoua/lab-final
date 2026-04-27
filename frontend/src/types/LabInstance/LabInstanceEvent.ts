// src/types/LabInstance/LabInstanceEvent.ts
// =============================================================================
// LAB INSTANCE EVENT LOG TYPES (matches backend schemas)
// =============================================================================

export interface LabInstanceEventLog {
    id: string
    task_id: string
    lab_instance_id: string
    event_type: string
    message: string
    metadata?: Record<string, unknown> | null
    created_at: string | null
}

export interface LabInstanceEventLogList {
    items: LabInstanceEventLog[]
    total: number
}