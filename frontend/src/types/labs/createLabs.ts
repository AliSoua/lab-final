// src/types/labs/createLabs.ts
/**
 * Lab types - Create Lab wizard and form data
 */

// ❌ WRONG - These are used as values, not just types
// import type {
//     ContentBlockType,
//     CommandAction,
//     DifficultyLevel,
//     LabStatus,
//     VMOSType,
//     GuacamoleConnectionType,
//     AlertType,
// } from './common';

// ✅ CORRECT - Import enums as values (not type-only)
import {
    ContentBlockType,
    CommandAction,
    DifficultyLevel,
    LabStatus,
    VMOSType,
    GuacamoleConnectionType,
    AlertType,
} from './common';

// =============================================================================
// Wizard Step Configuration
// =============================================================================

export enum CreateLabStep {
    BASIC_INFO = 'basic_info',
    VM_CONFIGURATION = 'vm_configuration',
    GUIDE_CONTENT = 'guide_content',
    ASSESSMENT = 'assessment',
    REVIEW = 'review',
}

export interface CreateLabStepConfig {
    id: CreateLabStep;
    title: string;
    description: string;
    icon: string;
    fields: string[];
}

export const CREATE_LAB_STEPS: CreateLabStepConfig[] = [
    {
        id: CreateLabStep.BASIC_INFO,
        title: 'Basic Information',
        description: 'Define lab name, description, and categorization',
        icon: 'Info',
        fields: ['name', 'slug', 'description', 'short_description', 'difficulty', 'category', 'track', 'tags', 'duration_minutes', 'max_concurrent_users'],
    },
    {
        id: CreateLabStep.VM_CONFIGURATION,
        title: 'VM Configuration',
        description: 'Configure virtual machine templates for the lab',
        icon: 'Server',
        fields: ['vm_templates'],
    },
    {
        id: CreateLabStep.GUIDE_CONTENT,
        title: 'Lab Guide',
        description: 'Create the interactive learning content and steps',
        icon: 'BookOpen',
        fields: ['guide'],
    },
    {
        id: CreateLabStep.ASSESSMENT,
        title: 'Assessment & Access',
        description: 'Configure grading, prerequisites, and access control',
        icon: 'Shield',
        fields: ['is_graded', 'passing_score', 'required_labs', 'required_roles', 'cooldown_minutes'],
    },
    {
        id: CreateLabStep.REVIEW,
        title: 'Review & Create',
        description: 'Review your configuration before creating',
        icon: 'CheckCircle',
        fields: [],
    },
];

// =============================================================================
// Form Data Types
// =============================================================================

export interface CreateLabBasicInfo {
    name: string;
    slug: string;
    description: string;
    short_description: string;
    difficulty: DifficultyLevel;
    category: string;
    track: string;
    tags: string[];
    duration_minutes: number;
    max_concurrent_users: number;
    cooldown_minutes: number;
}

export interface QuizQuestionFormData {
    id: string;
    question: string;
    options: Array<{
        id: string;
        text: string;
        is_correct: boolean;
        feedback: string;
    }>;
    allow_multiple: boolean;
    explanation: string;
}

export interface CommandStepFormData {
    command: string;
    description: string;
    timeout_seconds: number;
}

export interface CommandConfigFormData {
    action: CommandAction;
    command: string;
    working_directory: string;
    timeout_seconds: number;
    expect_output: string;
    retry_on_fail: boolean;
    show_progress: boolean;
    confirmation_message: string;
    sudo_password: string;
    steps: CommandStepFormData[];
    validation_command: string;
    success_indicator: string;
}

export interface FileTemplateFormData {
    path: string;
    content: string;
    permissions: string;
    owner: string;
    use_sudo: boolean;
    validate_exists: boolean;
    open_in_editor: boolean;
}

export interface ContentBlockFormData {
    id: string;
    type: ContentBlockType;
    title: string;
    content: string;
    command_config?: CommandConfigFormData;
    file_template?: FileTemplateFormData;
    quiz_questions?: QuizQuestionFormData[];
    media_url: string;
    alt_text: string;
    alert_type: AlertType;
    css_class: string;
    collapsible: boolean;
    collapsed_by_default: boolean;
    track_completion: boolean;
    required_to_complete: boolean;
    show_if: string;
    hide_if: string;
}

export interface LabStepFormData {
    id: string;
    title: string;
    description: string;
    order: number;
    content_blocks: ContentBlockFormData[];
    estimated_minutes: number;
    allow_skip: boolean;
    require_all_blocks: boolean;
    requires_steps: string[];
    validation_script: string;
    auto_advance: boolean;
}

export interface LabGuideFormData {
    introduction: string;
    prerequisites: string[];
    steps: LabStepFormData[];
    show_progress_bar: boolean;
    show_step_timer: boolean;
    allow_going_back: boolean;
    show_hints: boolean;
    external_links: Array<{ title: string; url: string }>;
    downloadables: Array<{ name: string; url: string }>;
}

export interface VMNetworkConfigFormData {
    vlan_id?: number;
    bridge: string;
    firewall_rules: Array<Record<string, unknown>>;
    isolated_network: boolean;
    internet_access: boolean;
}

export interface VMTemplateFormData {
    id: string;
    name: string;
    description: string;
    os_type: VMOSType;
    os_distribution: string;
    cpu_cores: number;
    memory_mb: number;
    disk_gb: number;
    network_config: VMNetworkConfigFormData;
    guacamole_connection_type: GuacamoleConnectionType;
    guacamole_port: number;
    guacamole_username: string;
    guacamole_password_secret: string;
    startup_delay_seconds: number;
    wait_for_cloud_init: boolean;
    allow_reset: boolean;
    snapshot_name: string;
}

export interface CreateLabAssessment {
    is_graded: boolean;
    passing_score?: number;
    max_attempts?: number;
    required_labs: string[];
    required_roles: string[];
}

export interface CreateLabFormData {
    basic_info: CreateLabBasicInfo;
    vm_templates: VMTemplateFormData[];
    guide: LabGuideFormData;
    assessment: CreateLabAssessment;
    status: LabStatus;
}

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_COMMAND_STEP_FORM_DATA: CommandStepFormData = {
    command: '',
    description: '',
    timeout_seconds: 30,
};

export const DEFAULT_COMMAND_CONFIG_FORM_DATA: CommandConfigFormData = {
    action: CommandAction.EXECUTE,  // Line 237 - Now works because CommandAction is imported as value
    command: '',
    working_directory: '/home/user',
    timeout_seconds: 30,
    expect_output: '',
    retry_on_fail: false,
    show_progress: true,
    confirmation_message: '',
    sudo_password: '',
    steps: [],
    validation_command: '',
    success_indicator: '',
};

export const DEFAULT_FILE_TEMPLATE_FORM_DATA: FileTemplateFormData = {
    path: '',
    content: '',
    permissions: '644',
    owner: 'user',
    use_sudo: false,
    validate_exists: true,
    open_in_editor: false,
};

export const DEFAULT_QUIZ_QUESTION_FORM_DATA: QuizQuestionFormData = {
    id: '',
    question: '',
    options: [
        { id: 'a', text: '', is_correct: false, feedback: '' },
        { id: 'b', text: '', is_correct: false, feedback: '' },
    ],
    allow_multiple: false,
    explanation: '',
};

export const DEFAULT_CONTENT_BLOCK_FORM_DATA: ContentBlockFormData = {
    id: '',
    type: ContentBlockType.TEXT,  // Also fixed - used as value
    title: '',
    content: '',
    media_url: '',
    alt_text: '',
    alert_type: AlertType.INFO,  // Also fixed - used as value
    css_class: '',
    collapsible: false,
    collapsed_by_default: false,
    track_completion: false,
    required_to_complete: false,
    show_if: '',
    hide_if: '',
};

export const DEFAULT_LAB_STEP_FORM_DATA: LabStepFormData = {
    id: '',
    title: '',
    description: '',
    order: 1,
    content_blocks: [],
    estimated_minutes: 10,
    allow_skip: false,
    require_all_blocks: false,
    requires_steps: [],
    validation_script: '',
    auto_advance: false,
};

export const DEFAULT_VM_NETWORK_CONFIG_FORM_DATA: VMNetworkConfigFormData = {
    bridge: 'vmbr0',
    firewall_rules: [],
    isolated_network: false,
    internet_access: true,
};

export const DEFAULT_VM_TEMPLATE_FORM_DATA: VMTemplateFormData = {
    id: '',
    name: '',
    description: '',
    os_type: VMOSType.LINUX,  // Also fixed - used as value
    os_distribution: 'ubuntu',
    cpu_cores: 2,
    memory_mb: 2048,
    disk_gb: 20,
    network_config: DEFAULT_VM_NETWORK_CONFIG_FORM_DATA,
    guacamole_connection_type: GuacamoleConnectionType.SSH,  // Also fixed - used as value
    guacamole_port: 22,
    guacamole_username: 'user',
    guacamole_password_secret: '',
    startup_delay_seconds: 0,
    wait_for_cloud_init: true,
    allow_reset: true,
    snapshot_name: 'clean-state',
};

export const DEFAULT_LAB_GUIDE_FORM_DATA: LabGuideFormData = {
    introduction: '',
    prerequisites: [],
    steps: [],
    show_progress_bar: true,
    show_step_timer: true,
    allow_going_back: true,
    show_hints: true,
    external_links: [],
    downloadables: [],
};

export const DEFAULT_CREATE_LAB_BASIC_INFO: CreateLabBasicInfo = {
    name: '',
    slug: '',
    description: '',
    short_description: '',
    difficulty: DifficultyLevel.BEGINNER,  // Also fixed - used as value
    category: '',
    track: '',
    tags: [],
    duration_minutes: 60,
    max_concurrent_users: 1,
    cooldown_minutes: 0,
};

export const DEFAULT_CREATE_LAB_ASSESSMENT: CreateLabAssessment = {
    is_graded: false,
    passing_score: 70,
    max_attempts: 3,
    required_labs: [],
    required_roles: [],
};

export const DEFAULT_CREATE_LAB_FORM_DATA: CreateLabFormData = {
    basic_info: DEFAULT_CREATE_LAB_BASIC_INFO,
    vm_templates: [{ ...DEFAULT_VM_TEMPLATE_FORM_DATA }],
    guide: DEFAULT_LAB_GUIDE_FORM_DATA,
    assessment: DEFAULT_CREATE_LAB_ASSESSMENT,
    status: LabStatus.DRAFT,  // Also fixed - used as value
};

// =============================================================================
// Validation Types
// =============================================================================

export interface ContentBlockValidationError {
    id: string;
    type?: string;
    content?: string;
    command_config?: Record<string, string>;
    file_template?: Record<string, string>;
    quiz_questions?: Record<string, string>[];
}

export interface LabStepValidationError {
    id: string;
    title?: string;
    content_blocks?: ContentBlockValidationError[];
}

export interface VMTemplateValidationError {
    id?: string;
    name?: string;
    os_type?: string;
    cpu_cores?: string;
    memory_mb?: string;
    disk_gb?: string;
}

export interface CreateLabValidationErrors {
    basic_info?: {
        name?: string;
        slug?: string;
        description?: string;
        duration_minutes?: string;
        max_concurrent_users?: string;
    };
    vm_templates?: VMTemplateValidationError[];
    guide?: {
        introduction?: string;
        steps?: LabStepValidationError[];
    };
    assessment?: {
        passing_score?: string;
        max_attempts?: string;
    };
}

// =============================================================================
// API Payload Types
// =============================================================================

export interface LabCreate {
    slug: string;
    name: string;
    description: string;
    short_description?: string;
    difficulty: DifficultyLevel;
    category?: string;
    track?: string;
    tags: string[];
    duration_minutes: number;
    max_concurrent_users: number;
    cooldown_minutes: number;
    is_graded: boolean;
    passing_score?: number;
    max_attempts?: number;
    required_labs: string[];
    required_roles: string[];
    guide: LabGuideFormData;
    vm_templates: VMTemplateFormData[];
    status: LabStatus;
}

// =============================================================================
// Helper Functions
// =============================================================================

export function createEmptyContentBlock(type: ContentBlockType = ContentBlockType.TEXT): ContentBlockFormData {
    return {
        ...DEFAULT_CONTENT_BLOCK_FORM_DATA,
        id: `block-${Date.now()}`,
        type,
    };
}

export function createEmptyLabStep(order: number = 1): LabStepFormData {
    return {
        ...DEFAULT_LAB_STEP_FORM_DATA,
        id: `step-${Date.now()}`,
        order,
        content_blocks: [createEmptyContentBlock()],
    };
}

export function createEmptyVMTemplate(): VMTemplateFormData {
    return {
        ...DEFAULT_VM_TEMPLATE_FORM_DATA,
        id: `vm-${Date.now()}`,
    };
}

export function createEmptyQuizOption(id: string): QuizQuestionFormData['options'][0] {
    return {
        id,
        text: '',
        is_correct: false,
        feedback: '',
    };
}

export function transformFormDataToApiPayload(formData: CreateLabFormData): LabCreate {
    return {
        slug: formData.basic_info.slug,
        name: formData.basic_info.name,
        description: formData.basic_info.description,
        short_description: formData.basic_info.short_description,
        difficulty: formData.basic_info.difficulty,
        category: formData.basic_info.category || undefined,
        track: formData.basic_info.track || undefined,
        tags: formData.basic_info.tags,
        duration_minutes: formData.basic_info.duration_minutes,
        max_concurrent_users: formData.basic_info.max_concurrent_users,
        cooldown_minutes: formData.basic_info.cooldown_minutes,
        is_graded: formData.assessment.is_graded,
        passing_score: formData.assessment.passing_score,
        max_attempts: formData.assessment.max_attempts,
        required_labs: formData.assessment.required_labs,
        required_roles: formData.assessment.required_roles,
        guide: formData.guide,
        vm_templates: formData.vm_templates,
        status: formData.status,
    };
}