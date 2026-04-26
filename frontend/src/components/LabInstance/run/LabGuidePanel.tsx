// src/components/LabInstance/run/LabGuidePanel.tsx
import { useState } from "react"
import { BookOpen, ChevronDown, ChevronRight, Play, CheckCircle2, Circle, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LabGuideStep, StepExecutionState } from "@/types/LabGuide"

interface LabGuidePanelProps {
    steps: LabGuideStep[]
    stepStates: StepExecutionState[]
    currentStepIndex: number
    onStepChange: (index: number) => void
    onRunCommand?: (command: string, label?: string) => void
    isLoading?: boolean
}

export function LabGuidePanel({
    steps,
    stepStates,
    currentStepIndex,
    onStepChange,
    onRunCommand,
    isLoading,
}: LabGuidePanelProps) {
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([currentStepIndex]))

    const toggleStep = (index: number) => {
        setExpandedSteps((prev) => {
            const next = new Set(prev)
            if (next.has(index)) {
                next.delete(index)
            } else {
                next.add(index)
            }
            return next
        })
    }

    const getStepStatus = (index: number): StepExecutionState["status"] | "locked" => {
        const state = stepStates[index]
        return state?.status || (index === 0 ? "available" : "locked")
    }

    const currentStep = steps[currentStepIndex]
    const currentState = stepStates[currentStepIndex]

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f9f9f9]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#e8e8e8] border-t-[#1ca9b1]" />
                    <p className="text-[13px] text-[#727373]">Loading guide...</p>
                </div>
            </div>
        )
    }

    if (steps.length === 0) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f9f9f9] p-6">
                <div className="text-center">
                    <BookOpen className="h-10 w-10 text-[#c4c4c4] mx-auto mb-3" />
                    <p className="text-[13px] text-[#727373]">No guide steps available.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col bg-[#f9f9f9]">
            {/* Guide Header */}
            <div className="shrink-0 border-b border-[#e8e8e8] bg-white px-5 py-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-[14px] font-semibold text-[#3a3a3a]">Lab Guide</h2>
                    <span className="text-[11px] text-[#727373]">
                        Step {currentStepIndex + 1} of {steps.length}
                    </span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1 w-full rounded-full bg-[#e8e8e8] overflow-hidden">
                    <div
                        className="h-full rounded-full bg-[#1ca9b1] transition-all duration-300"
                        style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Steps List (collapsible) */}
            <div className="shrink-0 border-b border-[#e8e8e8] bg-white">
                <div className="flex gap-1 overflow-x-auto px-3 py-2 scrollbar-hide">
                    {steps.map((step, index) => {
                        const status = getStepStatus(index)
                        const isCurrent = index === currentStepIndex
                        return (
                            <button
                                key={step.id}
                                onClick={() => onStepChange(index)}
                                className={cn(
                                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition",
                                    isCurrent
                                        ? "bg-[#1ca9b1]/10 text-[#1ca9b1] ring-1 ring-[#1ca9b1]"
                                        : status === "completed"
                                            ? "bg-emerald-50 text-emerald-600"
                                            : status === "locked"
                                                ? "bg-[#f2f2f2] text-[#c4c4c4] cursor-not-allowed"
                                                : "bg-[#f9f9f9] text-[#727373] hover:bg-[#f2f2f2]"
                                )}
                                disabled={status === "locked"}
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

            {/* Current Step Content */}
            <div className="flex-1 overflow-y-auto p-5">
                {currentStep && (
                    <div className="space-y-4">
                        {/* Step Title */}
                        <div>
                            <h3 className="text-[16px] font-semibold text-[#3a3a3a]">
                                {currentStep.title}
                            </h3>
                            {currentStep.description && (
                                <p className="mt-1 text-[13px] text-[#727373] leading-relaxed">
                                    {currentStep.description}
                                </p>
                            )}
                        </div>

                        {/* Theory Content */}
                        {currentStep.theory_content && (
                            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
                                <div className="prose prose-sm max-w-none text-[13px] text-[#3a3a3a]">
                                    {currentStep.theory_content}
                                </div>
                            </div>
                        )}

                        {/* Tasks */}
                        {currentStep.tasks.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                                    Tasks
                                </h4>
                                {currentStep.tasks.map((task, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex items-start gap-2 rounded-lg border p-3 text-[13px]",
                                            currentState?.tasks_completed?.includes(i)
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                : "border-[#e8e8e8] bg-white text-[#3a3a3a]"
                                        )}
                                    >
                                        <CheckCircle2 className={cn(
                                            "mt-0.5 h-4 w-4 shrink-0",
                                            currentState?.tasks_completed?.includes(i)
                                                ? "text-emerald-500"
                                                : "text-[#c4c4c4]"
                                        )} />
                                        <span>{task.description}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Commands */}
                        {currentStep.commands.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                                    Commands
                                </h4>
                                {currentStep.commands.map((cmd, i) => (
                                    <div
                                        key={i}
                                        className="rounded-lg border border-[#e8e8e8] bg-[#1a1a1a] p-3"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-[12px] font-medium text-[#1ca9b1]">
                                                {cmd.label}
                                            </span>
                                            {onRunCommand && (
                                                <button
                                                    onClick={() => onRunCommand(cmd.command, cmd.label)}
                                                    className="flex items-center gap-1 rounded bg-[#1ca9b1] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#17959c] transition"
                                                >
                                                    <Play className="h-3 w-3" />
                                                    Run
                                                </button>
                                            )}
                                        </div>
                                        <code className="mt-2 block text-[12px] font-mono text-[#a0a0a0] break-all">
                                            {cmd.command}
                                        </code>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Hints */}
                        {currentStep.hints.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                                    Hints
                                </h4>
                                {currentStep.hints.map((hint, i) => (
                                    <details
                                        key={i}
                                        className="rounded-lg border border-amber-200 bg-amber-50"
                                    >
                                        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[12px] font-medium text-amber-700">
                                            <ChevronRight className="h-3 w-3 shrink-0 details-open:rotate-90" />
                                            Hint Level {hint.level}
                                        </summary>
                                        <p className="px-3 pb-3 text-[12px] text-amber-800">
                                            {hint.content}
                                        </p>
                                    </details>
                                ))}
                            </div>
                        )}

                        {/* Validations */}
                        {currentStep.validations.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                                    Validation Checks
                                </h4>
                                {currentStep.validations.map((v, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex items-start gap-2 rounded-lg border p-3 text-[12px]",
                                            currentState?.validation_results?.[i]?.status === "passed"
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : "border-[#e8e8e8] bg-white text-[#727373]"
                                        )}
                                    >
                                        <CheckCircle2 className={cn(
                                            "mt-0.5 h-3.5 w-3.5 shrink-0",
                                            currentState?.validation_results?.[i]?.status === "passed"
                                                ? "text-emerald-500"
                                                : "text-[#c4c4c4]"
                                        )} />
                                        <span>{v.description}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quiz */}
                        {currentStep.quiz && (
                            <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
                                <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                                    Quiz
                                </h4>
                                <p className="mt-2 text-[13px] text-[#3a3a3a]">
                                    {currentStep.quiz.question}
                                </p>
                                {currentStep.quiz.type === "multiple_choice" && currentStep.quiz.options && (
                                    <div className="mt-3 space-y-1.5">
                                        {currentStep.quiz.options.map((opt, i) => (
                                            <label
                                                key={i}
                                                className="flex items-center gap-2 rounded-lg border border-[#e8e8e8] px-3 py-2 text-[12px] cursor-pointer hover:bg-[#f9f9f9]"
                                            >
                                                <input
                                                    type="radio"
                                                    name="quiz-answer"
                                                    className="accent-[#1ca9b1]"
                                                />
                                                {opt}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}