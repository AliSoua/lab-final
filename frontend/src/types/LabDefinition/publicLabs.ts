// src/types/LabDefinition/publicLabs.ts
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
 * Public lab definition response - excludes audit fields
 * Matches backend PublicLabDefinitionResponse schema
 * Used for the public catalog (trainee view)
 */
export interface PublicLabDefinition {
    id: string
    slug: string
    name: string
    description: string
    short_description?: string
    status: LabStatus
    duration_minutes: number
    max_concurrent_users: number
    difficulty: LabDifficulty
    category: LabCategory
    track?: string
    thumbnail_url?: string
    objectives: string[]
    prerequisites: string[]
    tags: string[]
    is_featured?: boolean
    featured_priority: number
}

/**
 * Query parameters for listing public labs
 */
export interface ListPublicLabsParams {
    skip?: number
    limit?: number
    category?: string
    difficulty?: string
}

/**
 * Lab catalog filter options (client-side)
 */
export interface LabCatalogFilters {
    category: LabCategory | "all"
    difficulty: LabDifficulty | "all"
    searchQuery: string
}