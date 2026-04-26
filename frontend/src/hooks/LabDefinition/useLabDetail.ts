// src/hooks/LabDefinition/useLabDetail.ts
import { useState, useEffect, useCallback } from "react"
import type { LabDetail } from "@/types/LabDefinition/LabDetail"

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL

interface UseLabDetailReturn {
    lab: LabDetail | null
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
}

/**
 * Hook to fetch detailed lab information by slug
 * 
 * @param slug - The URL-friendly slug of the lab
 * @returns Lab detail data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { lab, isLoading, error } = useLabDetail("python-fundamentals-lab")
 * ```
 */
export function useLabDetail(slug: string | undefined): UseLabDetailReturn {
    const [lab, setLab] = useState<LabDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchLab = useCallback(async () => {
        if (!slug) {
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(
                `${API_BASE_URL}/lab-definitions/labs/${slug}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            )

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Lab not found")
                }
                if (response.status === 401) {
                    throw new Error("Authentication required. Please log in.")
                }
                if (response.status === 403) {
                    throw new Error("You don't have permission to view this lab.")
                }
                throw new Error(`Failed to fetch lab details: ${response.statusText}`)
            }

            const data: LabDetail = await response.json()
            setLab(data)
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load lab details"
            setError(message)
            console.error("Error fetching lab detail:", err)
        } finally {
            setIsLoading(false)
        }
    }, [slug])

    useEffect(() => {
        fetchLab()
    }, [fetchLab])

    return {
        lab,
        isLoading,
        error,
        refetch: fetchLab,
    }
}