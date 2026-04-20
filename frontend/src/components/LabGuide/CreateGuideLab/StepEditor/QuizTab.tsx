// src/components/LabGuide/CreateGuideLab/StepEditor/QuizTab.tsx
import { cn } from "@/lib/utils"
import { HelpCircle, Plus, X } from "lucide-react"
import type { LabGuideStepCreateRequest, GuideQuiz } from "@/types/LabGuide"

interface QuizTabProps {
    data: LabGuideStepCreateRequest
    onChange: <K extends keyof LabGuideStepCreateRequest>(key: K, value: LabGuideStepCreateRequest[K]) => void
}

export function QuizTab({ data, onChange }: QuizTabProps) {
    const quiz = data.quiz

    const toggleQuiz = (enable: boolean) => {
        if (!enable) {
            onChange("quiz", undefined)
        } else {
            const q: GuideQuiz = {
                question: "",
                type: "short_answer",
                correct_answer: "",
                points: 10,
                case_sensitive: false,
            }
            onChange("quiz", q)
        }
    }

    const updateQuiz = (patch: Partial<GuideQuiz>) => {
        if (!quiz) return
        onChange("quiz", { ...quiz, ...patch })
    }

    return (
        <div className="p-6 space-y-6">
            {/* Toggle */}
            <div className="flex items-center justify-between bg-[#fafafa] border border-[#e8e8e8] rounded-xl px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
                        <HelpCircle className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-semibold text-[#3a3a3a]">Step Quiz</h3>
                        <p className="text-[11px] text-[#727373]">Test learner comprehension with a question</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!quiz}
                        onChange={(e) => toggleQuiz(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className={cn(
                        "w-11 h-6 rounded-full peer transition-colors",
                        quiz ? "bg-[#1ca9b1]" : "bg-[#e8e8e8]"
                    )} />
                    <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5" />
                </label>
            </div>

            {quiz && (
                <div className="space-y-5 border border-[#e8e8e8] rounded-xl p-5 bg-white">
                    {/* Question */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                            Question *
                        </label>
                        <input
                            type="text"
                            value={quiz.question}
                            onChange={(e) => updateQuiz({ question: e.target.value })}
                            placeholder="e.g., What port does SSH run on?"
                            className={cn(
                                "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all"
                            )}
                        />
                    </div>

                    {/* Type */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                                Quiz Type
                            </label>
                            <select
                                value={quiz.type}
                                onChange={(e) => updateQuiz({ type: e.target.value as GuideQuiz["type"] })}
                                className={cn(
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                    "text-[13px] text-[#3a3a3a]",
                                    "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all appearance-none"
                                )}
                            >
                                <option value="short_answer">Short Answer</option>
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="flag">Flag Format</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                                Points
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={quiz.points}
                                onChange={(e) => updateQuiz({ points: parseInt(e.target.value) || 0 })}
                                className={cn(
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                    "text-[13px] text-[#3a3a3a]",
                                    "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all"
                                )}
                            />
                        </div>

                        <div className="flex items-end pb-2">
                            <label className="flex items-center gap-2 text-sm text-[#727373] cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={quiz.case_sensitive || false}
                                    onChange={(e) => updateQuiz({ case_sensitive: e.target.checked })}
                                    className="rounded border-[#d4d4d4] text-[#1ca9b1] focus:ring-[#1ca9b1] h-4 w-4"
                                />
                                Case Sensitive
                            </label>
                        </div>
                    </div>

                    {/* Multiple Choice Options */}
                    {quiz.type === "multiple_choice" && (
                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                                Options
                            </label>
                            <div className="space-y-2">
                                {(quiz.options || []).map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full border border-[#d4d4d4] flex items-center justify-center shrink-0">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                opt === quiz.correct_answer ? "bg-[#1ca9b1]" : "bg-transparent"
                                            )} />
                                        </div>
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => {
                                                const next = [...(quiz.options || [])]
                                                next[i] = e.target.value
                                                updateQuiz({ options: next })
                                            }}
                                            placeholder={`Option ${i + 1}`}
                                            className={cn(
                                                "flex-1 rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5",
                                                "text-[13px] text-[#3a3a3a]",
                                                "outline-none focus:border-[#1ca9b1]"
                                            )}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = (quiz.options || []).filter((_, idx) => idx !== i)
                                                updateQuiz({ options: next })
                                            }}
                                            className="p-1 text-[#c4c4c4] hover:text-red-500 transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => updateQuiz({ options: [...(quiz.options || []), ""] })}
                                    className="flex items-center gap-1.5 text-xs font-medium text-[#1ca9b1] hover:text-[#17959c] mt-1"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Option
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Correct Answer */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                            Correct Answer *
                        </label>
                        <input
                            type="text"
                            value={quiz.correct_answer}
                            onChange={(e) => updateQuiz({ correct_answer: e.target.value })}
                            placeholder={quiz.type === "flag" ? "FLAG{...}" : "22"}
                            className={cn(
                                "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all"
                            )}
                        />
                    </div>

                    {quiz.type === "flag" && (
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                                Flag Format Hint
                            </label>
                            <input
                                type="text"
                                value={quiz.flag_format_hint || ""}
                                onChange={(e) => updateQuiz({ flag_format_hint: e.target.value })}
                                placeholder="e.g., FLAG{...}"
                                className={cn(
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                                    "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                    "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all"
                                )}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
