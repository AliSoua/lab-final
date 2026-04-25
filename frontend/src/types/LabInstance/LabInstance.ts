// src/types/LabInstance/LabInstance.ts
// =============================================================================
// LAB INSTANCE TYPES (matches backend schemas + model)
// =============================================================================

export interface LabInstance {
    id: string
    lab_definition_id: string
    trainee_id: string
    vm_uuid?: string | null
    vm_name?: string | null
    vcenter_host?: string | null
    status: "provisioning" | "running" | "stopped" | "terminated" | "failed"
    power_state: string | null
    ip_address?: string | null
    connection_url?: string | null
    guacamole_connection_id?: string | null
    guacamole_connections?: Record<string, string> | null
    created_at?: string | null
    started_at?: string | null
    stopped_at?: string | null
    expires_at?: string | null
    error_message?: string | null   // NEW
}

export interface LabInstanceCreate {
    lab_definition_id: string
}

export interface LabInstanceStatus {
    id: string
    status: string
    power_state: string | null
    ip_address: string | null
    vm_name: string | null
}

export interface LabInstanceListResponse {
    items: LabInstance[]
    total: number
}