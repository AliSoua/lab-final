// src/types/LabDefinition/LabDetail.ts
import type { PublicLabDefinition } from "./index"

export interface LabGuideBlock {
    id: string
    order: number
    type: "text" | "code" | "command" | "image" | "alert" | "checklist"
    title?: string
    content: string
    language?: string
    metadata?: Record<string, unknown>
}

export interface LabVM {
    id: string
    name: string
    hostname: string
    os_type: string
    cpu_cores: number
    memory_mb: number
    disk_gb: number
    description?: string
}

// Full lab definition response (matches FullLabDefinitionResponse from backend)
export interface LabDetail extends PublicLabDefinition {
    vms: LabVM[]
    guide_blocks: LabGuideBlock[]
    guide_content?: string  // Optional markdown content
}

export interface LabSession {
    id: string
    lab_definition_id: string
    user_id: string
    status: "pending" | "provisioning" | "running" | "completed" | "failed" | "terminated"
    started_at?: string
    expires_at?: string
    vm_instances?: LabVMInstance[]
}

export interface LabVMInstance {
    id: string
    vm_id: string
    name: string
    ip_address?: string
    status: "provisioning" | "running" | "stopped" | "error"
}