// src/components/LabDefinition/CreateFullLabDefinitions/CreateFullLabWizard.tsx
import { cn } from "@/lib/utils"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FormProvider, useForm } from "react-hook-form"
import { ChevronLeft, ChevronRight, Save, X, Layers, Server, BookOpen, FileText, ListChecks, Check } from "lucide-react"
import { BasicInfoStep } from "./BasicInfoStep"
import { DetailsStep } from "./DetailsStep"
import { VMsStep } from "./VMsStep"
import { GuideStep } from "./GuideStep"
import { ReviewStep } from "./ReviewStep"
import {
    type CreateFullLabDefinitionFormData,
    DEFAULT_CREATE_FULL_LAB_FORM_DATA,
} from "@/types/LabDefinition/CreateFullLabDefinition"
import { useCreateFullLabs } from "@/hooks/LabDefinition/useCreateFullLabs"
import { toast } from "sonner"

interface CreateFullLabWizardProps {
    onSuccess?: () => void
}

export type WizardStep = "basic" | "details" | "vms" | "guide" | "review"

const STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
    { id: "basic", label: "Basic Info", icon: FileText },
    { id: "details", label: "Details", icon: ListChecks },
    { id: "vms", label: "VMs", icon: Server },
    { id: "guide", label: "Guide", icon: BookOpen },
    { id: "review", label: "Review", icon: Layers },
]

export function CreateFullLabWizard({ onSuccess }: CreateFullLabWizardProps) {
    const navigate = useNavigate()
    const { createFullLab, isLoading, error, resetError } = useCreateFullLabs()
    const [currentStep, setCurrentStep] = useState<WizardStep>("basic")
    const [completedSteps, setCompletedSteps] = useState<WizardStep[]>([])

    const methods = useForm<CreateFullLabDefinitionFormData>({
        defaultValues: DEFAULT_CREATE_FULL_LAB_FORM_DATA,
        mode: "onBlur",
    })

    const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)
    const isFirstStep = currentStepIndex === 0
    const isLastStep = currentStepIndex === STEPS.length - 1

    const validateCurrentStep = async (): Promise<boolean> => {
        const fieldsToValidate: Record<WizardStep, string[]> = {
            basic: ["name", "slug", "description", "category", "difficulty", "duration_minutes"],
            details: [],
            vms: ["vms"],
            guide: ["guide_id"],
            review: []
        }

        if (currentStep === "details") {
            return true
        }

        const result = await methods.trigger(fieldsToValidate[currentStep] as any)
        return result
    }

    const handleNext = async (e?: React.MouseEvent) => {
        e?.preventDefault()
        resetError()
        const isValid = await validateCurrentStep()

        if (!isValid) {
            if (currentStep === "guide") {
                toast.error("Please select a guide")
            }
            return
        }

        if (!completedSteps.includes(currentStep)) {
            setCompletedSteps(prev => [...prev, currentStep])
        }

        if (!isLastStep) {
            setCurrentStep(STEPS[currentStepIndex + 1].id)
        }
    }

    const handleBack = () => {
        if (!isFirstStep) {
            setCurrentStep(STEPS[currentStepIndex - 1].id)
        } else {
            navigate("/admin/lab-definitions")
        }
    }

    const handleStepClick = (step: WizardStep) => {
        const stepIndex = STEPS.findIndex(s => s.id === step)
        if (stepIndex < currentStepIndex || completedSteps.includes(step)) {
            setCurrentStep(step)
        }
    }

    const handleSubmit = async (data: CreateFullLabDefinitionFormData) => {
        resetError()
        try {
            await createFullLab(data)
            onSuccess?.()
            navigate("/admin/lab-definitions")
        } catch {
            // Error handled by hook
        }
    }

    const renderStep = () => {
        switch (currentStep) {
            case "basic":
                return <BasicInfoStep />
            case "details":
                return <DetailsStep />
            case "vms":
                return <VMsStep />
            case "guide":
                return <GuideStep />
            case "review":
                return <ReviewStep />
            default:
                return null
        }
    }

    return (
        <FormProvider {...methods}>
            <form
                onSubmit={methods.handleSubmit(handleSubmit)}
                className="flex flex-col min-h-[calc(100vh-4rem)] bg-[#f9f9f9]"
                id="create-full-lab-form"
            >
                {/* Header */}
                <div className="bg-white border-b border-[#e8e8e8] px-8 py-5 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#e6f7f8] flex items-center justify-center text-[#1ca9b1]">
                                <Layers className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold text-[#3a3a3a]">
                                    Create Full Lab Definition
                                </h1>
                                <p className="text-sm text-[#727373] mt-0.5">
                                    Configure a complete lab environment with VMs and guided instructions
                                </p>
                            </div>
                        </div>

                        {/* Inline Step Indicator */}
                        <div className="flex items-center gap-1">
                            {STEPS.map((step, idx) => {
                                const isActive = idx === currentStepIndex
                                const isCompleted = completedSteps.includes(step.id) || idx < currentStepIndex

                                return (
                                    <button
                                        key={step.id}
                                        type="button"
                                        onClick={() => handleStepClick(step.id)}
                                        disabled={idx > currentStepIndex && !completedSteps.includes(step.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                            isActive && "bg-[#e6f7f8] text-[#1ca9b1]",
                                            isCompleted && !isActive && "text-[#727373] hover:bg-[#f5f5f5]",
                                            !isActive && !isCompleted && "text-[#c4c4c4] cursor-not-allowed"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold",
                                            isActive && "bg-[#1ca9b1] text-white",
                                            isCompleted && !isActive && "bg-[#1ca9b1]/20 text-[#1ca9b1]",
                                            !isActive && !isCompleted && "bg-[#f0f0f0] text-[#c4c4c4]"
                                        )}>
                                            {isCompleted ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                                        </div>
                                        <span className="hidden md:inline">{step.label}</span>
                                        {idx < STEPS.length - 1 && (
                                            <ChevronRight className="h-3.5 w-3.5 text-[#c4c4c4] ml-1" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Content — Single scrollable card */}
                <div className="flex-1 min-h-0 p-8">
                    <div className="bg-white rounded-xl border border-[#e8e8e8] shadow-sm h-full overflow-y-auto">
                        <div className="p-8 space-y-6">
                            {renderStep()}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-white border-t border-[#e8e8e8] px-8 py-4 shrink-0">
                    <div className="w-full flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={isLoading}
                            className={cn(
                                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
                                "text-[#727373] hover:bg-[#f5f5f5] hover:text-[#3a3a3a]",
                                "transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            )}
                        >
                            {isFirstStep ? (
                                <>
                                    <X className="h-4 w-4" />
                                    Cancel
                                </>
                            ) : (
                                <>
                                    <ChevronLeft className="h-4 w-4" />
                                    Back
                                </>
                            )}
                        </button>

                        <span className="text-xs text-[#727373] font-medium">
                            Step {currentStepIndex + 1} of {STEPS.length}
                        </span>

                        {isLastStep ? (
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={cn(
                                    "flex items-center gap-2 rounded-lg px-5 py-2",
                                    "bg-[#1ca9b1] text-white text-sm font-medium",
                                    "hover:bg-[#17959c] hover:shadow-md",
                                    "transition-all duration-200",
                                    "disabled:opacity-60 disabled:cursor-not-allowed"
                                )}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Create Lab
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={(e) => handleNext(e)}
                                disabled={isLoading}
                                className={cn(
                                    "flex items-center gap-2 rounded-lg px-5 py-2",
                                    "bg-[#1ca9b1] text-white text-sm font-medium",
                                    "hover:bg-[#17959c] hover:shadow-md",
                                    "transition-all duration-200",
                                    "disabled:opacity-60 disabled:cursor-not-allowed"
                                )}
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </FormProvider>
    )
}