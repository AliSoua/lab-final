// src/types/LabInstance/LabInstanceTask.ts
// =============================================================================
// LAB INSTANCE TASK TYPES (matches backend schemas)
// =============================================================================

export interface LabInstanceTask {
    id: string
    lab_instance_id: string
    task_type: string
    status: string
    enqueued_at: string | null
    started_at: string | null
    finished_at: string | null
    worker_pid: number | null
    worker_host: string | null
    error_message: string | null
    created_at: string | null
}

export interface LabInstanceTaskList {
    items: LabInstanceTask[]
    total: number
}