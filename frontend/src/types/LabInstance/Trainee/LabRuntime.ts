// src/types/LabInstance/Trainee/LabRuntime.ts
/**
 * Stripped-down runtime view for the trainee Run Lab UI.
 * Matches backend LabInstanceRuntimeResponse exactly.
 * NO sensitive fields: vm_uuid, vcenter_host, trainee_id, ip_address, etc.
 */
export interface LabInstanceRuntimeResponse {
    id: string
    status: string
    power_state?: string | null

    /** Connection info — only what's needed to build Guacamole client URLs */
    guacamole_connection_id?: string | null
    guacamole_connections?: Record<string, string>

    /** Progress tracking */
    current_step_index: number
    session_state_status?: string | null  // "active" | "completed" | "paused" | "abandoned"

    /** Timing */
    time_remaining_seconds?: number | null
    expires_at?: string | null  // ISO 8601 datetime from backend

    /** Lab metadata (denormalized for convenience) */
    lab_name?: string | null
    lab_definition_id?: string | null

    /** If something went wrong during provisioning / refresh */
    error_message?: string | null
}