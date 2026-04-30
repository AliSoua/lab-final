// src/types/LabInstance/admin/TerminateLabInstance.ts

export interface LabGuideSessionState {
    status?: string
    step_completions?: Record<string, boolean>
    command_results?: Record<string, unknown>
    scores?: Record<string, number>
    [key: string]: unknown
}

export interface TerminateLabInstanceResponse {
    id: string
    lab_definition_id: string
    trainee_id: string

    /** Pinned guide version. Copied from LabDefinition at launch. */
    guide_version_id: string | null

    vm_uuid: string | null
    vm_name: string | null
    vcenter_host: string | null

    status: string
    power_state: string | null
    ip_address: string | null

    /** Legacy single-connection fields */
    connection_url: string | null
    guacamole_connection_id: string | null

    /** All Guacamole connections keyed as 'slug_protocol' */
    guacamole_connections: Record<string, string>

    /** Mutable runtime state: step completions, command results, scores. */
    session_state: LabGuideSessionState | null

    /** Trainee's current position in the guide (0-based). */
    current_step_index: number

    created_at: string | null
    started_at: string | null
    stopped_at: string | null
    expires_at: string | null

    /** Copied from LabDefinition at launch. Used to compute expires_at. */
    duration_minutes: number | null

    error_message: string | null
}