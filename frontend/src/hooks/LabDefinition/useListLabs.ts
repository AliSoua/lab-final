// src/hooks/LabDefinition/useListLabs.ts
import { useState, useEffect, useCallback } from "react"
import type { LabDefinition, ListLabsParams } from "@/types/LabDefinition/ListLabs"

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface UseListLabsReturn {
    labs: LabDefinition[]
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
    hasMore: boolean
    totalCount: number
}

/**
 * Hook to fetch lab definitions for admin/moderator
 * Hits /lab-definitions/ endpoint (requires admin or moderator role)
 * 
 * @param params - Query parameters for pagination and filtering
 * @returns Labs data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { labs, isLoading, error, refetch } = useListLabs({ 
 *   limit: 20, 
 *   status: "draft",
 *   search: "postgresql"
 * })
 * ```
 */
export function useListLabs(params: ListLabsParams = {}): UseListLabsReturn {
    const [labs, setLabs] = useState<LabDefinition[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(false)
    const [totalCount, setTotalCount] = useState(0)

    const fetchLabs = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const token = localStorage.getItem("access_token")

            if (!token) {
                throw new Error("Authentication required")
            }

            // Build query string
            const queryParams = new URLSearchParams()
            if (params.skip !== undefined) queryParams.set("skip", params.skip.toString())
            if (params.limit !== undefined) queryParams.set("limit", params.limit.toString())
            if (params.category) queryParams.set("category", params.category)
            if (params.difficulty) queryParams.set("difficulty", params.difficulty)
            if (params.status) queryParams.set("status", params.status)
            if (params.search) queryParams.set("search", params.search)

            const url = `${API_BASE_URL}/lab-definitions/?${queryParams.toString()}`

            const response = await fetch(url, {
                method: "GET",
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
                    throw new Error("Forbidden. Admin or moderator access required.")
                }
                throw new Error(`Failed to fetch labs: ${response.statusText}`)
            }

            const data: LabDefinition[] = await response.json()
            setLabs(data)

            // Determine if there might be more results
            const limit = params.limit || 100
            setHasMore(data.length === limit)

            // Try to get total count from X-Total-Count header, fallback to current data length
            const totalHeader = response.headers.get("X-Total-Count")
            if (totalHeader) {
                setTotalCount(parseInt(totalHeader, 10))
            } else {
                // Fallback: if we got a full page, assume there might be more
                // This is an estimation for pagination UI purposes
                setTotalCount(data.length === limit ? (params.skip || 0) + data.length + 1 : (params.skip || 0) + data.length)
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load labs"
            setError(message)
            console.error("Error fetching lab definitions:", err)
        } finally {
            setIsLoading(false)
        }
    }, [params.skip, params.limit, params.category, params.difficulty, params.status, params.search])

    useEffect(() => {
        fetchLabs()
    }, [fetchLabs])

    return {
        labs,
        isLoading,
        error,
        refetch: fetchLabs,
        hasMore,
        totalCount
    }
}