// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/sections/HintsSection.tsx

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GuideHint } from "@/types/LabGuide"

interface HintsSectionProps {
    hints: GuideHint[]
    revealedIndices: number[]
}

export function HintsSection({ hints, revealedIndices }: HintsSectionProps) {
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