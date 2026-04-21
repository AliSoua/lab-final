// src/components/LabGuide/PreviewGuideLab/StepNavigation.tsx
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface StepNavigationProps {
    currentStepIndex: number
    totalSteps: number
    isFirst: boolean
    isLast: boolean
    onStepChange: (index: number) => void
    onNext: () => void
    onPrev: () => void
}

export function StepNavigation({
    currentStepIndex,
    totalSteps,
    isFirst,
    isLast,
    onStepChange,
    onNext,
    onPrev,
}: StepNavigationProps) {
    return (
        <div className="px-5 py-3 border-t border-[#e8e8e8] bg-white shrink-0 flex items-center justify-between">
            <button
                onClick={onPrev}
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
                {Array.from({ length: totalSteps }).map((_, idx) => (
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
                onClick={onNext}
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
    )
}