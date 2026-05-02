// src/types/LabInstance/LabInstance.ts
// =============================================================================
// LAB INSTANCE TYPES (matches backend schemas + model)
// =============================================================================

import type { LabGuideSessionState } from "@/types/LabGuide"

export interface LabInstance {
    id: string
    lab_definition_id: string
    trainee_id: string

    // ── NEW: Snapshot of the guide version active at launch time ──────
    guide_version_id?: string | null

    vm_uuid?: string | null
    vm_name?: string | null
    vcenter_host?: string | null

    status: "provisioning" | "running" | "stopped" | "terminated" | "failed"
    power_state: string | null
    ip_address?: string | null

    // Legacy single-connection fields
    connection_url?: string | null
    guacamole_connection_id?: string | null

    // Mapping of all active Guacamole connections
    guacamole_connections?: Record<string, string> | null

    // ── NEW: Runtime session state (step progress, scores, results) ───
    session_state?: LabGuideSessionState | null

    // ── NEW: Current step index persisted server-side ─────────────────
    current_step_index: number

    created_at?: string | null
    started_at?: string | null
    stopped_at?: string | null
    expires_at?: string | null

    error_message?: string | null
    updated_at?: string | null
    launch_stage?: string | null
    launched_by_user_id?: string | null
    termination_reason?: string | null
    failure_reason?: string | null
    terminated_by_user_id?: string | null
    cleanup_at?: string | null
    esxi_host?: string | null
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

    // ── NEW: Lightweight runtime fields for polling ───────────────────
    current_step_index: number
    session_state_status?: string | null
}

export interface LabInstanceListResponse {
    items: LabInstance[]
    total: number
}