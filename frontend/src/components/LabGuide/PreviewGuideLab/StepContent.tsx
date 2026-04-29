// src/components/LabGuide/PreviewGuideLab/StepContent.tsx
import { cn } from "@/lib/utils"
import {
    BookOpen,
    Terminal,
    CheckCircle2,
    Lightbulb,
    Shield,
    HelpCircle,
} from "lucide-react"
import { toast } from "sonner"
import type { LabGuideStep, GuideCommand, GuideQuiz } from "@/types/LabGuide"
import { CommandBlock } from "./CommandBlock"
import { QuizBlock } from "./QuizBlock"
import { TheoryContentRenderer } from "@/components/LabGuide/shared/TheoryContentRenderer"

interface StepContentProps {
    step: LabGuideStep
    currentStepIndex: number
    revealedHints: Set<number>
    completedTasks: Set<string>
    quizAnswer: string
    quizSubmitted: boolean
    quizCorrect: boolean
    onToggleHint: (level: number) => void
    onToggleTask: (taskIndex: number) => void
    onQuizAnswerChange: (answer: string) => void
    onQuizSubmit: (correct: boolean) => void
    onQuizReset: () => void
    onRunCommand: (command: string, label?: string) => void
}

export function StepContent({
    step,
    currentStepIndex,
    revealedHints,
    completedTasks,
    quizAnswer,
    quizSubmitted,
    quizCorrect,
    onToggleHint,
    onToggleTask,
    onQuizAnswerChange,
    onQuizSubmit,
    onQuizReset,
    onRunCommand,
}: StepContentProps) {
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
        onQuizSubmit(normalizedAnswer === normalizedCorrect)
    }

    return (
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
                        <TheoryContentRenderer content={step.theory_content} />
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
                                    onClick={() => onToggleTask(i)}
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
                                        <div className="h-4 w-4 rounded-full border-2 border-[#c4c4c4] shrink-0 mt-0.5" />
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
                                        onClick={() => onToggleHint(hint.level)}
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
                <QuizBlock
                    quiz={step.quiz}
                    answer={quizAnswer}
                    submitted={quizSubmitted}
                    correct={quizCorrect}
                    onAnswerChange={onQuizAnswerChange}
                    onSubmit={() => submitQuiz(step.quiz!)}
                    onReset={onQuizReset}
                />
            )}
        </div>
    )
}