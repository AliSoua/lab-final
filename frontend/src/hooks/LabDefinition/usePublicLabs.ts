// src/hooks/LabDefinition/usePublicLabs.ts
import { useState, useEffect, useCallback } from "react"
import type { PublicLabDefinition, ListPublicLabsParams } from "@/types/LabDefinition/index"

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL

interface UsePublicLabsReturn {
    labs: PublicLabDefinition[]
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
    hasMore: boolean
}

/**
 * Hook to fetch public lab definitions from /lab-definitions/public
 * 
 * @param params - Query parameters for pagination and filtering
 * @returns Labs data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { labs, isLoading, error } = usePublicLabs({ 
 *   limit: 20, 
 *   category: "database" 
 * })
 * ```
 */
export function usePublicLabs(params: ListPublicLabsParams = {}): UsePublicLabsReturn {
    const [labs, setLabs] = useState<PublicLabDefinition[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(false)

    const fetchLabs = useCallback(async () => {

        setIsLoading(true)
        setError(null)

        try {

            // Build query string
            const queryParams = new URLSearchParams()
            if (params.skip !== undefined) queryParams.set("skip", params.skip.toString())
            if (params.limit !== undefined) queryParams.set("limit", params.limit.toString())
            if (params.category) queryParams.set("category", params.category)
            if (params.difficulty) queryParams.set("difficulty", params.difficulty)

            const url = `${API_BASE_URL}/lab-definitions/public?${queryParams.toString()}`

            const response = await fetch(url, {
                method: "GET"
            })

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Authentication required. Please log in.")
                }
                throw new Error(`Failed to fetch labs: ${response.statusText}`)
            }

            const data: PublicLabDefinition[] = await response.json()
            setLabs(data)

            // Determine if there might be more results
            const limit = params.limit || 100
            setHasMore(data.length === limit)
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load labs"
            setError(message)
            console.error("Error fetching public labs:", err)
        } finally {
            setIsLoading(false)
        }
    }, [params.skip, params.limit, params.category, params.difficulty])

    useEffect(() => {
        fetchLabs()
    }, [fetchLabs])

    return {
        labs,
        isLoading,
        error,
        refetch: fetchLabs,
        hasMore
    }
}