// src/hooks/LabInstance/admin/useMonitorEvents.ts
import { useState, useCallback } from "react"
import { toast } from "sonner"
import type {
    MonitoringEventsList,
    MonitoringEventsQuery,
} from "@/types/LabInstance/admin/MonitoringEvents"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function useMonitorEvents() {
    const [events, setEvents] = useState<MonitoringEventsList["items"]>([])
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

    const fetchMonitoringEvents = useCallback(
        async (query: MonitoringEventsQuery = {}) => {
            setIsLoading(true)
            setError(null)

            try {
                const token = getToken()
                const params = new URLSearchParams()

                if (query.event_type) params.append("event_type", query.event_type)
                if (query.instance_id) params.append("instance_id", query.instance_id)
                if (query.task_id) params.append("task_id", query.task_id)
                params.append("skip", (query.skip ?? 0).toString())
                params.append("limit", (query.limit ?? 100).toString())

                const url = `${API_BASE_URL}/lab-instances/monitoring/events/admin?${params.toString()}`

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
                    const msg = `Failed to list monitoring events: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const result: MonitoringEventsList = await response.json()
                setEvents(result.items)
                setTotal(result.total)
                return result
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Failed to list monitoring events"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden." ||
                    message.includes("Failed to list monitoring events")

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

    return { events, total, isLoading, error, fetchMonitoringEvents }
}