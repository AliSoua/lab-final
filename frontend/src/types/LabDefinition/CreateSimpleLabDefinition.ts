// src/types/LabDefinition/CreateSimpleLabDefinition.ts

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

// =============================================================================
// FIELD ARRAY HELPERS
// =============================================================================

export interface StringFieldItem {
    value: string
}

// =============================================================================
// SIMPLE LAB DEFINITION (Basic create)
// =============================================================================

export interface CreateSimpleLabDefinitionRequest {
    name: string
    slug: string
    description: string
    short_description: string
    category: LabCategory
    difficulty: LabDifficulty
    duration_minutes: number
    max_concurrent_users?: number
    cooldown_minutes?: number
    track?: string
    thumbnail_url?: string
    status?: LabStatus
    objectives: string[]
    prerequisites: string[]
    tags: string[]
}

export interface CreateSimpleLabDefinitionFormData {
    name: string
    slug: string
    description: string
    short_description: string
    category: LabCategory | ""
    difficulty: LabDifficulty | ""
    duration_minutes: number
    max_concurrent_users: number
    cooldown_minutes: number
    track: string
    thumbnail_url: string
    thumbnail_file?: File | null
    status: LabStatus
    objectives: StringFieldItem[]
    prerequisites: StringFieldItem[]
    tags: StringFieldItem[]
}

export const DEFAULT_CREATE_SIMPLE_LAB_FORM_DATA: CreateSimpleLabDefinitionFormData = {
    name: "",
    slug: "",
    description: "",
    short_description: "",
    category: "",
    difficulty: "",
    duration_minutes: 60,
    max_concurrent_users: 1,
    cooldown_minutes: 0,
    track: "",
    thumbnail_url: "",
    thumbnail_file: null,
    status: LabStatus.DRAFT,
    objectives: [],
    prerequisites: [],
    tags: [],
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

// Convert simple form data to API request
export function toSimpleCreateRequest(
    formData: CreateSimpleLabDefinitionFormData
): CreateSimpleLabDefinitionRequest {
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
        tags: formData.tags.map(t => t.value)
    }
}

// Validation helper
export function isValidSimpleLabForm(data: CreateSimpleLabDefinitionFormData): boolean {
    return !!(
        data.name &&
        data.description &&
        data.category &&
        data.difficulty &&
        data.duration_minutes > 0
    )
}

// Array manipulation helpers
export function addObjective(
    data: CreateSimpleLabDefinitionFormData,
    objective: string
): void {
    const trimmed = objective.trim()
    if (trimmed && !data.objectives.some(o => o.value === trimmed)) {
        data.objectives.push({ value: trimmed })
    }
}

export function removeObjective(
    data: CreateSimpleLabDefinitionFormData,
    index: number
): void {
    data.objectives.splice(index, 1)
}

export function addPrerequisite(
    data: CreateSimpleLabDefinitionFormData,
    prerequisite: string
): void {
    const trimmed = prerequisite.trim()
    if (trimmed && !data.prerequisites.some(p => p.value === trimmed)) {
        data.prerequisites.push({ value: trimmed })
    }
}

export function removePrerequisite(
    data: CreateSimpleLabDefinitionFormData,
    index: number
): void {
    data.prerequisites.splice(index, 1)
}

export function addTag(
    data: CreateSimpleLabDefinitionFormData,
    tag: string
): void {
    const cleanTag = tag.trim().toLowerCase().replace(/\s+/g, '-')
    if (cleanTag && !data.tags.some(t => t.value === cleanTag)) {
        data.tags.push({ value: cleanTag })
    }
}

export function removeTag(
    data: CreateSimpleLabDefinitionFormData,
    index: number
): void {
    data.tags.splice(index, 1)
}