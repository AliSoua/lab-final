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
// FULL LAB DEFINITION (With VMs and Guide Blocks)
// =============================================================================

// VM Template Item for creation
export interface LabVMItemCreate {
    name: string
    description?: string
    vm_template_id: string // UUID as string
    cpu_cores: number
    memory_mb: number
    disk_gb: number
    network_config?: Record<string, any>
    startup_delay: number
    order: number
}

// Guide Block for creation
export interface LabGuideBlockCreate {
    block_type: GuideBlockType
    content: string
    title?: string
    order: number
    block_metadata?: Record<string, any>
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
    guide_blocks: LabGuideBlockCreate[]
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
    tags: string[]  // Required for field array

    // Configuration
    duration_minutes: number
    max_concurrent_users: number
    cooldown_minutes: number
    thumbnail_url: string
    thumbnail_file?: File | null
    status: LabStatus

    // Learning Content - REQUIRED for the Details step
    objectives: string[]  // Required for field array
    prerequisites: string[]  // Required for field array

    // VMs
    vms: LabVMItemCreate[]

    // Guide
    guide_blocks: LabGuideBlockCreate[]

    // Network
    network_profile_id: string
}

export const DEFAULT_LAB_VM_ITEM: LabVMItemCreate = {
    name: "",
    description: "",
    vm_template_id: "",
    cpu_cores: 2,
    memory_mb: 4096,
    disk_gb: 50,
    network_config: {},
    startup_delay: 0,
    order: 0
}

export const DEFAULT_GUIDE_BLOCK: LabGuideBlockCreate = {
    block_type: GuideBlockType.TEXT,
    content: "",
    title: "",
    order: 0,
    block_metadata: {}
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
    tags: [],  // Empty array default

    // Config
    duration_minutes: 60,
    max_concurrent_users: 1,
    cooldown_minutes: 0,
    thumbnail_url: "",
    thumbnail_file: null,
    status: LabStatus.DRAFT,

    // Learning Content - REQUIRED
    objectives: [],  // Empty array default
    prerequisites: [],  // Empty array default

    // VMs & Guide
    vms: [],
    guide_blocks: [],

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
        objectives: formData.objectives,
        prerequisites: formData.prerequisites,
        tags: formData.tags,
        network_profile_id: formData.network_profile_id || undefined,
        vms: formData.vms.map((vm, index) => ({
            ...vm,
            order: vm.order ?? index
        })),
        guide_blocks: formData.guide_blocks.map((block, index) => ({
            ...block,
            order: block.order ?? index
        }))
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
        vm.name && vm.vm_template_id
    )

    return basicValid && vmsValid
}

// Array manipulation helpers
export function addObjective(
    data: CreateFullLabDefinitionFormData,
    objective: string
): void {
    if (objective.trim() && !data.objectives.includes(objective.trim())) {
        data.objectives.push(objective.trim())
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
    if (prerequisite.trim() && !data.prerequisites.includes(prerequisite.trim())) {
        data.prerequisites.push(prerequisite.trim())
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
    if (cleanTag && !data.tags.includes(cleanTag)) {
        data.tags.push(cleanTag)
    }
}

export function removeTag(
    data: CreateFullLabDefinitionFormData,
    index: number
): void {
    data.tags.splice(index, 1)
}