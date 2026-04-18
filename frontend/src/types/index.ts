// src/types/index.ts
export interface User {
    id: string
    sub: string
    username: string
    email: string
    fullName: string
    firstName: string
    lastName: string
    role: "admin" | "moderator" | "trainee"
    emailVerified: boolean
    avatar?: string
}

// Lab Types
export interface Lab {
    id: string
    name: string
    description: string
    slug: string
    status: "running" | "stopped" | "error" | "provisioning"
    progress: number
    duration: string
    vmCount: number
    type: string
    category: string
    difficulty: "beginner" | "intermediate" | "advanced"
    lastAccessed?: string
    createdAt?: string
    updatedAt?: string
}

// Learning Path Types
export interface LearningPath {
    id: string
    title: string
    description: string
    category: string
    difficulty: "beginner" | "intermediate" | "advanced"
    totalLabs: number
    completedLabs: number
    estimatedHours: number
    thumbnail?: string
    isEnrolled?: boolean
    track?: string
    tags?: string[]
}

// Activity Types
export interface Activity {
    id: string
    type: "lab_started" | "lab_completed" | "lab_stopped" | "lab_error" | "achievement" | "course_enrolled"
    user?: {
        name: string
        initials: string
    }
    labName?: string
    courseName?: string
    achievementName?: string
    timestamp: string
    description: string
}

// Stats Types
export interface StatsData {
    title: string
    value: string | number
    description?: string
    trend?: "up" | "down" | "neutral"
    trendValue?: string
    icon: string
}

// API Response Types
export interface LoginResponse {
    access_token: string
    refresh_token: string
    expires_in: number
    refresh_expires_in: number
    token_type: string
    scope: string
}

export interface CheckAuthResponse {
    logged_in: boolean
    user: {
        sub: string
        email_verified: boolean
        name: string
        preferred_username: string
        given_name: string
        family_name: string
        email: string
    }
}

export interface TokenResponse {
    access_token: string
    refresh_token: string
    expires_in?: number
    refresh_expires_in?: number
    token_type?: string
    scope?: string
}

export interface LogoutResponse {
    message: string
}