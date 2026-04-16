// src/hooks/LabDefinition/useFeaturedLabs.ts
import { useState, useEffect, useCallback } from "react"
import type { PublicLabDefinition } from "@/types/LabDefinition/index"

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface UseFeaturedLabsReturn {
    featuredLabs: PublicLabDefinition[]
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
}

/**
 * Hook to fetch featured lab definitions from /lab-definitions/featured
 * 
 * @param limit - Maximum number of featured labs to fetch (default: 5)
 * @returns Featured labs data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { featuredLabs, isLoading, error } = useFeaturedLabs(5)
 * ```
 */
export function useFeaturedLabs(limit: number = 5): UseFeaturedLabsReturn {
    const [featuredLabs, setFeaturedLabs] = useState<PublicLabDefinition[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchFeaturedLabs = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const url = `${API_BASE_URL}/lab-definitions/featured?limit=${limit}`

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include", // Include cookies for auth
            })

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Authentication required. Please log in.")
                }
                throw new Error(`Failed to fetch featured labs: ${response.statusText}`)
            }

            const data: PublicLabDefinition[] = await response.json()
            setFeaturedLabs(data)
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load featured labs"
            setError(message)
            console.error("Error fetching featured labs:", err)
        } finally {
            setIsLoading(false)
        }
    }, [limit])

    useEffect(() => {
        fetchFeaturedLabs()
    }, [fetchFeaturedLabs])

    return {
        featuredLabs,
        isLoading,
        error,
        refetch: fetchFeaturedLabs,
    }
}