// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/StepNavBar.tsx

import { CheckCircle2, Circle, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LabGuideStep, StepExecutionState } from "@/types/LabGuide"
import type { StepStatus } from "./types"

function getStepStatus(
    stepId: string,
    index: number,
    states: Record<string, StepExecutionState>,
): StepStatus {
    const state = states[stepId]
    return state?.status || (index === 0 ? "available" : "locked")
}

interface StepNavBarProps {
    steps: LabGuideStep[]
    stepStates: Record<string, StepExecutionState>
    currentStepIndex: number
    onStepChange: (index: number) => void
}

export function StepNavBar({ steps, stepStates, currentStepIndex, onStepChange }: StepNavBarProps) {
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