// src/hooks/LabInstance/useLabGuideRuntime.ts
import { useState, useEffect, useCallback } from "react"
import type { LabGuideStep, GuideVersion, StepExecutionState } from "@/types/LabGuide"
import type { LabInstance } from "@/types/LabInstance/LabInstance"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

async function fetchInstanceGuideVersion(instanceId: string, token: string): Promise<GuideVersion | null> {
    try {
        const res = await fetch(
            `${API_BASE_URL}/lab-instances/${instanceId}/guide-version`,
            { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

// Helper to create a mutable default step state
function createDefaultStepState(stepId: string, index: number): StepExecutionState {
    return {
        step_id: stepId,
        status: index === 0 ? "available" : "locked",
        tasks_completed: [],
        hints_revealed: [],
        command_results: [],
        validation_results: [],
        score_earned: 0,
    }
}

export function useLabGuideRuntime(instance: LabInstance | null) {
    const [guideVersion, setGuideVersion] = useState<GuideVersion | null>(null)
    const [steps, setSteps] = useState<LabGuideStep[]>([])
    const [stepStates, setStepStates] = useState<StepExecutionState[]>([])
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load guide version when instance has guide_version_id
    useEffect(() => {
        if (!instance?.id || !instance?.guide_version_id) {
            setGuideVersion(null)
            setSteps([])
            setStepStates([])
            return
        }

        let cancelled = false
        const token = localStorage.getItem("access_token")
        if (!token) {
            setError("Not authenticated")
            return
        }

        setIsLoading(true)
        setError(null)

        // Use instance-scoped endpoint so backend validates ownership
        fetchInstanceGuideVersion(instance.id, token).then((version) => {
            if (cancelled) return
            if (!version) {
                setError("Failed to load guide version")
                setIsLoading(false)
                return
            }

            setGuideVersion(version)
            setSteps(version.steps || [])

            // Initialize step states from instance session_state or create fresh
            const existingStates = instance.session_state?.step_states || []
            const initialized: StepExecutionState[] = (version.steps || []).map((step, index) => {
                const existing = existingStates.find((s) => s.step_id === step.id)
                if (existing) return existing
                return createDefaultStepState(step.id, index)
            })

            setStepStates(initialized)
            setCurrentStepIndex(instance.current_step_index || 0)
            setIsLoading(false)
        })

        return () => {
            cancelled = true
        }
    }, [instance?.id, instance?.guide_version_id, instance?.session_state, instance?.current_step_index])

    const handleStepChange = useCallback((index: number) => {
        setCurrentStepIndex(index)
        // TODO: Persist current_step_index to backend
        // PATCH /lab-instances/{id}/session-state { current_step_index: index }
    }, [])

    const handleRunCommand = useCallback((command: string, label?: string) => {
        // TODO: Execute command via backend
        // POST /lab-instances/{id}/steps/{index}/commands
        console.log("[RunCommand]", { command, label, stepIndex: currentStepIndex })
    }, [currentStepIndex])

    return {
        guideVersion,
        steps,
        stepStates,
        currentStepIndex,
        isLoading,
        error,
        handleStepChange,
        handleRunCommand,
    }
}