// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

// App Configuration
export const APP_NAME = "Lab Orchestration Platform"
export const APP_DESCRIPTION = "IT Training Platform for vSphere, Proxmox, Docker, and more"

// Role Configuration
export const ROLES = {
    ADMIN: "admin",
    MODERATOR: "moderator",
    TRAINEE: "trainee",
} as const

// Lab Status Configuration
export const LAB_STATUS = {
    RUNNING: "running",
    STOPPED: "stopped",
    ERROR: "error",
    PROVISIONING: "provisioning",
} as const

// Difficulty Levels
export const DIFFICULTY = {
    BEGINNER: "beginner",
    INTERMEDIATE: "intermediate",
    ADVANCED: "advanced",
} as const

// Activity Types
export const ACTIVITY_TYPES = {
    LAB_STARTED: "lab_started",
    LAB_COMPLETED: "lab_completed",
    LAB_STOPPED: "lab_stopped",
    LAB_ERROR: "lab_error",
    ACHIEVEMENT: "achievement",
    COURSE_ENROLLED: "course_enrolled",
} as const

// Local Storage Keys
export const STORAGE_KEYS = {
    ACCESS_TOKEN: "access_token",
    REFRESH_TOKEN: "refresh_token",
    USER: "user",
    THEME: "theme",
    SIDEBAR_COLLAPSED: "sidebar_collapsed",
} as const

// Routes
export const ROUTES = {
    HOME: "/",
    LOGIN: "/login",
    LABS: "/labs",
    CATALOG: "/catalog",
    LEARNING: "/learning",
    INFRASTRUCTURE: "/infrastructure",
    ANALYTICS: "/analytics",
    USERS: "/users",
    SETTINGS: "/settings",
} as const

// Theme Configuration
export const THEME = {
    LIGHT: "light",
    DARK: "dark",
    SYSTEM: "system",
} as const