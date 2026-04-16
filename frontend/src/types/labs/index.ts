// src/types/labs/index.ts
/**
 * Lab types barrel export
 */

// =============================================================================
// Common Types & Enums
// =============================================================================

// Export ENUMS as VALUES (not types) - they have runtime existence
export {
    LabStatus,
    ContentBlockType,
    CommandAction,
    DifficultyLevel,
    AlertType,
    VMOSType,
    GuacamoleConnectionType,
} from './common';

// Export TYPES (interfaces, type aliases)
export type {
    // Base interfaces
    QuizOption,
    QuizQuestion,
    CommandStep,
    CommandConfig,
    FileTemplate,
    ContentBlock,
    LabStep,
    LabGuide,
    VMNetworkConfig,
    VMTemplate,
    LabBase,

    // Filter & Sort
    LabFilters,
    LabSortField,
    SortOption,

    // Utility
    LabViewMode,
    LabCompletionRequirements,
} from './common';

// Export constants/labels
export {
    LAB_STATUS_LABELS,
    LAB_STATUS_COLORS,
    CONTENT_BLOCK_TYPE_LABELS,
    CONTENT_BLOCK_TYPE_ICONS,
    COMMAND_ACTION_LABELS,
    DIFFICULTY_LABELS,
    DIFFICULTY_COLORS,
    VM_OS_TYPE_LABELS,
    GUACAMOLE_CONNECTION_LABELS,
} from './common';

// =============================================================================
// Create Types
// =============================================================================

// Export enum as value
export {
    CreateLabStep,
} from './createLabs';

export type {
    CreateLabStepConfig,
    CreateLabBasicInfo,
    QuizQuestionFormData,
    CommandStepFormData,
    CommandConfigFormData,
    FileTemplateFormData,
    ContentBlockFormData,
    LabStepFormData,
    LabGuideFormData,
    VMNetworkConfigFormData,
    VMTemplateFormData,
    CreateLabAssessment,
    CreateLabFormData,
    ContentBlockValidationError,
    LabStepValidationError,
    VMTemplateValidationError,
    CreateLabValidationErrors,
    LabCreate,
} from './createLabs';

export {
    CREATE_LAB_STEPS,
    DEFAULT_COMMAND_STEP_FORM_DATA,
    DEFAULT_COMMAND_CONFIG_FORM_DATA,
    DEFAULT_FILE_TEMPLATE_FORM_DATA,
    DEFAULT_QUIZ_QUESTION_FORM_DATA,
    DEFAULT_CONTENT_BLOCK_FORM_DATA,
    DEFAULT_LAB_STEP_FORM_DATA,
    DEFAULT_VM_NETWORK_CONFIG_FORM_DATA,
    DEFAULT_VM_TEMPLATE_FORM_DATA,
    DEFAULT_LAB_GUIDE_FORM_DATA,
    DEFAULT_CREATE_LAB_BASIC_INFO,
    DEFAULT_CREATE_LAB_ASSESSMENT,
    DEFAULT_CREATE_LAB_FORM_DATA,
    createEmptyContentBlock,
    createEmptyLabStep,
    createEmptyVMTemplate,
    createEmptyQuizOption,
    transformFormDataToApiPayload,
} from './createLabs';

// =============================================================================
// Update Types
// =============================================================================

export type {
    UpdateLabBasicInfo,
    UpdateLabAssessment,
    UpdateLabStatus,
    UpdateLabGuide,
    LabUpdate,
    UpdateLabGuideContent,
    UpdateLabVMConfig,
    UpdateLabMetadata,
} from './updateLabs';

// =============================================================================
// List Types
// =============================================================================

export type {
    LabListItem,
    LabDetailResponse,
    LabListResponse,
    LabPaginatedResponse,
    ListLabsQuery,
    LabCardProps,
    LabTableColumn,
    LabEnrollmentStatus,
    LabCategory,
    LabTrack,
} from './listLabs';

// Legacy alias for backward compatibility
export type { LabListItem as Lab } from './listLabs';