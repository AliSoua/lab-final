// src/types/labs/updateLabs.ts
/**
 * Lab types - Update Lab form data and partial updates
 */

import type {
    DifficultyLevel,
    LabStatus,
    LabGuide,
    VMTemplate,
} from './common';

// =============================================================================
// Update Form Data Types
// =============================================================================

export interface UpdateLabBasicInfo {
    name?: string;
    description?: string;
    short_description?: string;
    difficulty?: DifficultyLevel;
    category?: string;
    track?: string;
    tags?: string[];
    duration_minutes?: number;
    max_concurrent_users?: number;
    cooldown_minutes?: number;
}

export interface UpdateLabAssessment {
    is_graded?: boolean;
    passing_score?: number;
    max_attempts?: number;
    required_labs?: string[];
    required_roles?: string[];
}

export interface UpdateLabStatus {
    status: LabStatus;
    // When publishing, we might want to validate certain fields
    publish_options?: {
        validate_vm_templates: boolean;
        validate_guide_content: boolean;
    };
}

export interface UpdateLabGuide {
    introduction?: string;
    prerequisites?: string[];
    steps?: LabGuide['steps'];
    show_progress_bar?: boolean;
    show_step_timer?: boolean;
    allow_going_back?: boolean;
    show_hints?: boolean;
    external_links?: Array<{ title: string; url: string }>;
    downloadables?: Array<{ name: string; url: string }>;
}

// =============================================================================
// API Update Payloads
// =============================================================================

export interface LabUpdate {
    name?: string;
    description?: string;
    short_description?: string;
    difficulty?: DifficultyLevel;
    category?: string;
    track?: string;
    tags?: string[];
    duration_minutes?: number;
    max_concurrent_users?: number;
    cooldown_minutes?: number;
    is_graded?: boolean;
    passing_score?: number;
    max_attempts?: number;
    required_labs?: string[];
    required_roles?: string[];
    guide?: LabGuide;
    vm_templates?: VMTemplate[];
    status?: LabStatus;
    thumbnail_url?: string;
}

export interface UpdateLabGuideContent {
    step_id?: string; // If updating specific step, otherwise full guide
    content_block_id?: string; // If updating specific block
    guide_data: Partial<LabGuide>;
}

// =============================================================================
// Partial Update Types for Specific Sections
// =============================================================================

export interface UpdateLabVMConfig {
    vm_templates: VMTemplate[];
    // Validation option
    validate_connectivity?: boolean;
}

export interface UpdateLabMetadata {
    tags?: string[];
    category?: string;
    track?: string;
    thumbnail_url?: string;
}