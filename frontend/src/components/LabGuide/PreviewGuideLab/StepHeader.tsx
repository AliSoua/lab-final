// src/components/LabGuide/PreviewGuideLab/StepHeader.tsx
import { cn } from "@/lib/utils"
import { Terminal } from "lucide-react"
import type { LabGuideStep } from "@/types/LabGuide"

interface StepHeaderProps {
    step: LabGuideStep
    currentStepIndex: number
    totalSteps: number
    progress: number
}

export function StepHeader({ step, currentStepIndex, totalSteps, progress }: StepHeaderProps) {
    return (
        <>
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
                        Step {currentStepIndex + 1} of {totalSteps}
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
        </>
    )
}