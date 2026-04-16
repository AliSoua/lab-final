// src/types/labs/listLabs.ts
/**
 * Lab types - List, filter, and view lab items
 */

import type {
    LabStatus,
    DifficultyLevel,
    LabFilters,
    LabSortField,
    SortOption,
    LabBase,
} from './common';

// =============================================================================
// List Item Types
// =============================================================================

export interface LabListItem {
    id: string;
    slug: string;
    name: string;
    description: string;
    short_description?: string;
    status: LabStatus;
    difficulty: DifficultyLevel;
    category?: string;
    track?: string;
    tags: string[];
    thumbnail_url?: string;

    // Stats
    duration_minutes: number;
    max_concurrent_users: number;
    estimated_completion_time?: number;

    // Counters
    vm_count: number;
    step_count: number;

    // Metadata
    created_by: string;
    created_at: string;
    updated_at: string;
    published_at?: string;

    // User-specific fields (if available)
    is_enrolled?: boolean;
    progress_percent?: number;
    is_completed?: boolean;
    user_rating?: number;
}

export interface LabDetailResponse extends LabBase {
    // Enriched data
    creator_name?: string;
    updater_name?: string;
    enrolled_count?: number;
    completion_count?: number;
    average_rating?: number;

    // User context
    user_enrollment_status?: 'not_started' | 'in_progress' | 'completed' | 'expired';
    user_attempts_remaining?: number;
    user_current_score?: number;
}

export interface LabListResponse {
    items: LabListItem[];
    total: number;
    page: number;
    page_size: number;
    filters: LabFilters;
    sort: SortOption;
}

export interface LabPaginatedResponse {
    data: LabListItem[];
    meta: {
        total: number;
        page: number;
        last_page: number;
        per_page: number;
    };
}

// =============================================================================
// Query Parameters
// =============================================================================

export interface ListLabsQuery {
    page?: number;
    page_size?: number;
    status?: LabStatus[];
    difficulty?: DifficultyLevel[];
    category?: string;
    track?: string;
    tags?: string[];
    search?: string;
    created_by?: string;
    sort_by?: LabSortField;
    sort_direction?: 'asc' | 'desc';
    include_archived?: boolean;
}

// =============================================================================
// View & Display Types
// =============================================================================

export interface LabCardProps {
    lab: LabListItem;
    viewMode: LabViewMode;
    onClick?: (lab: LabListItem) => void;
    onEdit?: (lab: LabListItem) => void;
    onDelete?: (lab: LabListItem) => void;
    onPublish?: (lab: LabListItem) => void;
    showActions?: boolean;
    isModerator?: boolean;
}

export interface LabTableColumn {
    key: string;
    title: string;
    sortable?: boolean;
    width?: string;
    hidden?: boolean;
}

export interface LabEnrollmentStatus {
    lab_id: string;
    status: 'available' | 'pending_approval' | 'ready' | 'active' | 'paused' | 'expired' | 'completed';
    request_id?: string;
    expires_at?: string;
    time_remaining_seconds?: number;
    current_step_id?: string;
    progress_percent: number;
}

// =============================================================================
// Category & Track Types
// =============================================================================

export interface LabCategory {
    id: string;
    name: string;
    description?: string;
    lab_count: number;
    icon?: string;
    color?: string;
}

export interface LabTrack {
    id: string;
    name: string;
    description?: string;
    labs: string[]; // Lab IDs in order
    difficulty_progression: DifficultyLevel[];
    estimated_total_duration: number;
    prerequisites?: string[];
    completion_badge?: string;
}