// src/hooks/LabDefinition/useFeatureLab.ts
import { useState, useCallback } from "react"
import type { LabDefinition } from "@/types/LabDefinition/ListLabs"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface UseFeatureLabReturn {
    featureLab: (labId: string, priority?: number) => Promise<LabDefinition>
    unfeatureLab: (labId: string) => Promise<LabDefinition>
    updatePriority: (labId: string, priority: number) => Promise<LabDefinition>
    isLoading: boolean
    error: string | null
    resetError: () => void
}

/**
 * Hook to feature/unfeature lab definitions (Admin only)
 * 
 * - POST /lab-definitions/{lab_id}/feature - Add to featured section
 * - POST /lab-definitions/{lab_id}/unfeature - Remove from featured section
 * - POST /lab-definitions/{lab_id}/priority - Update display priority
 * 
 * @returns Feature/unfeature functions, loading state, error, and reset function
 * 
 * @example
 * ```tsx
 * const { featureLab, unfeatureLab, updatePriority, isLoading, error } = useFeatureLab()
 * 
 * // Feature a lab with priority 1 (appears first)
 * await featureLab("uuid-of-lab", 1)
 * 
 * // Unfeature a lab
 * await unfeatureLab("uuid-of-lab")
 * 
 * // Update priority
 * await updatePriority("uuid-of-lab", 5)
 * ```
 */
export function useFeatureLab(): UseFeatureLabReturn {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const resetError = useCallback(() => {
        setError(null)
    }, [])

    const makeRequest = useCallback(
        async (url: string, method: "POST" | "GET" = "POST"): Promise<LabDefinition> => {
            const token = localStorage.getItem("access_token")

            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(url, {
                method,
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
                    throw new Error("Forbidden. Admin access required.")
                }
                if (response.status === 404) {
                    throw new Error("Lab definition not found.")
                }
                if (response.status === 400) {
                    const errorData = await response.json()
                    throw new Error(errorData.detail || "Invalid request.")
                }
                throw new Error(`Failed: ${response.statusText}`)
            }

            return await response.json()
        },
        []
    )

    const featureLab = useCallback(
        async (labId: string, priority: number = 0): Promise<LabDefinition> => {
            setIsLoading(true)
            setError(null)

            try {
                const url = `${API_BASE_URL}/lab-definitions/${labId}/feature?priority=${priority}`
                const featuredLab = await makeRequest(url)
                return featuredLab
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to feature lab"
                setError(message)
                throw new Error(message)
            } finally {
                setIsLoading(false)
            }
        },
        [makeRequest]
    )

    const unfeatureLab = useCallback(
        async (labId: string): Promise<LabDefinition> => {
            setIsLoading(true)
            setError(null)

            try {
                const url = `${API_BASE_URL}/lab-definitions/${labId}/unfeature`
                const unfeaturedLab = await makeRequest(url)
                return unfeaturedLab
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to unfeature lab"
                setError(message)
                throw new Error(message)
            } finally {
                setIsLoading(false)
            }
        },
        [makeRequest]
    )

    const updatePriority = useCallback(
        async (labId: string, priority: number): Promise<LabDefinition> => {
            setIsLoading(true)
            setError(null)

            try {
                const url = `${API_BASE_URL}/lab-definitions/${labId}/priority?priority=${priority}`
                const updatedLab = await makeRequest(url)
                return updatedLab
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to update priority"
                setError(message)
                throw new Error(message)
            } finally {
                setIsLoading(false)
            }
        },
        [makeRequest]
    )

    return {
        featureLab,
        unfeatureLab,
        updatePriority,
        isLoading,
        error,
        resetError,
    }
}