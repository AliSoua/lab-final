// app/types/LabGuide/index.ts
// ── Content Block Types ──────────────────────────────────────────────────────

export interface GuideCommand {
    label: string
    command: string
    description?: string
    timeout?: number
    sudo?: boolean
    working_directory?: string
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
    target_vm_name?: string
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

// ── Step Types ───────────────────────────────────────────────────────────────

export interface LabGuideStep {
    id: string
    guide_id: string
    order: number
    title: string
    description?: string
    target_vm_name?: string
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
    target_vm_name?: string
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
    target_vm_name?: string
    theory_content?: string
    commands?: GuideCommand[]
    tasks?: GuideTask[]
    hints?: GuideHint[]
    validations?: ValidationCheck[]
    quiz?: GuideQuiz
    points?: number
    order?: number
}

// ── Guide Types ──────────────────────────────────────────────────────────────

export interface LabGuideListItem {
    id: string
    title: string
    description?: string
    category?: string
    difficulty?: string
    estimated_duration_minutes: number
    tags: string[]
    is_published: boolean
    created_at: string
    step_count: number
}

export interface LabGuide {
    id: string
    title: string
    description?: string
    category?: string
    difficulty?: string
    estimated_duration_minutes: number
    tags: string[]
    is_published: boolean
    created_by: string
    created_at: string
    updated_at: string
    updated_by?: string
    steps: LabGuideStep[]
}

export interface LabGuideCreateRequest {
    title: string
    description?: string
    category?: string
    difficulty?: string
    estimated_duration_minutes?: number
    tags: string[]
    is_published?: boolean
    steps: LabGuideStepCreateRequest[]
}

export interface LabGuideUpdateRequest {
    title?: string
    description?: string
    category?: string
    difficulty?: string
    estimated_duration_minutes?: number
    tags: string[]
    is_published?: boolean
    steps: LabGuideStepCreateRequest[]
}

export interface AssignGuideRequest {
    lab_definition_id: string
}

export interface ReorderStepItem {
    step_id: string
    order: number
}
