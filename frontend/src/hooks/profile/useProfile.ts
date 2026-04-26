// src/hooks/profile/useProfile.ts
import { useState, useCallback } from "react"
import type { UserProfile, UserStats, UpdateProfileRequest } from "@/types/profile/user"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface UseProfileReturn {
    profile: UserProfile | null
    stats: UserStats | null
    isLoading: boolean
    isUpdating: boolean
    error: string | null
    fetchProfile: () => Promise<UserProfile>
    fetchStats: () => Promise<UserStats>
    updateProfile: (data: UpdateProfileRequest) => Promise<UserProfile>
    syncProfile: () => Promise<void>
    resetError: () => void
}

/**
 * Hook to manage user profile operations
 * 
 * @returns Profile data, stats, loading states, error, and CRUD functions
 * 
 * @example
 * ```tsx
 * const { profile, fetchProfile, updateProfile, isLoading } = useProfile()
 * 
 * useEffect(() => {
 *   fetchProfile()
 * }, [])
 * 
 * const handleSave = async (data) => {
 *   await updateProfile(data)
 * }
 * ```
 */
export function useProfile(): UseProfileReturn {
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [stats, setStats] = useState<UserStats | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getToken = (): string | null => {
        return localStorage.getItem("access_token")
    }

    const resetError = useCallback(() => {
        setError(null)
    }, [])

    /**
     * Fetch full user profile from /profile/me
     * Auto-creates profile on first access
     */
    const fetchProfile = useCallback(async (): Promise<UserProfile> => {
        setIsLoading(true)
        setError(null)

        try {
            const token = getToken()

            if (!token) {
                throw new Error("Authentication required. Please log in.")
            }

            const response = await fetch(`${API_BASE_URL}/profile/me`, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Session expired. Please log in again.")
                }
                if (response.status === 403) {
                    throw new Error("Access denied. Insufficient permissions.")
                }
                const errorData = await response.json()
                throw new Error(errorData.detail || `Failed to fetch profile: ${response.statusText}`)
            }

            const data: UserProfile = await response.json()
            setProfile(data)
            return data
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to fetch profile"
            setError(message)
            throw new Error(message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    /**
     * Fetch quick stats from /profile/me/stats
     */
    const fetchStats = useCallback(async (): Promise<UserStats> => {
        setIsLoading(true)
        setError(null)

        try {
            const token = getToken()

            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/profile/me/stats`, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Session expired")
                }
                const errorData = await response.json()
                throw new Error(errorData.detail || `Failed to fetch stats: ${response.statusText}`)
            }

            const data: UserStats = await response.json()
            setStats(data)
            return data
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to fetch stats"
            setError(message)
            throw new Error(message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    /**
     * Update profile via PUT /profile/me
     */
    const updateProfile = useCallback(
        async (updateData: UpdateProfileRequest): Promise<UserProfile> => {
            setIsUpdating(true)
            setError(null)

            try {
                const token = getToken()

                if (!token) {
                    throw new Error("Authentication required")
                }

                const response = await fetch(`${API_BASE_URL}/profile/me`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(updateData)
                })

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error("Session expired. Please log in again.")
                    }
                    if (response.status === 403) {
                        throw new Error("Access denied")
                    }
                    if (response.status === 404) {
                        throw new Error("Profile not found. Please refresh the page.")
                    }
                    if (response.status === 422) {
                        const errorData = await response.json()
                        throw new Error(errorData.detail?.[0]?.msg || "Invalid data provided")
                    }
                    const errorData = await response.json()
                    throw new Error(errorData.detail || `Failed to update profile: ${response.statusText}`)
                }

                const data: UserProfile = await response.json()
                setProfile(data)
                return data
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to update profile"
                setError(message)
                throw new Error(message)
            } finally {
                setIsUpdating(false)
            }
        },
        []
    )

    /**
     * Force sync profile from Keycloak via POST /profile/sync
     */
    const syncProfile = useCallback(async (): Promise<void> => {
        setIsLoading(true)
        setError(null)

        try {
            const token = getToken()

            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/profile/sync`, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Session expired")
                }
                const errorData = await response.json()
                throw new Error(errorData.detail || `Failed to sync profile: ${response.statusText}`)
            }

            // Refresh profile after sync
            await fetchProfile()
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to sync profile"
            setError(message)
            throw new Error(message)
        } finally {
            setIsLoading(false)
        }
    }, [fetchProfile])

    return {
        profile,
        stats,
        isLoading,
        isUpdating,
        error,
        fetchProfile,
        fetchStats,
        updateProfile,
        syncProfile,
        resetError
    }
}