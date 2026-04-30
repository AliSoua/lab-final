// src/hooks/LabInstance/useAdminLabInstance.ts
import { useState, useCallback } from "react"
import { toast } from "sonner"
import type {
    LabInstance,
    LabInstanceListResponse,
} from "@/types/LabInstance/LabInstance"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface UseAdminLabInstanceReturn {
    listAllInstances: (skip?: number, limit?: number) => Promise<LabInstanceListResponse>
    getInstanceAdmin: (instanceId: string) => Promise<LabInstance>
    terminateInstanceAdmin: (instanceId: string) => Promise<LabInstance>
    isLoading: boolean
    error: string | null
    resetError: () => void
}

/**
 * Admin/Moderator hook for lab instance operations.
 * Bypasses trainee ownership checks.
 *
 * Endpoints:
 *   GET /lab-instances/all          → list all instances
 *   GET /lab-instances/{id}/admin   → get any single instance
 */
export function useAdminLabInstance(): UseAdminLabInstanceReturn {
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
    // GET /lab-instances/all — List ALL instances (admin/moderator)
    // -------------------------------------------------------------------------
    const listAllInstances = useCallback(
        async (skip = 0, limit = 100): Promise<LabInstanceListResponse> => {
            setIsLoading(true)
            setError(null)

            try {
                const token = getToken()
                const params = new URLSearchParams()
                params.append("skip", skip.toString())
                params.append("limit", limit.toString())

                const url = `${API_BASE_URL}/lab-instances/all?${params.toString()}`

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
                        const msg = "Forbidden — moderator or admin access required."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const msg = `Failed to list all instances: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const result: LabInstanceListResponse = await response.json()
                return result
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to list all lab instances"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden — moderator or admin access required." ||
                    message.includes("Failed to list all instances")

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
    // GET /lab-instances/{instance_id}/admin — Get any instance (admin/moderator)
    // -------------------------------------------------------------------------
    const getInstanceAdmin = useCallback(
        async (instanceId: string): Promise<LabInstance> => {
            setIsLoading(true)
            setError(null)

            try {
                const token = getToken()
                const url = `${API_BASE_URL}/lab-instances/${instanceId}/admin`

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
                        const msg = "Forbidden — moderator or admin access required."
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

                const instance: LabInstance = await response.json()
                return instance
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to get lab instance"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden — moderator or admin access required." ||
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

    // -------------------------------------------------------------------------
    // DELETE /lab-instances/{instance_id}/admin — Terminate any instance (admin/moderator)
    // -------------------------------------------------------------------------   
    const terminateInstanceAdmin = useCallback(
        async (instanceId: string): Promise<LabInstance> => {
            setIsLoading(true)
            setError(null)

            const loadingToast = toast.loading("Terminating instance (admin)...")

            try {
                const token = getToken()
                const url = `${API_BASE_URL}/lab-instances/${instanceId}/admin`

                console.log("ADMIN TERMINATE CALL →", url)

                const response = await fetch(url, {
                    method: "DELETE",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (!response.ok) {
                    toast.dismiss(loadingToast)

                    if (response.status === 401) {
                        const msg = "Unauthorized. Please log in."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    if (response.status === 403) {
                        const msg = "Forbidden — admin required."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    if (response.status === 404) {
                        const errorData = await response.json().catch(() => ({}))
                        const msg = errorData.detail || "Instance not found"
                        toast.error(msg)
                        throw new Error(msg)
                    }

                    const msg = `Failed to terminate instance: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                // Handle 202 (no body) safely
                let instance: LabInstance | null = null
                try {
                    instance = await response.json()
                } catch {
                    // backend returned empty body → that's fine
                }

                toast.dismiss(loadingToast)
                toast.success("Instance termination started")

                return instance as LabInstance
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to terminate instance"

                toast.dismiss(loadingToast)
                toast.error(message)
                setError(message)

                throw new Error(message)
            } finally {
                setIsLoading(false)
            }
        },
        [getToken]
    )
    return {
        listAllInstances,
        getInstanceAdmin,
        terminateInstanceAdmin,
        isLoading,
        error,
        resetError,
    }
}