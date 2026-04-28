// src/types/LabInstance/Trainee/LabInstance.ts
// =============================================================================
// TRAINEE LAB INSTANCE TYPES
// Matches backend: MyLabInstanceSummary + MyLabInstanceListResponse
// Stripped-down view with no VM IDs, vCenter info, IPs, or connection secrets.
// =============================================================================

export interface LabDefinitionSummary {
    id: string
    name: string
    difficulty?: string | null
    category?: string | null
    track?: string | null
}

export interface MyLabInstance {
    id: string
    lab_definition: LabDefinitionSummary

    status: string
    power_state?: string | null

    // Timing info
    created_at?: string | null
    started_at?: string | null
    stopped_at?: string | null
    expires_at?: string | null
    duration_minutes?: number | null

    // Computed by backend (minutes left until expiration)
    time_remaining_minutes?: number | null

    // Progress
    current_step_index: number
}

export interface MyLabInstanceListResponse {
    items: MyLabInstance[]
    total: number
}