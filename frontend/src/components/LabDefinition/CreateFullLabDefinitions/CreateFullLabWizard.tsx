// src/components/LabDefinition/CreateFullLabDefinitions/CreateFullLabWizard.tsx
import { cn } from "@/lib/utils"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FormProvider, useForm } from "react-hook-form"
import { ArrowLeft, ArrowRight, Loader2, Save, X } from "lucide-react"
import { StepIndicator, type WizardStep } from "./StepIndicator"
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

interface CreateFullLabWizardProps {
    onSuccess?: () => void
}

export function CreateFullLabWizard({ onSuccess }: CreateFullLabWizardProps) {
    const navigate = useNavigate()
    const { createFullLab, isLoading, error, resetError } = useCreateFullLabs()
    const [currentStep, setCurrentStep] = useState<WizardStep>("basic")
    const [completedSteps, setCompletedSteps] = useState<WizardStep[]>([])

    const methods = useForm<CreateFullLabDefinitionFormData>({
        defaultValues: DEFAULT_CREATE_FULL_LAB_FORM_DATA,
        mode: "onBlur",
    })

    const steps: WizardStep[] = ["basic", "details", "vms", "guide", "review"]
    const currentStepIndex = steps.indexOf(currentStep)
    const isFirstStep = currentStepIndex === 0
    const isLastStep = currentStepIndex === steps.length - 1

    const validateCurrentStep = async (): Promise<boolean> => {
        const fieldsToValidate: Record<WizardStep, string[]> = {
            basic: ["name", "slug", "description", "category", "difficulty", "duration_minutes"],
            details: [],
            vms: ["vms"],
            guide: ["guide_blocks"],
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

        if (!isValid) return

        if (!completedSteps.includes(currentStep)) {
            setCompletedSteps(prev => [...prev, currentStep])
        }

        if (!isLastStep) {
            setCurrentStep(steps[currentStepIndex + 1])
        }
    }

    const handleBack = () => {
        if (!isFirstStep) {
            setCurrentStep(steps[currentStepIndex - 1])
        } else {
            navigate("/admin/lab-definitions")
        }
    }

    const handleStepClick = (step: WizardStep) => {
        const stepIndex = steps.indexOf(step)
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
                className="flex flex-col h-full"
                id="create-full-lab-form"
            >
                {/* Fixed Header */}
                <div className="bg-white border-b border-slate-200 flex-none">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h1 className="text-xl font-semibold tracking-tight text-slate-800">
                            Create Full Lab Definition
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Configure a complete lab environment with VMs and guided instructions
                        </p>
                    </div>

                    <StepIndicator
                        currentStep={currentStep}
                        completedSteps={completedSteps}
                        onStepClick={handleStepClick}
                    />
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50 min-h-0">
                    <div className="w-full p-6">
                        <div className="max-w-4xl mx-auto bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            {renderStep()}
                        </div>
                        <div className="h-8" />
                    </div>
                </div>

                {/* Fixed Footer */}
                <div className="bg-white border-t border-slate-200 px-6 py-4 flex-none">
                    <div className="w-full flex items-center justify-between max-w-4xl mx-auto">
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={isLoading}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg",
                                "text-sm font-medium text-slate-600",
                                "hover:text-slate-800 hover:bg-slate-100",
                                "transition-colors duration-200",
                                "disabled:opacity-60 disabled:cursor-not-allowed"
                            )}
                        >
                            {isFirstStep ? (
                                <>
                                    <X className="h-4 w-4" />
                                    Cancel
                                </>
                            ) : (
                                <>
                                    <ArrowLeft className="h-4 w-4" />
                                    Back
                                </>
                            )}
                        </button>

                        <span className="text-xs text-slate-400 font-medium">
                            Step {currentStepIndex + 1} of {steps.length}
                        </span>

                        {isLastStep ? (
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={cn(
                                    "flex items-center gap-2 rounded-lg px-6 py-2.5",
                                    "bg-sky-500 text-white text-sm font-medium",
                                    "hover:bg-sky-600 transition-colors duration-200",
                                    "shadow-sm shadow-sky-500/20",
                                    "disabled:opacity-60 disabled:cursor-not-allowed"
                                )}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
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
                                    "flex items-center gap-2 rounded-lg px-6 py-2.5",
                                    "bg-sky-500 text-white text-sm font-medium",
                                    "hover:bg-sky-600 transition-colors duration-200",
                                    "shadow-sm shadow-sky-500/20",
                                    "disabled:opacity-60 disabled:cursor-not-allowed"
                                )}
                            >
                                Next
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </FormProvider>
    )
}