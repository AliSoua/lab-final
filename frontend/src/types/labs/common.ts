// src/types/labs/common.ts
/**
 * Lab types - Common types, enums, and base interfaces
 */

// =============================================================================
// Enums
// =============================================================================

export enum LabStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    ARCHIVED = 'archived',
    MAINTENANCE = 'maintenance',
}

export enum ContentBlockType {
    TEXT = 'text',
    HTML = 'html',
    CODE = 'code',
    COMMAND = 'command',
    FILE = 'file',
    IMAGE = 'image',
    VIDEO = 'video',
    QUIZ = 'quiz',
    ALERT = 'alert',
}

export enum CommandAction {
    EXECUTE = 'execute',
    COPY = 'copy',
    EXECUTE_CONFIRM = 'execute_confirm',
    SUDO_EXECUTE = 'sudo_execute',
    MULTI_STEP = 'multi_step',
}

export enum DifficultyLevel {
    BEGINNER = 'beginner',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced',
    EXPERT = 'expert',
}

export enum AlertType {
    INFO = 'info',
    WARNING = 'warning',
    SUCCESS = 'success',
    ERROR = 'error',
}

export enum VMOSType {
    LINUX = 'linux',
    WINDOWS = 'windows',
    MACOS = 'macos',
}

export enum GuacamoleConnectionType {
    SSH = 'ssh',
    VNC = 'vnc',
    RDP = 'rdp',
}

// =============================================================================
// Enum Labels & Maps
// =============================================================================

export const LAB_STATUS_LABELS: Record<LabStatus, string> = {
    [LabStatus.DRAFT]: 'Draft',
    [LabStatus.PUBLISHED]: 'Published',
    [LabStatus.ARCHIVED]: 'Archived',
    [LabStatus.MAINTENANCE]: 'Maintenance',
};

export const LAB_STATUS_COLORS: Record<LabStatus, string> = {
    [LabStatus.DRAFT]: 'gray',
    [LabStatus.PUBLISHED]: 'green',
    [LabStatus.ARCHIVED]: 'red',
    [LabStatus.MAINTENANCE]: 'yellow',
};

export const CONTENT_BLOCK_TYPE_LABELS: Record<ContentBlockType, string> = {
    [ContentBlockType.TEXT]: 'Text / Markdown',
    [ContentBlockType.HTML]: 'HTML Content',
    [ContentBlockType.CODE]: 'Code Block',
    [ContentBlockType.COMMAND]: 'Executable Command',
    [ContentBlockType.FILE]: 'File Template',
    [ContentBlockType.IMAGE]: 'Image',
    [ContentBlockType.VIDEO]: 'Video',
    [ContentBlockType.QUIZ]: 'Quiz Question',
    [ContentBlockType.ALERT]: 'Alert Box',
};

export const CONTENT_BLOCK_TYPE_ICONS: Record<ContentBlockType, string> = {
    [ContentBlockType.TEXT]: 'FileText',
    [ContentBlockType.HTML]: 'Code',
    [ContentBlockType.CODE]: 'Terminal',
    [ContentBlockType.COMMAND]: 'Play',
    [ContentBlockType.FILE]: 'FilePlus',
    [ContentBlockType.IMAGE]: 'Image',
    [ContentBlockType.VIDEO]: 'Video',
    [ContentBlockType.QUIZ]: 'HelpCircle',
    [ContentBlockType.ALERT]: 'AlertCircle',
};

export const COMMAND_ACTION_LABELS: Record<CommandAction, string> = {
    [CommandAction.EXECUTE]: 'Execute Immediately',
    [CommandAction.COPY]: 'Copy to Clipboard Only',
    [CommandAction.EXECUTE_CONFIRM]: 'Execute with Confirmation',
    [CommandAction.SUDO_EXECUTE]: 'Execute with Sudo',
    [CommandAction.MULTI_STEP]: 'Multi-Step Command',
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
    [DifficultyLevel.BEGINNER]: 'Beginner',
    [DifficultyLevel.INTERMEDIATE]: 'Intermediate',
    [DifficultyLevel.ADVANCED]: 'Advanced',
    [DifficultyLevel.EXPERT]: 'Expert',
};

export const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
    [DifficultyLevel.BEGINNER]: 'green',
    [DifficultyLevel.INTERMEDIATE]: 'blue',
    [DifficultyLevel.ADVANCED]: 'orange',
    [DifficultyLevel.EXPERT]: 'red',
};

export const VM_OS_TYPE_LABELS: Record<VMOSType, string> = {
    [VMOSType.LINUX]: 'Linux',
    [VMOSType.WINDOWS]: 'Windows',
    [VMOSType.MACOS]: 'macOS',
};

export const GUACAMOLE_CONNECTION_LABELS: Record<GuacamoleConnectionType, string> = {
    [GuacamoleConnectionType.SSH]: 'SSH',
    [GuacamoleConnectionType.VNC]: 'VNC',
    [GuacamoleConnectionType.RDP]: 'RDP',
};

// =============================================================================
// Base Interfaces
// =============================================================================

export interface QuizOption {
    id: string;
    text: string;
    is_correct: boolean;
    feedback?: string;
}

export interface QuizQuestion {
    id: string;
    question: string;
    options: QuizOption[];
    allow_multiple: boolean;
    explanation?: string;
}

export interface CommandStep {
    command: string;
    description: string;
    timeout_seconds?: number;
}

export interface CommandConfig {
    action: CommandAction;
    command: string;
    working_directory?: string;
    timeout_seconds: number;
    expect_output?: string;
    retry_on_fail: boolean;
    show_progress: boolean;
    confirmation_message?: string;
    sudo_password?: string;
    steps: CommandStep[];
    validation_command?: string;
    success_indicator?: string;
}

export interface FileTemplate {
    path: string;
    content: string;
    permissions: string;
    owner: string;
    use_sudo: boolean;
    validate_exists: boolean;
    open_in_editor: boolean;
}

export interface ContentBlock {
    id: string;
    type: ContentBlockType;
    title?: string;
    content: string;

    // Type-specific configs
    command_config?: CommandConfig;
    file_template?: FileTemplate;
    quiz_questions?: QuizQuestion[];

    // Media
    media_url?: string;
    alt_text?: string;
    alert_type?: AlertType; // For ALERT type

    // Styling & Behavior
    css_class?: string;
    collapsible: boolean;
    collapsed_by_default: boolean;

    // Tracking
    track_completion: boolean;
    required_to_complete: boolean;

    // Conditional display
    show_if?: string;
    hide_if?: string;
}

export interface LabStep {
    id: string;
    title: string;
    description?: string;
    order: number;
    content_blocks: ContentBlock[];

    // Configuration
    estimated_minutes: number;
    allow_skip: boolean;
    require_all_blocks: boolean;

    // Dependencies
    requires_steps: string[];

    // Validation
    validation_script?: string;
    auto_advance: boolean;
}

export interface LabGuide {
    introduction: string;
    prerequisites: string[];
    steps: LabStep[];

    // Global settings
    show_progress_bar: boolean;
    show_step_timer: boolean;
    allow_going_back: boolean;
    show_hints: boolean;

    // Completion
    completion_requirements: Record<string, unknown>;

    // Resources
    external_links: Array<{ title: string; url: string }>;
    downloadables: Array<{ name: string; url: string }>;
}

export interface VMNetworkConfig {
    vlan_id?: number;
    bridge: string;
    firewall_rules: Array<Record<string, unknown>>;
    isolated_network: boolean;
    internet_access: boolean;
}

export interface VMTemplate {
    id: string; // Proxmox VM ID
    name: string;
    description?: string;
    os_type: VMOSType;
    os_distribution?: string;

    // Resources
    cpu_cores: number;
    memory_mb: number;
    disk_gb: number;

    // Network
    network_config: VMNetworkConfig;

    // Guacamole
    guacamole_connection_type: GuacamoleConnectionType;
    guacamole_port: number;
    guacamole_username: string;
    guacamole_password_secret?: string;

    // Startup
    startup_delay_seconds: number;
    wait_for_cloud_init: boolean;

    // Reset functionality
    allow_reset: boolean;
    snapshot_name: string;
}

export interface LabBase {
    id: string;
    slug: string;
    name: string;
    description: string;
    short_description?: string;

    // Status
    status: LabStatus;
    created_by: string;
    created_at: string;
    updated_at: string;
    updated_by?: string;
    published_at?: string;

    // Categorization
    tags: string[];
    difficulty: DifficultyLevel;
    category?: string;
    track?: string;

    // Configuration
    duration_minutes: number;
    max_concurrent_users: number;
    cooldown_minutes: number;

    // Requirements
    required_labs: string[];
    required_roles: string[];

    // Assessment
    is_graded: boolean;
    passing_score?: number;
    max_attempts?: number;

    // Content
    guide: LabGuide;
    vm_templates: VMTemplate[];

    // Metadata
    thumbnail_url?: string;
    estimated_completion_time?: number;
}

// =============================================================================
// Filter & Sort Types
// =============================================================================

export interface LabFilters {
    status?: LabStatus[];
    difficulty?: DifficultyLevel[];
    category?: string;
    track?: string;
    tags?: string[];
    search?: string;
    created_by?: string;
    is_graded?: boolean;
    has_vm_templates?: boolean;
}

export enum LabSortField {
    CREATED_AT = 'created_at',
    UPDATED_AT = 'updated_at',
    NAME = 'name',
    DIFFICULTY = 'difficulty',
    DURATION_MINUTES = 'duration_minutes',
    PUBLISHED_AT = 'published_at',
}

export interface SortOption {
    field: LabSortField;
    direction: 'asc' | 'desc';
}

// =============================================================================
// Utility Types
// =============================================================================

export type LabViewMode = 'grid' | 'list' | 'table';

export interface LabCompletionRequirements {
    min_steps_completed?: number;
    required_quiz_score?: number;
    require_all_commands_executed?: boolean;
    time_limit_minutes?: number;
}