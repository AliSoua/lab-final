// src/hooks/LabInstance/Trainee/useTraineeLabInstance.ts
import { useState, useCallback } from "react"
import { toast } from "sonner"
import type {
    MyLabInstanceListResponse,
} from "@/types/LabInstance/Trainee/LabInstance"
import type { MyLabInstance, } from "@/types/LabInstance/Trainee/LabInstance"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface UseTraineeLabInstanceReturn {
    /** GET /lab-instances/ — List the current trainee's own instances */
    listMyInstances: (skip?: number, limit?: number) => Promise<MyLabInstanceListResponse>
    /** GET /lab-instances/{id} — Get a single instance owned by the trainee */
    getMyInstance: (instanceId: string) => Promise<MyLabInstance>
    isLoading: boolean
    error: string | null
    resetError: () => void
}

/**
 * Trainee hook for lab instance operations.
 * Enforces trainee ownership on the backend.
 *
 * Endpoints:
 *   GET /lab-instances/            → list my instances (stripped view)
 *   GET /lab-instances/{id}        → get my instance detail
 */
export function useTraineeLabInstance(): UseTraineeLabInstanceReturn {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const resetError = useCallback(() => {
        setError(null)
    }, [])

    const getToken = useCallback((): string => {
        const token = localStorage.getItem("access_token")
        if (!token) {
            toast.error("Authentication required")
            throw new Error("Authentication required")
        }
        return token
    }, [])

    // -------------------------------------------------------------------------
    // GET /lab-instances/ — List MY instances (trainee)
    // -------------------------------------------------------------------------
    const listMyInstances = useCallback(
        async (skip = 0, limit = 100): Promise<MyLabInstanceListResponse> => {
            setIsLoading(true)
            setError(null)

            try {
                const token = getToken()
                const params = new URLSearchParams()
                params.append("skip", skip.toString())
                params.append("limit", limit.toString())

                const url = `${API_BASE_URL}/lab-instances/?${params.toString()}`

                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (!response.ok) {
                    if (response.status === 401) {
                        const msg = "Unauthorized. Please log in."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    if (response.status === 403) {
                        const msg = "Forbidden — insufficient permissions."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const msg = `Failed to list instances: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const result: MyLabInstanceListResponse = await response.json()
                return result
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to list lab instances"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden — insufficient permissions." ||
                    message.includes("Failed to list instances")

                if (!alreadyHandled) {
                    toast.error(message)
                    setError(message)
                }

                throw new Error(message)
            } finally {
                setIsLoading(false)
            }
        },
        [getToken]
    )

    // -------------------------------------------------------------------------
    // GET /lab-instances/{instance_id} — Get MY instance detail
    // -------------------------------------------------------------------------
    // NOTE: The backend currently returns the full LabInstanceResponse here.
    // If you later create a trainee-specific detail schema, swap the return
    // type from LabInstance to the new stripped-down type.
    // -------------------------------------------------------------------------
    const getMyInstance = useCallback(
        async (instanceId: string): Promise<MyLabInstance> => {
            setIsLoading(true)
            setError(null)

            try {
                const token = getToken()
                const url = `${API_BASE_URL}/lab-instances/${instanceId}`

                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (!response.ok) {
                    if (response.status === 401) {
                        const msg = "Unauthorized. Please log in."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    if (response.status === 403) {
                        const msg = "Forbidden — insufficient permissions."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    if (response.status === 404) {
                        const errorData = await response.json().catch(() => ({}))
                        const msg = errorData.detail || "Instance not found"
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const msg = `Failed to get instance: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const instance: MyLabInstance = await response.json()
                return instance
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to get lab instance"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden — insufficient permissions." ||
                    message.includes("Instance not found") ||
                    message.includes("Failed to get instance")

                if (!alreadyHandled) {
                    toast.error(message)
                    setError(message)
                }

                throw new Error(message)
            } finally {
                setIsLoading(false)
            }
        },
        [getToken]
    )

    return {
        listMyInstances,
        getMyInstance,
        isLoading,
        error,
        resetError,
    }
}