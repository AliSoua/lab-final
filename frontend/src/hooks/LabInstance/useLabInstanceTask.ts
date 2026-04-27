// src/hooks/LabInstance/useLabInstanceTask.ts
import { useState, useCallback } from "react"
import { toast } from "sonner"
import type { LabInstanceTask, LabInstanceTaskList } from "@/types/LabInstance/LabInstanceTask"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function useLabInstanceTask() {
    const [tasks, setTasks] = useState<LabInstanceTask[]>([])
    const [task, setTask] = useState<LabInstanceTask | null>(null)
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

    const fetchTasks = useCallback(
        async (instanceId: string, skip = 0, limit = 100) => {
            setIsLoading(true)
            setError(null)

            try {
                const token = getToken()
                const params = new URLSearchParams()
                params.append("skip", skip.toString())
                params.append("limit", limit.toString())

                const url = `${API_BASE_URL}/lab-instances/${instanceId}/tasks?${params.toString()}`

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
                        const msg = "Instance or tasks not found."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const msg = `Failed to list tasks: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const result: LabInstanceTaskList = await response.json()
                setTasks(result.items)
                setTotal(result.total)
                return result
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to list tasks"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden." ||
                    message === "Instance or tasks not found." ||
                    message.includes("Failed to list tasks")

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

    const fetchTask = useCallback(
        async (instanceId: string, taskId: string) => {
            setIsLoading(true)
            setError(null)

            try {
                const token = getToken()

                const url = `${API_BASE_URL}/lab-instances/${instanceId}/tasks/${taskId}`

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
                        const msg = "Instance or task not found."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const msg = `Failed to get task: ${response.statusText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const result: LabInstanceTask = await response.json()
                setTask(result)
                return result
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to get task"

                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden." ||
                    message === "Instance or task not found." ||
                    message.includes("Failed to get task")

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

    return { tasks, task, total, isLoading, error, fetchTasks, fetchTask }
}