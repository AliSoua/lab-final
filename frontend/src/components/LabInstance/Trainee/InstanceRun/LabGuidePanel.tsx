// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel.tsx
import { useState, useMemo, useCallback } from "react"
import {
    BookOpen,
    ChevronDown,
    ChevronRight,
    Play,
    CheckCircle2,
    Circle,
    Lock,
    AlertCircle,
    Loader2,
    Terminal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LabGuideStep, StepExecutionState, GuideCommand, GuideTask, GuideHint, ValidationCheck, GuideQuiz } from "@/types/LabGuide"

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

interface LabGuidePanelProps {
    steps: LabGuideStep[]
    /** Map of step_id → execution state. Empty object until session_state hydrates. */
    stepStates?: Record<string, StepExecutionState>
    currentStepIndex: number
    onStepChange: (index: number) => void
    /** Fires when trainee clicks "Run" on a command. */
    onRunCommand?: (stepId: string, commandIndex: number) => void
    isLoading?: boolean
    error?: string | null
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

type StepStatus = StepExecutionState["status"] | "locked"

function getStepStatus(
    stepId: string,
    index: number,
    states: Record<string, StepExecutionState>,
): StepStatus {
    const state = states[stepId]
    return state?.status || (index === 0 ? "available" : "locked")
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS (extract to separate files later if desired)
   ═══════════════════════════════════════════════════════════════════════════ */

function GuideHeader({
    currentStepIndex,
    totalSteps,
}: {
    currentStepIndex: number
    totalSteps: number
}) {
    const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0

    return (
        <div className="shrink-0 border-b border-[#e8e8e8] bg-white px-5 py-3">
            <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-[#3a3a3a]">Lab Guide</h2>
                <span className="text-[11px] text-[#727373]">
                    Step {currentStepIndex + 1} of {totalSteps}
                </span>
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-[#e8e8e8] overflow-hidden">
                <div
                    className="h-full rounded-full bg-[#1ca9b1] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}

function StepNavBar({
    steps,
    stepStates,
    currentStepIndex,
    onStepChange,
}: {
    steps: LabGuideStep[]
    stepStates: Record<string, StepExecutionState>
    currentStepIndex: number
    onStepChange: (index: number) => void
}) {
    return (
        <div className="shrink-0 border-b border-[#e8e8e8] bg-white">
            <div className="flex gap-1 overflow-x-auto px-3 py-2 scrollbar-hide">
                {steps.map((step, index) => {
                    const status = getStepStatus(step.id, index, stepStates)
                    const isCurrent = index === currentStepIndex

                    return (
                        <button
                            key={step.id}
                            onClick={() => onStepChange(index)}
                            disabled={status === "locked"}
                            className={cn(
                                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition",
                                isCurrent
                                    ? "bg-[#1ca9b1]/10 text-[#1ca9b1] ring-1 ring-[#1ca9b1]"
                                    : status === "completed"
                                        ? "bg-emerald-50 text-emerald-600"
                                        : status === "locked"
                                            ? "bg-[#f2f2f2] text-[#c4c4c4] cursor-not-allowed"
                                            : "bg-[#f9f9f9] text-[#727373] hover:bg-[#f2f2f2]",
                            )}
                        >
                            {status === "completed" ? (
                                <CheckCircle2 className="h-3 w-3" />
                            ) : status === "locked" ? (
                                <Lock className="h-3 w-3" />
                            ) : (
                                <Circle className="h-3 w-3" />
                            )}
                            {index + 1}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

/* ── Content Sections ───────────────────────────────────────────────────── */

function TheorySection({ content }: { content?: string }) {
    if (!content) return null
    return (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
            <div className="prose prose-sm max-w-none text-[13px] text-[#3a3a3a] leading-relaxed">
                {content}
            </div>
        </div>
    )
}

function TasksSection({
    tasks,
    completedIndices,
}: {
    tasks: GuideTask[]
    completedIndices: number[]
}) {
    if (tasks.length === 0) return null

    return (
        <div className="space-y-2">
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                Tasks
            </h4>
            {tasks.map((task, i) => {
                const isDone = completedIndices.includes(i)
                return (
                    <div
                        key={i}
                        className={cn(
                            "flex items-start gap-2 rounded-lg border p-3 text-[13px] transition-colors",
                            isDone
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-[#e8e8e8] bg-white text-[#3a3a3a]",
                        )}
                    >
                        <CheckCircle2
                            className={cn(
                                "mt-0.5 h-4 w-4 shrink-0",
                                isDone ? "text-emerald-500" : "text-[#c4c4c4]",
                            )}
                        />
                        <span>{task.description}</span>
                    </div>
                )
            })}
        </div>
    )
}

function CommandsSection({
    stepId,
    commands,
    onRunCommand,
    commandResults,
}: {
    stepId: string
    commands: GuideCommand[]
    onRunCommand?: (stepId: string, commandIndex: number) => void
    commandResults: StepExecutionState["command_results"]
}) {
    if (commands.length === 0) return null

    return (
        <div className="space-y-2">
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                Commands
            </h4>
            {commands.map((cmd, i) => {
                const result = commandResults[i]
                const isRunning = result?.status === "running"

                return (
                    <div
                        key={i}
                        className="rounded-lg border border-[#e8e8e8] bg-[#1a1a1a] p-3"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <Terminal className="h-3 w-3 shrink-0 text-[#1ca9b1]" />
                                <span className="text-[12px] font-medium text-[#1ca9b1] truncate">
                                    {cmd.label}
                                </span>
                            </div>
                            {onRunCommand && (
                                <button
                                    onClick={() => onRunCommand(stepId, i)}
                                    disabled={isRunning}
                                    className={cn(
                                        "flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium text-white transition",
                                        isRunning
                                            ? "bg-[#727373] cursor-not-allowed"
                                            : "bg-[#1ca9b1] hover:bg-[#17959c]",
                                    )}
                                >
                                    {isRunning ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Play className="h-3 w-3" />
                                    )}
                                    {isRunning ? "Running…" : "Run"}
                                </button>
                            )}
                        </div>
                        <code className="mt-2 block text-[12px] font-mono text-[#a0a0a0] break-all">
                            {cmd.command}
                        </code>
                        {result?.status === "failed" && result.stderr && (
                            <p className="mt-2 text-[11px] text-red-400 font-mono">
                                {result.stderr}
                            </p>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function HintsSection({ hints, revealedIndices }: { hints: GuideHint[]; revealedIndices: number[] }) {
    if (hints.length === 0) return null

    return (
        <div className="space-y-2">
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                Hints
            </h4>
            {hints.map((hint, i) => (
                <HintItem key={i} hint={hint} index={i} isRevealed={revealedIndices.includes(i)} />
            ))}
        </div>
    )
}

function HintItem({
    hint,
    index,
    isRevealed,
}: {
    hint: GuideHint
    index: number
    isRevealed: boolean
}) {
    const [open, setOpen] = useState(isRevealed)

    return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
            <button
                onClick={() => setOpen(prev => !prev)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            >
                <ChevronRight
                    className={cn(
                        "h-3 w-3 shrink-0 transition-transform duration-200",
                        open && "rotate-90",
                    )}
                />
                Hint Level {hint.level}
                {!open && !isRevealed && (
                    <span className="ml-auto text-[10px] text-amber-600/70">Hidden</span>
                )}
            </button>
            {open && (
                <p className="px-3 pb-3 text-[12px] text-amber-800 leading-relaxed">
                    {hint.content}
                </p>
            )}
        </div>
    )
}

function ValidationsSection({
    validations,
    validationResults,
}: {
    validations: ValidationCheck[]
    validationResults: StepExecutionState["validation_results"]
}) {
    if (validations.length === 0) return null

    return (
        <div className="space-y-2">
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                Validation Checks
            </h4>
            {validations.map((v, i) => {
                const result = validationResults[i]
                const isPassed = result?.status === "passed"
                const isFailed = result?.status === "failed" || result?.status === "error"

                return (
                    <div
                        key={i}
                        className={cn(
                            "flex items-start gap-2 rounded-lg border p-3 text-[12px] transition-colors",
                            isPassed
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : isFailed
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : "border-[#e8e8e8] bg-white text-[#727373]",
                        )}
                    >
                        <CheckCircle2
                            className={cn(
                                "mt-0.5 h-3.5 w-3.5 shrink-0",
                                isPassed
                                    ? "text-emerald-500"
                                    : isFailed
                                        ? "text-red-500"
                                        : "text-[#c4c4c4]",
                            )}
                        />
                        <div className="min-w-0">
                            <span>{v.description}</span>
                            {result?.message && (
                                <p className="mt-0.5 text-[11px] opacity-80">{result.message}</p>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function QuizSection({ quiz }: { quiz?: GuideQuiz }) {
    const [selected, setSelected] = useState<string | null>(null)
    if (!quiz) return null

    return (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                Quiz
            </h4>
            <p className="mt-2 text-[13px] text-[#3a3a3a]">{quiz.question}</p>

            {quiz.type === "multiple_choice" && quiz.options && (
                <div className="mt-3 space-y-1.5">
                    {quiz.options.map((opt, i) => (
                        <label
                            key={i}
                            className={cn(
                                "flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] cursor-pointer transition-colors",
                                selected === opt
                                    ? "border-[#1ca9b1] bg-[#1ca9b1]/5 text-[#1ca9b1]"
                                    : "border-[#e8e8e8] hover:bg-[#f9f9f9]",
                            )}
                        >
                            <input
                                type="radio"
                                name="quiz-answer"
                                className="accent-[#1ca9b1]"
                                checked={selected === opt}
                                onChange={() => setSelected(opt)}
                            />
                            {opt}
                        </label>
                    ))}
                </div>
            )}

            {quiz.type === "short_answer" && (
                <input
                    type="text"
                    placeholder="Type your answer…"
                    className="mt-3 w-full rounded-lg border border-[#e8e8e8] bg-[#f9f9f9] px-3 py-2 text-[12px] text-[#3a3a3a] placeholder:text-[#c4c4c4] focus:border-[#1ca9b1] focus:outline-none"
                />
            )}

            {quiz.type === "flag" && (
                <div className="mt-3">
                    <input
                        type="text"
                        placeholder={quiz.flag_format_hint || "Submit flag…"}
                        className="w-full rounded-lg border border-[#e8e8e8] bg-[#f9f9f9] px-3 py-2 text-[12px] font-mono text-[#3a3a3a] placeholder:text-[#c4c4c4] focus:border-[#1ca9b1] focus:outline-none"
                    />
                </div>
            )}
        </div>
    )
}

/* ── Step Content Aggregator ────────────────────────────────────────────── */

function StepContent({
    step,
    stepState,
    onRunCommand,
}: {
    step: LabGuideStep
    stepState?: StepExecutionState
    onRunCommand?: (stepId: string, commandIndex: number) => void
}) {
    return (
        <div className="space-y-5">
            {/* Title & Description */}
            <div>
                <h3 className="text-[16px] font-semibold text-[#3a3a3a]">{step.title}</h3>
                {step.description && (
                    <p className="mt-1 text-[13px] text-[#727373] leading-relaxed">
                        {step.description}
                    </p>
                )}
            </div>

            <TheorySection content={step.theory_content} />

            <TasksSection
                tasks={step.tasks}
                completedIndices={stepState?.tasks_completed ?? []}
            />

            <CommandsSection
                stepId={step.id}
                commands={step.commands}
                onRunCommand={onRunCommand}
                commandResults={stepState?.command_results ?? []}
            />

            <HintsSection
                hints={step.hints}
                revealedIndices={stepState?.hints_revealed ?? []}
            />

            <ValidationsSection
                validations={step.validations}
                validationResults={stepState?.validation_results ?? []}
            />

            <QuizSection quiz={step.quiz} />
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMPTY / LOADING / ERROR STATES
   ═══════════════════════════════════════════════════════════════════════════ */

function LoadingState() {
    return (
        <div className="flex h-full items-center justify-center bg-[#f9f9f9]">
            <div className="flex flex-col items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#e8e8e8] border-t-[#1ca9b1]" />
                <p className="text-[13px] text-[#727373]">Loading guide…</p>
            </div>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="flex h-full items-center justify-center bg-[#f9f9f9] p-6">
            <div className="text-center">
                <BookOpen className="h-10 w-10 text-[#c4c4c4] mx-auto mb-3" />
                <p className="text-[13px] text-[#727373]">No guide steps available.</p>
            </div>
        </div>
    )
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="flex h-full items-center justify-center bg-[#f9f9f9] p-6">
            <div className="flex max-w-sm flex-col items-center gap-3 text-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="text-[13px] font-medium text-red-800">Guide Error</p>
                <p className="text-[12px] text-red-600">{message}</p>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════════════════ */

export function LabGuidePanel({
    steps,
    stepStates = {},
    currentStepIndex,
    onStepChange,
    onRunCommand,
    isLoading,
    error,
}: LabGuidePanelProps) {
    const currentStep = useMemo(() => steps[currentStepIndex], [steps, currentStepIndex])
    const currentStepState = useMemo(
        () => (currentStep ? stepStates[currentStep.id] : undefined),
        [currentStep, stepStates],
    )

    // ── Render guards ───────────────────────────────────────────────────
    if (isLoading) return <LoadingState />
    if (error) return <ErrorState message={error} />
    if (steps.length === 0) return <EmptyState />

    return (
        <div className="flex h-full flex-col bg-[#f9f9f9]">
            <GuideHeader currentStepIndex={currentStepIndex} totalSteps={steps.length} />
            <StepNavBar
                steps={steps}
                stepStates={stepStates}
                currentStepIndex={currentStepIndex}
                onStepChange={onStepChange}
            />
            <div className="flex-1 overflow-y-auto p-5">
                {currentStep && (
                    <StepContent
                        step={currentStep}
                        stepState={currentStepState}
                        onRunCommand={onRunCommand}
                    />
                )}
            </div>
        </div>
    )
}