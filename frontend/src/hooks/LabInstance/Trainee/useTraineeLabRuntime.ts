// src/hooks/LabInstance/Trainee/useTraineeLabRuntime.ts
import { useState, useCallback } from "react"
import { toast } from "sonner"
import type { LabInstanceRuntimeResponse } from "@/types/LabInstance/Trainee/LabRuntime"
import type { GuideVersion } from "@/types/LabGuide"
import type { MyLabInstance } from "@/types/LabInstance/Trainee/LabInstance"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface UseTraineeLabRuntimeReturn {
    refreshInstance: (instanceId: string) => Promise<LabInstanceRuntimeResponse>
    getGuideVersion: (instanceId: string) => Promise<GuideVersion>
    terminateInstance: (instanceId: string) => Promise<MyLabInstance>
    isLoading: boolean
    isRefreshing: boolean
    isLoadingGuide: boolean
    isTerminating: boolean
    error: string | null
    resetError: () => void
}

export function useTraineeLabRuntime(): UseTraineeLabRuntimeReturn {
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isLoadingGuide, setIsLoadingGuide] = useState(false)
    const [isTerminating, setIsTerminating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isLoading = isRefreshing || isLoadingGuide || isTerminating

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
    // POST /lab-instances/{instance_id}/refresh
    // -------------------------------------------------------------------------
    const refreshInstance = useCallback(
        async (instanceId: string): Promise<LabInstanceRuntimeResponse> => {
            setIsRefreshing(true)
            setError(null)

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
                    if (response.status === 504) {
                        const errorData = await response.json().catch(() => ({}))
                        const msg =
                            errorData.detail ||
                            "Refresh timed out while communicating with vCenter"
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const errorData = await response.json().catch(() => ({}))
                    const msg =
                        errorData.detail ||
                        `Failed to refresh instance: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const result: LabInstanceRuntimeResponse = await response.json()
                return result
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to refresh lab instance"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden — insufficient permissions." ||
                    message.includes("Instance not found") ||
                    message.includes("timed out") ||
                    message.includes("Failed to refresh instance")

                if (!alreadyHandled) {
                    toast.error(message)
                    setError(message)
                }

                throw new Error(message)
            } finally {
                setIsRefreshing(false)
            }
        },
        [getToken]
    )

    // -------------------------------------------------------------------------
    // GET /lab-instances/{instance_id}/guide-version
    // -------------------------------------------------------------------------
    const getGuideVersion = useCallback(
        async (instanceId: string): Promise<GuideVersion> => {
            setIsLoadingGuide(true)
            setError(null)

            try {
                const token = getToken()
                const url = `${API_BASE_URL}/lab-instances/${instanceId}/guide-version`

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
                        const msg = errorData.detail || "Guide version not found"
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const errorData = await response.json().catch(() => ({}))
                    const msg =
                        errorData.detail ||
                        `Failed to get guide version: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const result: GuideVersion = await response.json()
                return result
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Failed to get guide version"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden — insufficient permissions." ||
                    message.includes("Guide version not found") ||
                    message.includes("Failed to get guide version")

                if (!alreadyHandled) {
                    toast.error(message)
                    setError(message)
                }

                throw new Error(message)
            } finally {
                setIsLoadingGuide(false)
            }
        },
        [getToken]
    )

    // -------------------------------------------------------------------------
    // DELETE /lab-instances/{instance_id} — Terminate instance
    // -------------------------------------------------------------------------
    const terminateInstance = useCallback(
        async (instanceId: string): Promise<MyLabInstance> => {
            setIsTerminating(true)
            setError(null)

            const loadingToast = toast.loading("Terminating lab instance...")

            try {
                const token = getToken()
                const url = `${API_BASE_URL}/lab-instances/${instanceId}`

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

                const instance: MyLabInstance = await response.json()

                toast.dismiss(loadingToast)
                toast.success("Instance terminating", {
                    description: instance.lab_definition.name || instance.id,
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
                setIsTerminating(false)
            }
        },
        [getToken]
    )

    return {
        refreshInstance,
        getGuideVersion,
        terminateInstance,
        isLoading,
        isRefreshing,
        isLoadingGuide,
        isTerminating,
        error,
        resetError,
    }
}