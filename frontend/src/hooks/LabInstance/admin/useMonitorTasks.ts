// src/hooks/LabInstance/admin/useMonitorTasks.ts
import { useState, useCallback } from "react"
import { toast } from "sonner"
import type {
    MonitoringTasksList,
    MonitoringTasksQuery,
} from "@/types/LabInstance/admin/MonitoringTasks"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function useMonitorTasks() {
    const [tasks, setTasks] = useState<MonitoringTasksList["items"]>([])
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

    const fetchMonitoringTasks = useCallback(
        async (query: MonitoringTasksQuery = {}) => {
            setIsLoading(true)
            setError(null)

            try {
                const token = getToken()
                const params = new URLSearchParams()

                if (query.task_type) params.append("task_type", query.task_type)
                if (query.status) params.append("status", query.status)
                if (query.instance_id) params.append("instance_id", query.instance_id)
                params.append("skip", (query.skip ?? 0).toString())
                params.append("limit", (query.limit ?? 100).toString())

                const url = `${API_BASE_URL}/lab-instances/monitoring/tasks/admin?${params.toString()}`

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
                    const msg = `Failed to list monitoring tasks: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const result: MonitoringTasksList = await response.json()
                setTasks(result.items)
                setTotal(result.total)
                return result
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Failed to list monitoring tasks"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden." ||
                    message.includes("Failed to list monitoring tasks")

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

    return { tasks, total, isLoading, error, fetchMonitoringTasks }
}