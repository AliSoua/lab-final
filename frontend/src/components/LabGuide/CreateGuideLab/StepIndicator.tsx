// src/components/LabGuide/CreateGuideLab/StepIndicator.tsx
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface StepIndicatorProps {
    steps: string[]
    current: number
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
    return (
        <div className="flex items-center gap-1 sm:gap-2">
            {steps.map((label, index) => {
                const isActive = index === current
                const isCompleted = index < current

                return (
                    <div key={label} className="flex items-center gap-1 sm:gap-2">
                        <div className="flex items-center gap-2">
                            <div
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-200",
                                    isActive && "bg-[#1ca9b1] text-white shadow-md shadow-[#1ca9b1]/20",
                                    isCompleted && "bg-[#1ca9b1] text-white",
                                    !isActive && !isCompleted && "bg-[#f5f5f5] text-[#c4c4c4]"
                                )}
                            >
                                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                            </div>
                            <span
                                className={cn(
                                    "hidden sm:inline text-sm font-medium transition-colors",
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
                                    "h-0.5 w-6 sm:w-10 rounded-full transition-colors duration-300",
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