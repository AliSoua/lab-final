// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/index.tsx

import { useMemo } from "react"
import type { LabGuideStep, StepExecutionState } from "@/types/LabGuide"
import { GuideHeader } from "./GuideHeader"
import { StepNavBar } from "./StepNavBar"
import { StepContent } from "./StepContent"
import { LoadingState } from "./states/LoadingState"
import { EmptyState } from "./states/EmptyState"
import { ErrorState } from "./states/ErrorState"

export interface LabGuidePanelProps {
    steps: LabGuideStep[]
    stepStates?: Record<string, StepExecutionState>
    currentStepIndex: number
    onStepChange: (index: number) => void
    onRunCommand?: (stepId: string, commandIndex: number) => void
    isLoading?: boolean
    error?: string | null
}

export function LabGuidePanel({
    steps,
    stepStates = {},
    currentStepIndex,
    onStepChange,
    onRunCommand,
    isLoading,
    error,
}: LabGuidePanelProps) {
    const currentStep = useMemo(() => steps[currentStepIndex], [steps, currentStepIndex])
    const currentStepState = useMemo(
        () => (currentStep ? stepStates[currentStep.id] : undefined),
        [currentStep, stepStates],
    )

    if (isLoading) return <LoadingState />
    if (error) return <ErrorState message={error} />
    if (steps.length === 0) return <EmptyState />

    return (
        <div className="flex h-full flex-col bg-[#f9f9f9]">
            <GuideHeader currentStepIndex={currentStepIndex} totalSteps={steps.length} />
            <StepNavBar
                steps={steps}
                stepStates={stepStates}
                currentStepIndex={currentStepIndex}
                onStepChange={onStepChange}
            />
            <div className="flex-1 overflow-y-auto p-5">
                {currentStep && (
                    <StepContent
                        step={currentStep}
                        stepState={currentStepState}
                        onRunCommand={onRunCommand}
                    />
                )}
            </div>
        </div>
    )
}

export default LabGuidePanel