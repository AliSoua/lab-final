// src/components/LabDefinition/CreateFullLabDefinitions/StepIndicator.tsx
import { cn } from "@/lib/utils"
import { Check, FileText, Server, BookOpen, Eye, Sparkles } from "lucide-react"

export type WizardStep = "basic" | "details" | "vms" | "guide" | "review"

interface Step {
    id: WizardStep
    label: string
    icon: React.ReactNode
}

const steps: Step[] = [
    { id: "basic", label: "Basic Info", icon: <FileText className="h-4 w-4" /> },
    { id: "details", label: "Content", icon: <Sparkles className="h-4 w-4" /> },
    { id: "vms", label: "VMs", icon: <Server className="h-4 w-4" /> },
    { id: "guide", label: "Guide", icon: <BookOpen className="h-4 w-4" /> },
    { id: "review", label: "Review", icon: <Eye className="h-4 w-4" /> },
]

interface StepIndicatorProps {
    currentStep: WizardStep
    completedSteps: WizardStep[]
    onStepClick?: (step: WizardStep) => void
}

export function StepIndicator({ currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
    const currentIndex = steps.findIndex(s => s.id === currentStep)

    return (
        <div className="px-6 py-4 bg-white border-b border-[#e8e8e8]">
            <div className="flex items-center w-full max-w-3xl mx-auto">
                {steps.map((step, index) => {
                    const isCompleted = completedSteps.includes(step.id)
                    const isCurrent = step.id === currentStep
                    const isClickable = isCompleted || index < currentIndex
                    const isLast = index === steps.length - 1

                    return (
                        <div key={step.id} className="flex items-center flex-1">
                            <button
                                type="button"
                                onClick={() => isClickable && onStepClick?.(step.id)}
                                disabled={!isClickable}
                                className={cn(
                                    "flex items-center gap-3 group",
                                    isClickable && "cursor-pointer",
                                    !isClickable && "cursor-default"
                                )}
                            >
                                <div
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200",
                                        isCompleted && "bg-[#1ca9b1] border-[#1ca9b1] text-white",
                                        isCurrent && "border-[#1ca9b1] text-[#1ca9b1] bg-white ring-2 ring-[#1ca9b1]/20",
                                        !isCompleted && !isCurrent && "border-[#d4d4d4] text-[#c4c4c4] bg-white",
                                        isClickable && !isCurrent && "hover:border-[#1ca9b1] hover:text-[#1ca9b1]"
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        step.icon
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        "text-[11px] font-medium uppercase tracking-wider transition-colors hidden sm:block",
                                        isCurrent ? "text-[#1ca9b1]" :
                                            isCompleted ? "text-[#3a3a3a]" : "text-[#c4c4c4]"
                                    )}
                                >
                                    {step.label}
                                </span>
                            </button>
                            {!isLast && (
                                <div
                                    className={cn(
                                        "flex-1 h-px mx-4 transition-colors duration-200",
                                        isCompleted ? "bg-[#1ca9b1]" : "bg-[#e8e8e8]"
                                    )}
                                />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}