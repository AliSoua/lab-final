// src/types/profile/user.ts

/**
 * User certification entry
 */
export interface Certification {
    name: string
    issued_at?: string
    expires_at?: string
    url?: string
}

/**
 * User badge for gamification
 */
export interface Badge {
    id: string
    name: string
    icon: string
    earned_at: string
}

/**
 * User preference settings
 */
export interface UserPreferences {
    theme: "light" | "dark" | "system"
    notifications: boolean
    language: string
    email_digest: boolean
}

/**
 * Full user profile response from /profile/me
 */
export interface UserProfile {
    id: string
    keycloak_id: string
    email: string
    username: string
    first_name?: string
    last_name?: string
    role: "trainee" | "moderator" | "admin"
    is_active: boolean

    // Profile fields
    avatar_url?: string
    bio?: string
    job_title?: string
    department?: string
    phone?: string
    timezone: string

    // Platform stats
    total_labs_completed: number
    total_labs_in_progress: number
    total_time_spent_minutes: number
    skill_level: "beginner" | "intermediate" | "advanced"
    points: number
    streak_days: number

    // Arrays & objects
    certifications: Certification[]
    badges: Badge[]
    preferences: UserPreferences

    // Timestamps
    last_activity_at?: string
    created_at: string
    last_login_at?: string
    synced_at: string
}

/**
 * Quick stats response from /profile/me/stats
 */
export interface UserStats {
    labs_completed: number
    labs_in_progress: number
    total_time_hours: number
    skill_level: string
    points: number
    streak_days: number
    badges_count: number
    certifications_count: number
}

/**
 * Profile update request (editable fields only)
 */
export interface UpdateProfileRequest {
    avatar_url?: string
    bio?: string
    job_title?: string
    department?: string
    phone?: string
    timezone?: string
    preferences?: Partial<UserPreferences>
}

/**
 * Display name helper type
 */
export type UserDisplayInfo = {
    displayName: string
    initials: string
    fullName?: string
}