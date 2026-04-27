// src/hooks/LabInstance/useLabInstanceEvent.ts
import { useState, useCallback } from "react"
import { toast } from "sonner"
import type { LabInstanceEventLog, LabInstanceEventLogList } from "@/types/LabInstance/LabInstanceEvent"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function useLabInstanceEvent() {
    const [events, setEvents] = useState<LabInstanceEventLog[]>([])
    const [total, setTotal] = useState(0)
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

    const fetchEvents = useCallback(
        async (instanceId: string, skip = 0, limit = 100) => {
            setIsLoading(true)
            setError(null)

            try {
                const token = getToken()
                const params = new URLSearchParams()
                params.append("skip", skip.toString())
                params.append("limit", limit.toString())

                const url = `${API_BASE_URL}/lab-instances/${instanceId}/events/admin?${params.toString()}`

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
                        const msg = "Instance or events not found."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const msg = `Failed to list events: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const result: LabInstanceEventLogList = await response.json()
                setEvents(result.items)
                setTotal(result.total)
                return result
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to list events"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden." ||
                    message === "Instance or events not found." ||
                    message.includes("Failed to list events")

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

    return { events, total, isLoading, error, fetchEvents }
}