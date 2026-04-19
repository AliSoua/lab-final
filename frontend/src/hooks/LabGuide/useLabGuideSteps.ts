// app/hooks/LabGuide/useLabGuideSteps.ts
import { useState, useCallback } from "react"
import { toast } from "sonner"
import type {
    LabGuideStep,
    LabGuideStepCreateRequest,
    LabGuideStepUpdateRequest,
    ReorderStepItem,
} from "@/types/LabGuide"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface UseLabGuideStepsReturn {
    isSubmitting: boolean
    error: string | null
    createStep: (guideId: string, data: LabGuideStepCreateRequest) => Promise<LabGuideStep | undefined>
    updateStep: (guideId: string, stepId: string, data: LabGuideStepUpdateRequest) => Promise<LabGuideStep | undefined>
    deleteStep: (guideId: string, stepId: string) => Promise<void>
    reorderSteps: (guideId: string, items: ReorderStepItem[]) => Promise<LabGuideStep[] | undefined>
}

export function useLabGuideSteps(): UseLabGuideStepsReturn {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getToken = () => localStorage.getItem("access_token")

    const createStep = useCallback(async (guideId: string, data: LabGuideStepCreateRequest) => {
        setIsSubmitting(true)
        const loadingToast = toast.loading("Adding step...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/lab-guides/${guideId}/steps`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(data),
            })

            toast.dismiss(loadingToast)

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Unauthorized")
                    throw new Error("Unauthorized")
                }
                if (response.status === 403) {
                    toast.error("Forbidden")
                    throw new Error("Forbidden")
                }
                if (response.status === 404) {
                    toast.error("Guide not found")
                    throw new Error("Guide not found")
                }
                const errorText = await response.text()
                const msg = `Failed to add step: ${errorText}`
                toast.error(msg)
                throw new Error(msg)
            }

            const result: LabGuideStep = await response.json()
            toast.success("Step added")
            return result
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to add step"
            toast.dismiss(loadingToast)
            toast.error(message)
            throw new Error(message)
        } finally {
            setIsSubmitting(false)
        }
    }, [])

    const updateStep = useCallback(async (guideId: string, stepId: string, data: LabGuideStepUpdateRequest) => {
        setIsSubmitting(true)
        const loadingToast = toast.loading("Updating step...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(
                `${API_BASE_URL}/lab-guides/${guideId}/steps/${stepId}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(data),
                }
            )

            toast.dismiss(loadingToast)

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Unauthorized")
                    throw new Error("Unauthorized")
                }
                if (response.status === 403) {
                    toast.error("Forbidden")
                    throw new Error("Forbidden")
                }
                if (response.status === 404) {
                    toast.error("Step not found")
                    throw new Error("Step not found")
                }
                const errorText = await response.text()
                const msg = `Failed to update step: ${errorText}`
                toast.error(msg)
                throw new Error(msg)
            }

            const result: LabGuideStep = await response.json()
            toast.success("Step updated")
            return result
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update step"
            toast.dismiss(loadingToast)
            toast.error(message)
            throw new Error(message)
        } finally {
            setIsSubmitting(false)
        }
    }, [])

    const deleteStep = useCallback(async (guideId: string, stepId: string) => {
        const loadingToast = toast.loading("Removing step...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(
                `${API_BASE_URL}/lab-guides/${guideId}/steps/${stepId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            toast.dismiss(loadingToast)

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Unauthorized")
                    throw new Error("Unauthorized")
                }
                if (response.status === 403) {
                    toast.error("Forbidden")
                    throw new Error("Forbidden")
                }
                if (response.status === 404) {
                    toast.error("Step not found")
                    throw new Error("Step not found")
                }
                const errorText = await response.text()
                throw new Error(`Failed to delete step: ${errorText}`)
            }

            toast.success("Step removed")
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to delete step"
            toast.error(message)
            throw new Error(message)
        }
    }, [])

    const reorderSteps = useCallback(async (guideId: string, items: ReorderStepItem[]) => {
        setIsSubmitting(true)
        const loadingToast = toast.loading("Reordering steps...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(
                `${API_BASE_URL}/lab-guides/${guideId}/steps/reorder`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(items),
                }
            )

            toast.dismiss(loadingToast)

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Unauthorized")
                    throw new Error("Unauthorized")
                }
                if (response.status === 403) {
                    toast.error("Forbidden")
                    throw new Error("Forbidden")
                }
                if (response.status === 404) {
                    toast.error("Guide not found")
                    throw new Error("Guide not found")
                }
                const errorText = await response.text()
                throw new Error(`Failed to reorder steps: ${errorText}`)
            }

            const result: LabGuideStep[] = await response.json()
            toast.success("Steps reordered")
            return result
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to reorder steps"
            toast.dismiss(loadingToast)
            toast.error(message)
            throw new Error(message)
        } finally {
            setIsSubmitting(false)
        }
    }, [])

    return {
        isSubmitting,
        error,
        createStep,
        updateStep,
        deleteStep,
        reorderSteps,
    }
}