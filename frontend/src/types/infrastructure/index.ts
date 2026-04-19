// frontend/src/types/infrastructure/index.ts
// ============================================
// ESXi Host Types (matches backend /info endpoint)
// ============================================

export interface ESXiHost {
    // Identity
    name: string
    model: string | null
    vendor: string | null

    // CPU Info
    cpu_model: string | null
    cpu_cores: number
    cpu_threads: number
    cpu_packages: number
    cpu_mhz: number

    // Memory
    memory_gb: number

    // ESXi Version Info
    esxi_version: string | null
    esxi_build: string | null
    license_name: string | null

    // Connection & Power State
    connection_state: string
    power_state: string
    in_maintenance_mode: boolean
    overall_status: string

    // Inventory
    vm_count: number

    // System
    boot_time: string | null
}

// ============================================
// VM Template Types (matches backend /templates endpoint)
// ============================================

export interface VMTemplate {
    uuid: string         // Canonical vSphere UUID from backend
    id: string           // Kept for backward compatibility: same as uuid
    name: string
    guest_os: string
    cpu_count: number
    memory_mb: number
    path: string | null  // Backend uses getattr safe access
    host: string         // ESXi host this template belongs to

    // UI-enriched fields
    esxi_host_id: string
    esxi_host_name: string
    cpu_cores: number    // Alias for cpu_count
    type: "esxi" | "vcenter" | "linux" | "windows" | "security" | "other"
    status: "available" | "in_use" | "maintenance" | "deprecated"
    os_family: string
    os_version: string
    description: string
    disk_gb: number      // Placeholder - not provided by backend
}

// ============================================
// Virtual Machine Types (from /vms endpoint)
// ============================================

export interface VirtualMachine {
    uuid: string | null  // From vm.config.uuid (null if config unavailable)
    id: string           // Same as uuid for consistency, or synthetic fallback
    name: string
    power_state: string
    guest_os: string | null
    cpu_count: number
    memory_mb: number
    ip_address: string | null
    tools_status: string // "toolsOk", "toolsNotRunning", "toolsNotInstalled", etc.
    is_template: boolean // Backend includes this in /vms response
    host: string

    // UI-enriched fields
    esxi_host_id: string
    esxi_host_name: string
    status: "running" | "stopped" | "suspended" | "provisioning" | "error"
}

// ============================================
// Filters & Options
// ============================================

export interface InfrastructureFilters {
    host: string
    type: string
    status: string
    searchQuery: string
}

export const DEFAULT_INFRASTRUCTURE_FILTERS: InfrastructureFilters = {
    host: "all",
    type: "all",
    status: "all",
    searchQuery: "",
}

export const VM_TEMPLATE_TYPES = [
    { value: "all", label: "All Types" },
    { value: "esxi", label: "ESXi" },
    { value: "vcenter", label: "vCenter" },
    { value: "linux", label: "Linux" },
    { value: "windows", label: "Windows" },
    { value: "security", label: "Security" },
    { value: "other", label: "Other" },
] as const

export const VM_STATUS_OPTIONS = [
    { value: "all", label: "All Status" },
    { value: "available", label: "Available" },
    { value: "in_use", label: "In Use" },
    { value: "maintenance", label: "Maintenance" },
    { value: "deprecated", label: "Deprecated" },
] as const

// Updated to match backend connection_state values
export const ESXI_STATUS_OPTIONS = [
    { value: "all", label: "All Status" },
    { value: "connected", label: "Connected" },
    { value: "disconnected", label: "Disconnected" },
    { value: "notResponding", label: "Not Responding" },
] as const