// src/types/LabDefinition/CreateFullLabDefinition.ts

// =============================================================================
// ENUMS (Local definitions)
// =============================================================================

export enum LabCategory {
    NETWORKING = "networking",
    SECURITY = "security",
    CLOUD = "cloud",
    DEVOPS = "devops",
    SYSTEM_ADMIN = "system_admin",
    DATABASE = "database",
    PROGRAMMING = "programming",
    DATA_SCIENCE = "data_science",
    WEB_DEVELOPMENT = "web_development",
    OTHER = "other"
}

export enum LabDifficulty {
    BEGINNER = "beginner",
    INTERMEDIATE = "intermediate",
    ADVANCED = "advanced"
}

export enum LabStatus {
    DRAFT = "draft",
    PUBLISHED = "published",
    ARCHIVED = "archived"
}

export enum GuideBlockType {
    TEXT = "text",
    CMD = "cmd"
}

// =============================================================================
// FIELD ARRAY HELPERS
// =============================================================================

export interface StringFieldItem {
    value: string
}

// =============================================================================
// LAB CONNECTION SLOT
// =============================================================================

export interface LabConnectionSlot {
    slug: string
    ssh: boolean
    rdp: boolean
    vnc: boolean
}

// =============================================================================
// FULL LAB DEFINITION (With VMs, Connections and Guide Blocks)
// =============================================================================

// VM Template Item for creation
export interface LabVMItemCreate {
    name: string
    source_vm_id: string
    snapshot_name: string
    esxi_host?: string
    cpu_cores: number
    memory_mb: number
    order: number
}

// Text Block specific metadata
export interface TextBlockMetadata {
    syntax_highlighting?: string
    collapsible: boolean
    collapsed_by_default: boolean
}

// CMD Block specific metadata
export interface CmdBlockMetadata {
    working_directory: string
    timeout: number
    sudo: boolean
    expect_output?: string
    confirmation_required: boolean
    description?: string
}

// Full Lab Request (matches backend FullLabDefinitionCreate)
export interface CreateFullLabDefinitionRequest {
    name: string
    slug: string
    description: string
    short_description: string
    category: LabCategory
    difficulty: LabDifficulty
    duration_minutes: number
    max_concurrent_users: number
    cooldown_minutes: number
    track?: string
    thumbnail_url?: string
    status: LabStatus
    objectives: string[]
    prerequisites: string[]
    tags: string[]
    network_profile_id?: string // UUID as string
    vms: LabVMItemCreate[]
    connections: LabConnectionSlot[]
    guide_version_id?: string
}

// Full Lab Form Data (for wizard/forms) - includes thumbnail_file for uploads
export interface CreateFullLabDefinitionFormData {
    // Basic Info
    name: string
    slug: string
    description: string
    short_description: string

    // Classification
    category: LabCategory | ""
    difficulty: LabDifficulty | ""
    track: string
    tags: StringFieldItem[]

    // Configuration
    duration_minutes: number
    max_concurrent_users: number
    cooldown_minutes: number
    thumbnail_url: string
    thumbnail_file?: File | null
    status: LabStatus

    // Learning Content
    objectives: StringFieldItem[]
    prerequisites: StringFieldItem[]

    // VMs
    vms: LabVMItemCreate[]

    // Connections
    connections: LabConnectionSlot[]

    // Guide
    guide_version_id?: string

    // Network
    network_profile_id: string
}

export const DEFAULT_LAB_VM_ITEM: LabVMItemCreate = {
    name: "",
    source_vm_id: "",
    snapshot_name: "",
    esxi_host: "",
    cpu_cores: 2,
    memory_mb: 4096,
    order: 0
}

export const DEFAULT_CREATE_FULL_LAB_FORM_DATA: CreateFullLabDefinitionFormData = {
    // Basic
    name: "",
    slug: "",
    description: "",
    short_description: "",

    // Classification
    category: "",
    difficulty: "",
    track: "",
    tags: [],

    // Config
    duration_minutes: 60,
    max_concurrent_users: 1,
    cooldown_minutes: 0,
    thumbnail_url: "",
    thumbnail_file: null,
    status: LabStatus.DRAFT,

    // Learning Content
    objectives: [],
    prerequisites: [],

    // VMs, Connections & Guide
    vms: [],
    connections: [],
    guide_version_id: "",

    // Network
    network_profile_id: ""
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .substring(0, 50)
}

// Convert full form data to API request
export function toFullCreateRequest(
    formData: CreateFullLabDefinitionFormData
): CreateFullLabDefinitionRequest {
    return {
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description,
        short_description: formData.short_description,
        category: formData.category as LabCategory,
        difficulty: formData.difficulty as LabDifficulty,
        duration_minutes: formData.duration_minutes,
        max_concurrent_users: formData.max_concurrent_users,
        cooldown_minutes: formData.cooldown_minutes,
        track: formData.track || undefined,
        thumbnail_url: formData.thumbnail_url || undefined,
        status: formData.status,
        objectives: formData.objectives.map(o => o.value),
        prerequisites: formData.prerequisites.map(p => p.value),
        tags: formData.tags.map(t => t.value),
        network_profile_id: formData.network_profile_id || undefined,
        vms: formData.vms.map((vm, index) => ({
            ...vm,
            order: vm.order ?? index
        })),
        connections: formData.connections,
        guide_version_id: formData.guide_version_id || undefined
    }
}

// Validation helper
export function isValidFullLabForm(data: CreateFullLabDefinitionFormData): boolean {
    const basicValid = !!(
        data.name &&
        data.description &&
        data.category &&
        data.difficulty &&
        data.duration_minutes > 0
    )

    const vmsValid = data.vms.length > 0 && data.vms.every(vm =>
        vm.name && vm.source_vm_id && vm.snapshot_name
    )

    return basicValid && vmsValid
}

// Array manipulation helpers
export function addObjective(
    data: CreateFullLabDefinitionFormData,
    objective: string
): void {
    const trimmed = objective.trim()
    if (trimmed && !data.objectives.some(o => o.value === trimmed)) {
        data.objectives.push({ value: trimmed })
    }
}

export function removeObjective(
    data: CreateFullLabDefinitionFormData,
    index: number
): void {
    data.objectives.splice(index, 1)
}

export function addPrerequisite(
    data: CreateFullLabDefinitionFormData,
    prerequisite: string
): void {
    const trimmed = prerequisite.trim()
    if (trimmed && !data.prerequisites.some(p => p.value === trimmed)) {
        data.prerequisites.push({ value: trimmed })
    }
}

export function removePrerequisite(
    data: CreateFullLabDefinitionFormData,
    index: number
): void {
    data.prerequisites.splice(index, 1)
}

export function addTag(
    data: CreateFullLabDefinitionFormData,
    tag: string
): void {
    const cleanTag = tag.trim().toLowerCase().replace(/\s+/g, '-')
    if (cleanTag && !data.tags.some(t => t.value === cleanTag)) {
        data.tags.push({ value: cleanTag })
    }
}

export function removeTag(
    data: CreateFullLabDefinitionFormData,
    index: number
): void {
    data.tags.splice(index, 1)
}