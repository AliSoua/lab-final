// src/types/LabInstance/admin/MonitoringEvents.ts
import type { LabInstanceEventLog } from "@/types/LabInstance/LabInstanceEvent"

export interface MonitoringEventsList {
    items: LabInstanceEventLog[]
    total: number
}

export interface MonitoringEventsQuery {
    event_type?: string
    instance_id?: string
    task_id?: string
    skip?: number
    limit?: number
}