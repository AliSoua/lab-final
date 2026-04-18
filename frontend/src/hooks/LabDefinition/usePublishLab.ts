// src/hooks/LabDefinition/usePublishLab.ts
import { useState, useCallback } from "react"
import type { LabDefinition } from "@/types/LabDefinition/ListLabs"

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface UsePublishLabReturn {
    publishLab: (labId: string) => Promise<LabDefinition>
    isLoading: boolean
    error: string | null
    resetError: () => void
}

/**
 * Hook to publish a lab definition (change status from draft to published)
 * Hits POST /lab-definitions/{lab_id}/publish endpoint
 * 
 * Admin: can publish any lab
 * Moderator: can only publish labs they created
 * 
 * @returns Publish function, loading state, error, and reset function
 * 
 * @example
 * ```tsx
 * const { publishLab, isLoading, error } = usePublishLab()
 * const publishedLab = await publishLab("uuid-of-lab")
 * ```
 */
export function usePublishLab(): UsePublishLabReturn {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const resetError = useCallback(() => {
        setError(null)
    }, [])

    const publishLab = useCallback(
        async (labId: string): Promise<LabDefinition> => {
            setIsLoading(true)
            setError(null)

            try {
                const token = localStorage.getItem("access_token")

                if (!token) {
                    throw new Error("Authentication required")
                }

                const url = `${API_BASE_URL}/lab-definitions/${labId}/publish`

                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                })

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error("Unauthorized. Please log in.")
                    }
                    if (response.status === 403) {
                        throw new Error("Forbidden. You can only publish labs you created.")
                    }
                    if (response.status === 404) {
                        throw new Error("Lab definition not found.")
                    }
                    if (response.status === 400) {
                        const errorData = await response.json()
                        throw new Error(errorData.detail || "Lab is already published or archived.")
                    }
                    throw new Error(`Failed to publish lab: ${response.statusText}`)
                }

                const publishedLab: LabDefinition = await response.json()
                return publishedLab
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to publish lab definition"
                setError(message)
                throw new Error(message)
            } finally {
                setIsLoading(false)
            }
        },
        []
    )

    return {
        publishLab,
        isLoading,
        error,
        resetError,
    }
}