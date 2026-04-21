// app/types/LabGuide/index.ts
// ── Execution Target (Runtime VM Resolution) ─────────────────────────────────

export interface ExecutionTarget {
    /** References LabVM.name in the LabDefinition. Runtime maps to an actual instance. */
    vm_name?: string
    // Future: agent_id, container_id, host_override, etc.
}

// ── Content Block Types ──────────────────────────────────────────────────────

export interface GuideCommand {
    label: string
    command: string
    description?: string
    timeout?: number
    sudo?: boolean
    working_directory?: string
    /** Optional VM target. If omitted, runtime resolves from session context. */
    target?: ExecutionTarget
}

export interface GuideTask {
    description: string
    is_required?: boolean
}

export interface GuideHint {
    level: number // 1 = vague, 2 = specific, 3 = almost solution
    content: string
}

export type ValidationCheckType =
    | "port_open"
    | "port_closed"
    | "file_exists"
    | "file_content"
    | "command_output"
    | "user_has_root"
    | "service_running"
    | "process_running"
    | "ping_reachable"
    | "custom_script"

export interface ValidationCheck {
    type: ValidationCheckType
    description: string
    /** Optional VM target. If omitted, check runs from the grading controller. */
    target?: ExecutionTarget
    target_host?: string
    port?: number
    file_path?: string
    expected_content?: string
    command?: string
    expected_output_pattern?: string
    user?: string
    timeout?: number
    is_blocking?: boolean
    points?: number
}

export type QuizType = "multiple_choice" | "short_answer" | "flag"

export interface GuideQuiz {
    question: string
    type: QuizType
    description?: string
    options?: string[]
    correct_answer: string
    case_sensitive?: boolean
    flag_format_hint?: string
    points?: number
}

// ── Step Types (Input for building versions — still needed for creation) ─────

export interface LabGuideStep {
    id: string
    guide_id: string
    order: number
    title: string
    description?: string
    theory_content?: string
    commands: GuideCommand[]
    tasks: GuideTask[]
    hints: GuideHint[]
    validations: ValidationCheck[]
    quiz?: GuideQuiz
    points: number
}

export interface LabGuideStepCreateRequest {
    title: string
    description?: string
    theory_content?: string
    commands: GuideCommand[]
    tasks: GuideTask[]
    hints: GuideHint[]
    validations: ValidationCheck[]
    quiz?: GuideQuiz
    points?: number
    order?: number
}

export interface LabGuideStepUpdateRequest {
    title?: string
    description?: string
    theory_content?: string
    commands?: GuideCommand[]
    tasks?: GuideTask[]
    hints?: GuideHint[]
    validations?: ValidationCheck[]
    quiz?: GuideQuiz
    points?: number
    order?: number
}

// ── Guide Version Types ──────────────────────────────────────────────────────

export interface GuideVersion {
    id: string
    guide_id: string
    version_number: number
    created_by: string
    created_at: string
    is_published: boolean
    published_at?: string
    steps: LabGuideStep[]
    step_count: number
}

export interface GuideVersionListItem {
    id: string
    version_number: number
    is_published: boolean
    created_at: string
    step_count: number
}

export interface GuideVersionCreateRequest {
    steps: LabGuideStepCreateRequest[]
    is_published?: boolean
}

// ── Guide (Logical) Types ────────────────────────────────────────────────────

export interface LabGuideListItem {
    id: string
    title: string
    current_version_id: string | null
    current_version_number: number | null
    current_version_published: boolean | null
    created_at: string
    step_count: number
}

export interface LabGuide {
    id: string
    title: string
    created_by: string
    created_at: string
    updated_at: string
    updated_by?: string
    current_version_id: string | null
    current_version: GuideVersion | null
    total_versions: number
}

export interface LabGuideCreateRequest {
    title: string
    initial_steps?: LabGuideStepCreateRequest[]
    is_published?: boolean
}

export interface LabGuideUpdateRequest {
    title?: string
}

export interface AssignGuideVersionRequest {
    lab_definition_id: string
}

// ── Runtime / Session Types ──────────────────────────────────────────────────

export interface VMInstanceMapping {
    vm_name: string
    instance_id?: string
    ip_address?: string
    hostname?: string
    status: "provisioning" | "running" | "stopped" | "error"
}

export interface LabGuideRuntimeContext {
    session_id: string
    lab_definition_id: string
    guide_version_id: string
    user_id: string
    vm_mappings: VMInstanceMapping[]
    default_vm?: string
    started_at: string
    expires_at?: string
}

export type CommandExecutionStatus = "pending" | "running" | "success" | "failed" | "timeout"

export interface CommandExecutionResult {
    command_index: number
    status: CommandExecutionStatus
    stdout?: string
    stderr?: string
    exit_code?: number
    executed_at?: string
    completed_at?: string
    resolved_target?: string
}

export type ValidationExecutionStatus = "pending" | "running" | "passed" | "failed" | "error"

export interface ValidationExecutionResult {
    validation_index: number
    status: ValidationExecutionStatus
    message?: string
    actual_output?: string
    executed_at?: string
    resolved_target?: string
}

export interface QuizSubmission {
    answer: string
    submitted_at: string
    is_correct: boolean
    attempts: number
}

export interface StepExecutionState {
    step_id: string
    status: "locked" | "available" | "in_progress" | "completed" | "failed"
    quiz_result?: QuizSubmission
    tasks_completed: number[]
    hints_revealed: number[]
    command_results: CommandExecutionResult[]
    validation_results: ValidationExecutionResult[]
    score_earned: number
    started_at?: string
    completed_at?: string
}

export interface LabGuideSessionState {
    runtime_context: LabGuideRuntimeContext
    step_states: StepExecutionState[]
    total_score: number
    max_score: number
    status: "active" | "paused" | "completed" | "abandoned"
}