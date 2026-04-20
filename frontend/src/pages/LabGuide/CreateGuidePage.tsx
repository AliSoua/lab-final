// app/pages/LabGuide/CreateGuidePage.tsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { BookOpen, ChevronLeft, ChevronRight, Save, Layers } from "lucide-react"
import { useLabGuides } from "@/hooks/LabGuide/useLabGuides"
import { StepIndicator } from "@/components/LabGuide/CreateGuideLab/StepIndicator"
import { BasicInfoStep } from "@/components/LabGuide/CreateGuideLab/BasicInfoStep"
import { StepsBuilder } from "@/components/LabGuide/CreateGuideLab/StepsBuilder"
import { ReviewStep } from "@/components/LabGuide/CreateGuideLab/ReviewStep"
import type { LabGuideCreateRequest, LabGuideStepCreateRequest } from "@/types/LabGuide"
import { toast } from "sonner"

const STEPS = ["Basic Info", "Build Steps", "Review"]

export default function CreateGuidePage() {
    const navigate = useNavigate()
    const { createGuide, isSubmitting } = useLabGuides()
    const [currentStep, setCurrentStep] = useState(0)

    const [formData, setFormData] = useState<LabGuideCreateRequest>({
        title: "",
        is_published: false,
        steps: [],
    })

    const canProceed = () => {
        if (currentStep === 0) {
            return formData.title.trim().length > 0
        }
        if (currentStep === 1) {
            return formData.steps.length > 0
        }
        return true
    }

    const handleNext = () => {
        if (!canProceed()) {
            if (currentStep === 0) toast.error("Title is required")
            if (currentStep === 1) toast.error("Add at least one step")
            return
        }
        setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
    }

    const handleBack = () => {
        setCurrentStep((s) => Math.max(s - 1, 0))
    }

    const handleSubmit = async () => {
        try {
            await createGuide(formData)
            toast.success("Guide created successfully")
            navigate(`/admin/lab-guides`)
        } catch {
            // Error handled by hook
        }
    }

    const updateForm = (partial: Partial<LabGuideCreateRequest>) => {
        setFormData((prev) => ({ ...prev, ...partial }))
    }

    const updateSteps = (steps: LabGuideStepCreateRequest[]) => {
        setFormData((prev) => ({ ...prev, steps }))
    }

    return (
        <div className="flex flex-col h-full bg-[#f9f9f9]">
            {/* Header */}
            <div className="bg-white border-b border-[#e8e8e8] px-8 py-5 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#e6f7f8] flex items-center justify-center text-[#1ca9b1]">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-[#3a3a3a]">
                                Create Lab Guide
                            </h1>
                            <p className="text-sm text-[#727373] mt-0.5">
                                Build an interactive step-by-step guide
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {formData.steps.length > 0 && (
                            <div className="hidden md:flex items-center gap-1.5 text-xs text-[#727373] bg-[#f5f5f5] px-3 py-1.5 rounded-lg">
                                <Layers className="h-3.5 w-3.5" />
                                <span>{formData.steps.length} steps</span>
                                <span className="text-[#c4c4c4]">•</span>
                                <span>{formData.steps.reduce((s, x) => s + (x.points || 0), 0)} pts</span>
                            </div>
                        )}
                        <StepIndicator steps={STEPS} current={currentStep} />
                    </div>
                </div>
            </div>

            {/* Content — FULL WIDTH */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="w-full space-y-6">
                    {currentStep === 0 && (
                        <BasicInfoStep data={formData} onChange={updateForm} />
                    )}

                    {currentStep === 1 && (
                        <StepsBuilder steps={formData.steps} onChange={updateSteps} />
                    )}

                    {currentStep === 2 && (
                        <ReviewStep data={formData} />
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-white border-t border-[#e8e8e8] px-8 py-4 shrink-0">
                <div className="w-full flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className={cn(
                            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
                            "text-[#727373] hover:bg-[#f5f5f5] hover:text-[#3a3a3a]",
                            "transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        )}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </button>

                    {currentStep < STEPS.length - 1 ? (
                        <button
                            onClick={handleNext}
                            className={cn(
                                "flex items-center gap-2 rounded-lg px-5 py-2",
                                "bg-[#1ca9b1] text-white text-sm font-medium",
                                "hover:bg-[#17959c] hover:shadow-md",
                                "transition-all duration-200"
                            )}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={cn(
                                "flex items-center gap-2 rounded-lg px-5 py-2",
                                "bg-[#1ca9b1] text-white text-sm font-medium",
                                "hover:bg-[#17959c] hover:shadow-md",
                                "transition-all duration-200",
                                "disabled:opacity-60 disabled:cursor-not-allowed"
                            )}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Create Guide
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}