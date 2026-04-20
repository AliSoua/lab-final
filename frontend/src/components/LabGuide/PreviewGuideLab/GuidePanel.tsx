// src/components/LabGuide/PreviewGuideLab/GuidePanel.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
    ChevronRight,
    ChevronLeft,
    Play,
    Copy,
    CheckCircle2,
    Circle,
    Lightbulb,
    Shield,
    HelpCircle,
    Terminal,
    BookOpen,
    AlertCircle,
} from "lucide-react"
import type { LabGuide, GuideCommand, GuideQuiz } from "@/types/LabGuide"
import { toast } from "sonner"

interface GuidePanelProps {
    guide: LabGuide
    currentStepIndex: number
    onStepChange: (index: number) => void
    onRunCommand: (command: string, label?: string) => void
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function CommandBlock({
    command,
    onRun,
    onCopy,
}: {
    command: GuideCommand
    onRun: () => void
    onCopy: () => void
}) {
    return (
        <div className="bg-white border border-[#e8e8e8] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#e8e8e8] bg-[#fafafa]">
                <div className="flex items-center gap-2 min-w-0">
                    <Terminal className="h-3.5 w-3.5 text-[#1ca9b1] shrink-0" />
                    {command.label ? (
                        <span className="text-[11px] font-medium text-[#3a3a3a] truncate">
                            {command.label}
                        </span>
                    ) : (
                        <span className="text-[11px] text-[#c4c4c4] italic">Unnamed command</span>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={onCopy}
                        className="p-1.5 rounded-md hover:bg-[#e8e8e8] text-[#727373] transition-colors"
                        title="Copy command"
                    >
                        <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={onRun}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#1ca9b1] text-white text-[11px] font-medium hover:bg-[#158a91] transition-colors"
                    >
                        <Play className="h-3 w-3" />
                        Run
                    </button>
                </div>
            </div>
            <div className="px-3 py-2.5 bg-[#1a1a1a] overflow-x-auto">
                <code className="text-[12px] font-mono text-green-400 whitespace-pre-wrap break-all">
                    {command.command}
                </code>
            </div>
            {command.description && (
                <div className="px-3 py-2 border-t border-[#e8e8e8]">
                    <p className="text-[11px] text-[#727373]">{command.description}</p>
                </div>
            )}
            {(command.sudo || command.working_directory || command.timeout) && (
                <div className="px-3 py-1.5 border-t border-[#e8e8e8] flex items-center gap-3 flex-wrap">
                    {command.sudo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-medium">
                            sudo
                        </span>
                    )}
                    {command.working_directory && (
                        <span className="text-[10px] text-[#727373] font-mono truncate">
                            cd {command.working_directory}
                        </span>
                    )}
                    {command.timeout && (
                        <span className="text-[10px] text-[#727373]">
                            timeout: {command.timeout}s
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}

/* ── Main Component ─────────────────────────────────────────────────────── */

export function GuidePanel({ guide, currentStepIndex, onStepChange, onRunCommand }: GuidePanelProps) {
    const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set())
    const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())
    const [quizAnswer, setQuizAnswer] = useState("")
    const [quizSubmitted, setQuizSubmitted] = useState(false)
    const [quizCorrect, setQuizCorrect] = useState(false)

    const step = guide.steps[currentStepIndex]
    const isFirst = currentStepIndex === 0
    const isLast = currentStepIndex === guide.steps.length - 1
    const progress = ((currentStepIndex + 1) / guide.steps.length) * 100

    const toggleHint = (level: number) => {
        setRevealedHints((prev) => {
            const next = new Set(prev)
            if (next.has(level)) next.delete(level)
            else next.add(level)
            return next
        })
    }

    const toggleTask = (taskIndex: number) => {
        const key = `${currentStepIndex}-${taskIndex}`
        setCompletedTasks((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    const copyCommand = (cmd: string) => {
        navigator.clipboard.writeText(cmd)
        toast.success("Copied to clipboard")
    }

    const submitQuiz = (quiz: GuideQuiz) => {
        const normalizedAnswer = quiz.case_sensitive
            ? quizAnswer.trim()
            : quizAnswer.trim().toLowerCase()
        const normalizedCorrect = quiz.case_sensitive
            ? quiz.correct_answer.trim()
            : quiz.correct_answer.trim().toLowerCase()
        const isCorrect = normalizedAnswer === normalizedCorrect
        setQuizCorrect(isCorrect)
        setQuizSubmitted(true)
        if (isCorrect) toast.success("Correct!")
        else toast.error("Incorrect, try again")
    }

    const resetQuiz = () => {
        setQuizAnswer("")
        setQuizSubmitted(false)
        setQuizCorrect(false)
    }

    const nextStep = () => {
        if (!isLast) {
            resetQuiz()
            onStepChange(currentStepIndex + 1)
        }
    }

    const prevStep = () => {
        if (!isFirst) {
            resetQuiz()
            onStepChange(currentStepIndex - 1)
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Progress bar */}
            <div className="h-1 bg-[#e8e8e8] shrink-0">
                <div
                    className="h-full bg-[#1ca9b1] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Step header */}
            <div className="px-5 py-4 border-b border-[#e8e8e8] bg-white shrink-0">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-[#1ca9b1] uppercase tracking-wider">
                        Step {currentStepIndex + 1} of {guide.steps.length}
                    </span>
                    {step.points > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e6f7f8] text-[#1ca9b1] font-medium">
                            {step.points} pts
                        </span>
                    )}
                </div>
                <h2 className="text-[15px] font-semibold text-[#3a3a3a]">{step.title}</h2>
                {step.description && (
                    <p className="text-xs text-[#727373] mt-1">{step.description}</p>
                )}
                {step.title && (
                    <div className="flex items-center gap-1.5 mt-2">
                        <Terminal className="h-3 w-3 text-[#c4c4c4]" />
                        <span className="text-[11px] text-[#727373] font-mono">
                            Target: {step.title}
                        </span>
                    </div>
                )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Theory */}
                {step.theory_content && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="h-4 w-4 text-[#1ca9b1]" />
                            <h3 className="text-xs font-semibold text-[#3a3a3a] uppercase tracking-wider">
                                Theory
                            </h3>
                        </div>
                        <div className="bg-white border border-[#e8e8e8] rounded-lg p-4">
                            <p className="text-[13px] text-[#3a3a3a] leading-relaxed whitespace-pre-wrap">
                                {step.theory_content}
                            </p>
                        </div>
                    </div>
                )}

                {/* Commands */}
                {step.commands.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <Terminal className="h-4 w-4 text-[#1ca9b1]" />
                            <h3 className="text-xs font-semibold text-[#3a3a3a] uppercase tracking-wider">
                                Commands
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {step.commands.map((cmd, i) => (
                                <CommandBlock
                                    key={i}
                                    command={cmd}
                                    onRun={() => onRunCommand(cmd.command, cmd.label)}
                                    onCopy={() => copyCommand(cmd.command)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Tasks */}
                {step.tasks.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-[#1ca9b1]" />
                            <h3 className="text-xs font-semibold text-[#3a3a3a] uppercase tracking-wider">
                                Objectives
                            </h3>
                        </div>
                        <div className="space-y-1.5">
                            {step.tasks.map((task, i) => {
                                const key = `${currentStepIndex}-${i}`
                                const isDone = completedTasks.has(key)
                                return (
                                    <button
                                        key={i}
                                        onClick={() => toggleTask(i)}
                                        className={cn(
                                            "w-full flex items-start gap-2.5 rounded-lg p-3 text-left transition-colors",
                                            isDone
                                                ? "bg-green-50 border border-green-200"
                                                : "bg-white border border-[#e8e8e8] hover:bg-[#f9f9f9]"
                                        )}
                                    >
                                        {isDone ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                        ) : (
                                            <Circle className="h-4 w-4 text-[#c4c4c4] shrink-0 mt-0.5" />
                                        )}
                                        <div className="min-w-0">
                                            <p className={cn(
                                                "text-[13px]",
                                                isDone ? "text-green-700 line-through" : "text-[#3a3a3a]"
                                            )}>
                                                {task.description}
                                            </p>
                                            {task.is_required && !isDone && (
                                                <span className="text-[10px] text-amber-600 font-medium">
                                                    Required
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Hints */}
                {step.hints.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                            <h3 className="text-xs font-semibold text-[#3a3a3a] uppercase tracking-wider">
                                Hints
                            </h3>
                        </div>
                        <div className="space-y-1.5">
                            {step.hints.map((hint) => {
                                const isRevealed = revealedHints.has(hint.level)
                                return (
                                    <div
                                        key={hint.level}
                                        className={cn(
                                            "rounded-lg border overflow-hidden transition-all",
                                            isRevealed
                                                ? "bg-amber-50 border-amber-200"
                                                : "bg-white border-[#e8e8e8]"
                                        )}
                                    >
                                        <button
                                            onClick={() => toggleHint(hint.level)}
                                            className="w-full flex items-center justify-between px-3 py-2.5"
                                        >
                                            <span className={cn(
                                                "text-xs font-medium",
                                                isRevealed ? "text-amber-700" : "text-[#727373]"
                                            )}>
                                                Hint Level {hint.level}
                                            </span>
                                            <span className={cn(
                                                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                                isRevealed
                                                    ? "bg-amber-200 text-amber-800"
                                                    : "bg-[#f5f5f5] text-[#727373]"
                                            )}>
                                                {isRevealed ? "Shown" : "Hidden"}
                                            </span>
                                        </button>
                                        {isRevealed && (
                                            <div className="px-3 pb-3">
                                                <p className="text-[12px] text-amber-800 leading-relaxed">
                                                    {hint.content}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Validations */}
                {step.validations.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <Shield className="h-4 w-4 text-green-600" />
                            <h3 className="text-xs font-semibold text-[#3a3a3a] uppercase tracking-wider">
                                Validation Checks
                            </h3>
                        </div>
                        <div className="space-y-1.5">
                            {step.validations.map((val, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex items-center gap-2.5 rounded-lg border p-3",
                                        val.is_blocking
                                            ? "bg-red-50 border-red-200"
                                            : "bg-white border-[#e8e8e8]"
                                    )}
                                >
                                    <Shield className={cn(
                                        "h-4 w-4 shrink-0",
                                        val.is_blocking ? "text-red-500" : "text-green-500"
                                    )} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] text-[#3a3a3a]">{val.description}</p>
                                        <p className="text-[10px] text-[#727373] mt-0.5">
                                            {val.type.replace("_", " ")}
                                            {val.is_blocking && " • Blocking"}
                                        </p>
                                    </div>
                                    {(val.points ?? 0) > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">
                                            +{val.points}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quiz */}
                {step.quiz && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <HelpCircle className="h-4 w-4 text-purple-500" />
                            <h3 className="text-xs font-semibold text-[#3a3a3a] uppercase tracking-wider">
                                Quiz
                            </h3>
                        </div>
                        <div className="bg-white border border-[#e8e8e8] rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <p className="text-[13px] text-[#3a3a3a] font-medium">
                                    {step.quiz.question}
                                </p>
                                {step.quiz.points ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium shrink-0">
                                        {step.quiz.points} pts
                                    </span>
                                ) : null}
                            </div>

                            {step.quiz.description && (
                                <p className="text-[12px] text-[#727373]">{step.quiz.description}</p>
                            )}

                            {step.quiz.type === "multiple_choice" && step.quiz.options && (
                                <div className="space-y-1.5">
                                    {step.quiz.options.map((opt) => (
                                        <label
                                            key={opt}
                                            className={cn(
                                                "flex items-center gap-2 rounded-md p-2.5 border cursor-pointer transition-colors",
                                                quizAnswer === opt
                                                    ? "border-[#1ca9b1] bg-[#e6f7f8]"
                                                    : "border-[#e8e8e8] hover:bg-[#f9f9f9]"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "h-4 w-4 rounded-full border shrink-0 flex items-center justify-center transition-colors",
                                                    quizAnswer === opt
                                                        ? "border-[#1ca9b1] bg-[#1ca9b1]"
                                                        : "border-[#c4c4c4]"
                                                )}
                                            >
                                                {quizAnswer === opt && (
                                                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                                )}
                                            </div>
                                            <span className="text-[13px] text-[#3a3a3a]">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {(step.quiz.type === "short_answer" || step.quiz.type === "flag") && (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={quizAnswer}
                                        onChange={(e) => setQuizAnswer(e.target.value)}
                                        placeholder={
                                            step.quiz.type === "flag"
                                                ? step.quiz.flag_format_hint || "Enter flag..."
                                                : "Type your answer..."
                                        }
                                        className="w-full px-3 py-2.5 rounded-lg border border-[#e8e8e8] text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4] focus:outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1] transition-colors"
                                    />
                                    {step.quiz.type === "flag" && step.quiz.flag_format_hint && (
                                        <p className="text-[11px] text-[#727373]">
                                            Format hint: {step.quiz.flag_format_hint}
                                        </p>
                                    )}
                                </div>
                            )}

                            {!quizSubmitted ? (
                                <button
                                    onClick={() => submitQuiz(step.quiz!)}
                                    disabled={!quizAnswer.trim()}
                                    className={cn(
                                        "w-full py-2.5 rounded-lg text-[13px] font-medium transition-colors",
                                        quizAnswer.trim()
                                            ? "bg-[#1ca9b1] text-white hover:bg-[#158a91]"
                                            : "bg-[#e8e8e8] text-[#727373] cursor-not-allowed"
                                    )}
                                >
                                    Submit Answer
                                </button>
                            ) : (
                                <div
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg p-3",
                                        quizCorrect
                                            ? "bg-green-50 text-green-700"
                                            : "bg-red-50 text-red-700"
                                    )}
                                >
                                    {quizCorrect ? (
                                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                    )}
                                    <span className="text-[13px] font-medium">
                                        {quizCorrect
                                            ? "Correct!"
                                            : "Incorrect. Review the material and try again."}
                                    </span>
                                </div>
                            )}

                            {quizSubmitted && !quizCorrect && (
                                <button
                                    onClick={resetQuiz}
                                    className="w-full py-2.5 rounded-lg border border-[#e8e8e8] text-[13px] font-medium text-[#3a3a3a] hover:bg-[#f9f9f9] transition-colors"
                                >
                                    Try Again
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Footer */}
            <div className="px-5 py-3 border-t border-[#e8e8e8] bg-white shrink-0 flex items-center justify-between">
                <button
                    onClick={prevStep}
                    disabled={isFirst}
                    className={cn(
                        "flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                        isFirst
                            ? "text-[#c4c4c4] cursor-not-allowed"
                            : "text-[#3a3a3a] hover:bg-[#f5f5f5]"
                    )}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </button>

                <div className="flex items-center gap-1.5">
                    {guide.steps.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => onStepChange(idx)}
                            className={cn(
                                "w-2 h-2 rounded-full transition-colors",
                                idx === currentStepIndex
                                    ? "bg-[#1ca9b1]"
                                    : "bg-[#e8e8e8] hover:bg-[#c4c4c4]"
                            )}
                        />
                    ))}
                </div>

                <button
                    onClick={nextStep}
                    disabled={isLast}
                    className={cn(
                        "flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                        isLast
                            ? "text-[#c4c4c4] cursor-not-allowed"
                            : "bg-[#1ca9b1] text-white hover:bg-[#158a91]"
                    )}
                >
                    Next
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}