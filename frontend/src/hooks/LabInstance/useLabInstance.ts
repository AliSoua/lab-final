// src/hooks/LabInstance/useLabInstance.ts
import { useState, useCallback } from "react"
import { toast } from "sonner"
import type {
    LabInstance,
    LabInstanceCreate,
    LabInstanceStatus,
    LabInstanceListResponse,
} from "@/types/LabInstance/LabInstance"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface UseLabInstanceReturn {
    // Mutations
    launchLabInstance: (data: LabInstanceCreate) => Promise<LabInstance>
    refreshInstanceStatus: (instanceId: string) => Promise<LabInstanceStatus>
    stopInstance: (instanceId: string) => Promise<LabInstance>
    terminateInstance: (instanceId: string) => Promise<LabInstance>
    // Queries
    listMyInstances: (skip?: number, limit?: number) => Promise<LabInstanceListResponse>
    getInstance: (instanceId: string) => Promise<LabInstance>
    // State
    isLoading: boolean
    error: string | null
    resetError: () => void
}

/**
 * Hook to manage lab instances (launch, list, control, terminate).
 *
 * Matches backend router: app/routers/LabDefinition/lab_instances.py
 */
export function useLabInstance(): UseLabInstanceReturn {
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
    // POST /lab-instances/ — Launch a lab instance
    // -------------------------------------------------------------------------
    const launchLabInstance = useCallback(
        async (data: LabInstanceCreate): Promise<LabInstance> => {
            setIsLoading(true)
            setError(null)

            const loadingToast = toast.loading("Launching lab instance...")

            try {
                const token = getToken()
                const url = `${API_BASE_URL}/lab-instances/`

                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(data),
                })

                if (!response.ok) {
                    toast.dismiss(loadingToast)

                    let msg: string

                    if (response.status === 401) {
                        msg = "Unauthorized. Please log in."
                    } else if (response.status === 403) {
                        msg = "Forbidden."
                    } else if (response.status === 400) {
                        const errorData = await response.json().catch(() => ({}))
                        msg = errorData.detail || "Bad request"
                    } else if (response.status === 502) {
                        const errorData = await response.json().catch(() => ({}))
                        msg = errorData.detail || "External service error"
                    } else {
                        msg = `Failed to launch lab: ${response.statusText}`
                    }

                    toast.error(msg)
                    throw new Error(msg)
                }

                const instance: LabInstance = await response.json()

                toast.dismiss(loadingToast)
                toast.success("Lab instance launched!", {
                    description: instance.vm_name || instance.id,
                })

                return instance
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to launch lab instance"

                // Only toast if we haven't already toasted (i.e. non-HTTP errors)
                const wasAlreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden." ||
                    message.startsWith("Failed to launch lab:")

                if (!wasAlreadyHandled) {
                    toast.dismiss(loadingToast)
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
    // GET /lab-instances/?skip=&limit= — List my instances
    // -------------------------------------------------------------------------
    const listMyInstances = useCallback(
        async (skip = 0, limit = 100): Promise<LabInstanceListResponse> => {
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
                        const msg = "Forbidden."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const msg = `Failed to list instances: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const result: LabInstanceListResponse = await response.json()
                return result
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to list lab instances"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden." ||
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
    // GET /lab-instances/{instance_id} — Get single instance
    // -------------------------------------------------------------------------
    const getInstance = useCallback(
        async (instanceId: string): Promise<LabInstance> => {
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
                        const msg = "Forbidden."
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
                    message === "Forbidden." ||
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
    // POST /lab-instances/{instance_id}/refresh — Refresh status from vCenter
    // -------------------------------------------------------------------------
    const refreshInstanceStatus = useCallback(
        async (instanceId: string): Promise<LabInstanceStatus> => {
            setIsLoading(true)
            setError(null)

            const loadingToast = toast.loading("Refreshing instance status...")

            try {
                const token = getToken()
                const url = `${API_BASE_URL}/lab-instances/${instanceId}/refresh`

                const response = await fetch(url, {
                    method: "POST",
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
                        const msg = "Forbidden."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    if (response.status === 404) {
                        const errorData = await response.json().catch(() => ({}))
                        const msg = errorData.detail || "Instance not found"
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const msg = `Failed to refresh status: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const statusData: LabInstanceStatus = await response.json()

                toast.dismiss(loadingToast)
                toast.success("Status refreshed", {
                    description: `Power: ${statusData.power_state || "unknown"}`,
                })

                return statusData
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to refresh instance status"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden." ||
                    message.includes("Instance not found") ||
                    message.includes("Failed to refresh status")

                if (!alreadyHandled) {
                    toast.dismiss(loadingToast)
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
    // POST /lab-instances/{instance_id}/stop — Stop instance
    // -------------------------------------------------------------------------
    const stopInstance = useCallback(
        async (instanceId: string): Promise<LabInstance> => {
            setIsLoading(true)
            setError(null)

            const loadingToast = toast.loading("Stopping lab instance...")

            try {
                const token = getToken()
                const url = `${API_BASE_URL}/lab-instances/${instanceId}/stop`

                const response = await fetch(url, {
                    method: "POST",
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
                        const msg = "Forbidden."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    if (response.status === 404) {
                        const errorData = await response.json().catch(() => ({}))
                        const msg = errorData.detail || "Instance not found"
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const msg = `Failed to stop instance: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const instance: LabInstance = await response.json()

                toast.dismiss(loadingToast)
                toast.success("Instance stopped", {
                    description: instance.vm_name || instance.id,
                })

                return instance
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to stop lab instance"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden." ||
                    message.includes("Instance not found") ||
                    message.includes("Failed to stop instance")

                if (!alreadyHandled) {
                    toast.dismiss(loadingToast)
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
    // DELETE /lab-instances/{instance_id} — Terminate instance
    // -------------------------------------------------------------------------
    const terminateInstance = useCallback(
        async (instanceId: string): Promise<LabInstance> => {   // CHANGED: void → LabInstance
            setIsLoading(true)
            setError(null)

            const loadingToast = toast.loading("Terminating lab instance...")

            try {
                const token = getToken()
                const url = `${API_BASE_URL}/lab-instances/${instanceId}/admin`

                const response = await fetch(url, {
                    method: "DELETE",
                    headers: {
                        Accept: "application/json",              // NEW
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
                        const msg = "Forbidden."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    if (response.status === 404) {
                        const errorData = await response.json().catch(() => ({}))
                        const msg = errorData.detail || "Instance not found"
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    if (response.status === 502) {
                        const errorData = await response.json().catch(() => ({}))
                        const msg = errorData.detail || "External service error"
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const msg = `Failed to terminate instance: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                // CHANGED: parse the 202 body instead of ignoring it
                const instance: LabInstance = await response.json()

                toast.dismiss(loadingToast)
                toast.success("Instance terminating", {
                    description: instance.vm_name || instance.id,
                })

                return instance
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to terminate lab instance"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden." ||
                    message.includes("Instance not found") ||
                    message.includes("External service error") ||
                    message.includes("Failed to terminate instance")

                if (!alreadyHandled) {
                    toast.dismiss(loadingToast)
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
        launchLabInstance,
        listMyInstances,
        getInstance,
        refreshInstanceStatus,
        stopInstance,
        terminateInstance,
        isLoading,
        error,
        resetError,
    }
}