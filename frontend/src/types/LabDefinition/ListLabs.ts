// src/types/LabDefinition/ListLabs.ts

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

/**
 * Full lab definition response - includes audit fields
 * Matches backend LabDefinitionResponse schema
 * Used for admin/moderator management interface
 */
export interface LabDefinition {
    id: string
    slug: string
    name: string
    description: string
    short_description?: string
    status: LabStatus
    duration_minutes: number
    max_concurrent_users: number
    cooldown_minutes: number
    difficulty: LabDifficulty
    category: LabCategory
    track?: string
    thumbnail_url?: string

    // Audit fields - only visible to admin/moderator
    created_by: string
    created_at: string
    updated_by?: string
    updated_at: string
    published_at?: string
    is_featured?: boolean
    featured_priority: number
}

/**
 * Query parameters for listing lab definitions (admin/moderator)
 */
export interface ListLabsParams {
    skip?: number
    limit?: number
    category?: string
    difficulty?: string
    status?: string
    search?: string
}

/**
 * Lab definition summary for list views
 */
export interface LabDefinitionSummary {
    id: string
    slug: string
    name: string
    status: LabStatus
    category: LabCategory
    difficulty: LabDifficulty
    duration_minutes: number
    created_at: string
    updated_at: string
    created_by: string
}

/**
 * Lab definition filters (admin/moderator interface)
 */
export interface LabDefinitionFilters {
    category: LabCategory | "all"
    difficulty: LabDifficulty | "all"
    status: "all" | "draft" | "published" | "archived"
    searchQuery: string
}