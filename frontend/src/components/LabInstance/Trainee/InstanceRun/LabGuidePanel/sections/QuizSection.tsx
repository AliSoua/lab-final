// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/sections/QuizSection.tsx

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { GuideQuiz } from "@/types/LabGuide"

interface QuizSectionProps {
    quiz?: GuideQuiz
}

export function QuizSection({ quiz }: QuizSectionProps) {
    const [selected, setSelected] = useState<string | null>(null)
    const [shortAnswer, setShortAnswer] = useState("")
    const [flag, setFlag] = useState("")

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
                    value={shortAnswer}
                    onChange={(e) => setShortAnswer(e.target.value)}
                    placeholder="Type your answer…"
                    className="mt-3 w-full rounded-lg border border-[#e8e8e8] bg-[#f9f9f9] px-3 py-2 text-[12px] text-[#3a3a3a] placeholder:text-[#c4c4c4] focus:border-[#1ca9b1] focus:outline-none"
                />
            )}

            {quiz.type === "flag" && (
                <div className="mt-3">
                    <input
                        type="text"
                        value={flag}
                        onChange={(e) => setFlag(e.target.value)}
                        placeholder={quiz.flag_format_hint || "Submit flag…"}
                        className="w-full rounded-lg border border-[#e8e8e8] bg-[#f9f9f9] px-3 py-2 text-[12px] font-mono text-[#3a3a3a] placeholder:text-[#c4c4c4] focus:border-[#1ca9b1] focus:outline-none"
                    />
                </div>
            )}
        </div>
    )
}