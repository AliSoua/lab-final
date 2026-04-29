// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/types.ts

import type { StepExecutionState } from "@/types/LabGuide"

export interface LabGuidePanelProps {
    steps: import("@/types/LabGuide").LabGuideStep[]
    stepStates?: Record<string, StepExecutionState>
    currentStepIndex: number
    onStepChange: (index: number) => void
    onRunCommand?: (stepId: string, commandIndex: number) => void
    isLoading?: boolean
    error?: string | null
}

export type StepStatus = StepExecutionState["status"] | "locked"