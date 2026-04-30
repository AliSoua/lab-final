// src/hooks/LabInstance/admin/useInstanceTerminate.ts
import { useState, useCallback } from "react"
import { toast } from "sonner"
import type { TerminateLabInstanceResponse } from "@/types/LabInstance/admin/TerminateLabInstance"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function useInstanceTerminate() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getToken = useCallback((): string => {
        const token = localStorage.getItem("access_token")
        if (!token) {
            toast.error("Authentication required")
            throw new Error("Authentication required")
        }
        return token
    }, [])

    const terminateInstance = useCallback(
        async (instanceId: string): Promise<TerminateLabInstanceResponse> => {
            setIsLoading(true)
            setError(null)

            try {
                const token = getToken()
                const url = `${API_BASE_URL}/lab-instances/${instanceId}/admin`

                const response = await fetch(url, {
                    method: "DELETE",
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
                        const msg = "Forbidden. Admin or moderator access required."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    if (response.status === 404) {
                        const msg = "Instance not found."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    if (response.status === 502) {
                        const msg = "Gateway error while terminating instance."
                        toast.error(msg)
                        throw new Error(msg)
                    }

                    const msg = `Failed to terminate instance: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const result: TerminateLabInstanceResponse = await response.json()
                toast.success("Instance termination initiated.")
                return result
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Failed to terminate instance"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden. Admin or moderator access required." ||
                    message === "Instance not found." ||
                    message === "Gateway error while terminating instance." ||
                    message.includes("Failed to terminate instance")

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

    return { isLoading, error, terminateInstance }
}