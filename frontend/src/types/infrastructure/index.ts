// src/types/infrastructure/index.ts

export interface VMTemplate {
    id: string
    name: string
    description: string
    type: "esxi" | "vcenter" | "linux" | "windows" | "security" | "other"
    cpu_cores: number
    memory_mb: number
    disk_gb: number
    esxi_host_id: string
    esxi_host_name: string
    status: "available" | "in_use" | "maintenance" | "deprecated"
    created_at: string
    updated_at: string
    tags: string[]
    os_family: string
    os_version: string
}

export interface ESXiHost {
    id: string
    name: string
    hostname: string
    status: "online" | "offline" | "maintenance" | "error"
    data_center: string
    cluster: string
    cpu_total: number
    cpu_used: number
    memory_total_gb: number
    memory_used_gb: number
    storage_total_gb: number
    storage_used_gb: number
    vm_count: number
    template_count: number
    last_synced_at: string
}

export interface VirtualMachine {
    id: string
    name: string
    template_id: string
    template_name: string
    esxi_host_id: string
    esxi_host_name: string
    status: "running" | "stopped" | "suspended" | "provisioning" | "error"
    ip_address: string | null
    cpu_cores: number
    memory_mb: number
    disk_gb: number
    lab_instance_id: string | null
    lab_name: string | null
    assigned_to: string | null
    created_at: string
    started_at: string | null
}

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

export const ESXI_STATUS_OPTIONS = [
    { value: "all", label: "All Status" },
    { value: "online", label: "Online" },
    { value: "offline", label: "Offline" },
    { value: "maintenance", label: "Maintenance" },
    { value: "error", label: "Error" },
] as const