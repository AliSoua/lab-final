// src/components/LabGuide/CreateGuideLab/StepIndicator.tsx
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface StepIndicatorProps {
    steps: string[]
    current: number
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
    return (
        <div className="flex items-center gap-2">
            {steps.map((label, index) => {
                const isActive = index === current
                const isCompleted = index < current

                return (
                    <div key={label} className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <div
                                className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                                    isActive && "bg-[#1ca9b1] text-white",
                                    isCompleted && "bg-[#1ca9b1]/10 text-[#1ca9b1]",
                                    !isActive && !isCompleted && "bg-[#f5f5f5] text-[#c4c4c4]"
                                )}
                            >
                                {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                            </div>
                            <span
                                className={cn(
                                    "text-xs font-medium transition-colors",
                                    isActive && "text-[#1ca9b1]",
                                    isCompleted && "text-[#3a3a3a]",
                                    !isActive && !isCompleted && "text-[#c4c4c4]"
                                )}
                            >
                                {label}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={cn(
                                    "h-px w-6 transition-colors",
                                    isCompleted ? "bg-[#1ca9b1]" : "bg-[#e8e8e8]"
                                )}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}