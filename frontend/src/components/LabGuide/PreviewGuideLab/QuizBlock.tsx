// src/components/LabGuide/PreviewGuideLab/QuizBlock.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import { HelpCircle, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import type { GuideQuiz } from "@/types/LabGuide"

interface QuizBlockProps {
    quiz: GuideQuiz
    answer: string
    submitted: boolean
    correct: boolean
    onAnswerChange: (answer: string) => void
    onSubmit: () => void
    onReset: () => void
}

export function QuizBlock({ quiz, answer, submitted, correct, onAnswerChange, onSubmit, onReset }: QuizBlockProps) {
    return (
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
                        {quiz.question}
                    </p>
                    {quiz.points ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium shrink-0">
                            {quiz.points} pts
                        </span>
                    ) : null}
                </div>

                {quiz.description && (
                    <p className="text-[12px] text-[#727373]">{quiz.description}</p>
                )}

                {quiz.type === "multiple_choice" && quiz.options && (
                    <div className="space-y-1.5">
                        {quiz.options.map((opt) => (
                            <label
                                key={opt}
                                className={cn(
                                    "flex items-center gap-2 rounded-md p-2.5 border cursor-pointer transition-colors",
                                    answer === opt
                                        ? "border-[#1ca9b1] bg-[#e6f7f8]"
                                        : "border-[#e8e8e8] hover:bg-[#f9f9f9]"
                                )}
                            >
                                <div
                                    className={cn(
                                        "h-4 w-4 rounded-full border shrink-0 flex items-center justify-center transition-colors",
                                        answer === opt
                                            ? "border-[#1ca9b1] bg-[#1ca9b1]"
                                            : "border-[#c4c4c4]"
                                    )}
                                >
                                    {answer === opt && (
                                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                    )}
                                </div>
                                <span className="text-[13px] text-[#3a3a3a]">{opt}</span>
                            </label>
                        ))}
                    </div>
                )}

                {(quiz.type === "short_answer" || quiz.type === "flag") && (
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={answer}
                            onChange={(e) => onAnswerChange(e.target.value)}
                            placeholder={
                                quiz.type === "flag"
                                    ? quiz.flag_format_hint || "Enter flag..."
                                    : "Type your answer..."
                            }
                            className="w-full px-3 py-2.5 rounded-lg border border-[#e8e8e8] text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4] focus:outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1] transition-colors"
                        />
                        {quiz.type === "flag" && quiz.flag_format_hint && (
                            <p className="text-[11px] text-[#727373]">
                                Format hint: {quiz.flag_format_hint}
                            </p>
                        )}
                    </div>
                )}

                {!submitted ? (
                    <button
                        onClick={onSubmit}
                        disabled={!answer.trim()}
                        className={cn(
                            "w-full py-2.5 rounded-lg text-[13px] font-medium transition-colors",
                            answer.trim()
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
                            correct
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                        )}
                    >
                        {correct ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                        ) : (
                            <AlertCircle className="h-4 w-4 shrink-0" />
                        )}
                        <span className="text-[13px] font-medium">
                            {correct
                                ? "Correct!"
                                : "Incorrect. Review the material and try again."}
                        </span>
                    </div>
                )}

                {submitted && !correct && (
                    <button
                        onClick={onReset}
                        className="w-full py-2.5 rounded-lg border border-[#e8e8e8] text-[13px] font-medium text-[#3a3a3a] hover:bg-[#f9f9f9] transition-colors"
                    >
                        Try Again
                    </button>
                )}
            </div>
        </div>
    )
}