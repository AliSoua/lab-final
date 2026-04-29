// src/types/LabInstance/admin/MonitoringTasks.ts
import type { LabInstanceTask } from "@/types/LabInstance/LabInstanceTask"

export interface MonitoringTasksList {
    items: LabInstanceTask[]
    total: number
}

export interface MonitoringTasksQuery {
    task_type?: string
    status?: string
    instance_id?: string
    skip?: number
    limit?: number
}