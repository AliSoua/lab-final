// src/hooks/credentials/useCredentials.ts
import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import type { HostInfo, CredentialsCreateRequest, CredentialsUpdateRequest } from "@/types/credentials"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface UseCredentialsReturn {
    hosts: HostInfo[]
    isLoading: boolean
    isSubmitting: boolean
    error: string | null
    refetch: () => void
    createHost: (data: CredentialsCreateRequest) => Promise<void>
    updateHost: (currentHost: string, data: CredentialsUpdateRequest) => Promise<void>
    deleteHost: (host: string) => Promise<void>
}

export function useCredentials(): UseCredentialsReturn {
    const [hosts, setHosts] = useState<HostInfo[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getToken = () => localStorage.getItem("access_token")

    const fetchHosts = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/credentials/moderators/hosts`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json",
                },
            })

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Unauthorized. Please log in.")
                }
                if (response.status === 403) {
                    throw new Error("Forbidden. Moderator access required.")
                }
                const errorText = await response.text()
                throw new Error(`Failed to fetch hosts: ${errorText}`)
            }

            const data: HostInfo[] = await response.json()
            setHosts(data)
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load hosts"
            setError(message)
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const createHost = useCallback(async (data: CredentialsCreateRequest) => {
        setIsSubmitting(true)
        const loadingToast = toast.loading("Storing credentials...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/credentials/moderators/`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify(data),
            })

            toast.dismiss(loadingToast)

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Unauthorized. Please log in.")
                    throw new Error("Unauthorized")
                }
                if (response.status === 403) {
                    toast.error("Forbidden. Moderator access required.")
                    throw new Error("Forbidden")
                }
                if (response.status === 409) {
                    const errorData = await response.json().catch(() => ({}))
                    const msg = errorData.detail || "Credentials for this host already exist"
                    toast.error(msg)
                    throw new Error(msg)
                }
                const errorText = await response.text()
                const msg = `Failed to create: ${errorText}`
                toast.error(msg)
                throw new Error(msg)
            }

            const result: { message: string } = await response.json()
            toast.success(result.message)
            await fetchHosts()
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to store credentials"
            if (!message.includes("Unauthorized") && !message.includes("Forbidden") && !message.includes("already exist")) {
                toast.dismiss(loadingToast)
                toast.error(message)
            }
            throw new Error(message)
        } finally {
            setIsSubmitting(false)
        }
    }, [fetchHosts])

    const updateHost = useCallback(async (currentHost: string, data: CredentialsUpdateRequest) => {
        setIsSubmitting(true)
        const loadingToast = toast.loading("Updating credentials...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/credentials/moderators/hosts/${encodeURIComponent(currentHost)}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify(data),
            })

            toast.dismiss(loadingToast)

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Unauthorized. Please log in.")
                    throw new Error("Unauthorized")
                }
                if (response.status === 403) {
                    const errorData = await response.json().catch(() => ({}))
                    const msg = errorData.detail || "Old credentials do not match"
                    toast.error(msg)
                    throw new Error(msg)
                }
                if (response.status === 404) {
                    toast.error("Host not found")
                    throw new Error("Host not found")
                }
                if (response.status === 409) {
                    const errorData = await response.json().catch(() => ({}))
                    const msg = errorData.detail || "Host name conflict"
                    toast.error(msg)
                    throw new Error(msg)
                }
                const errorText = await response.text()
                const msg = `Failed to update: ${errorText}`
                toast.error(msg)
                throw new Error(msg)
            }

            const result: { message: string } = await response.json()
            toast.success(result.message)
            await fetchHosts()
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update credentials"
            const handled = message.includes("Unauthorized") || message.includes("match") || message.includes("not found") || message.includes("conflict")
            if (!handled) {
                toast.dismiss(loadingToast)
                toast.error(message)
            }
            throw new Error(message)
        } finally {
            setIsSubmitting(false)
        }
    }, [fetchHosts])

    const deleteHost = useCallback(async (host: string) => {
        const loadingToast = toast.loading("Removing credentials...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/credentials/moderators/hosts/${encodeURIComponent(host)}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            })

            toast.dismiss(loadingToast)

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Unauthorized")
                    throw new Error("Unauthorized")
                }
                if (response.status === 404) {
                    toast.error("Host not found")
                    throw new Error("Host not found")
                }
                const errorText = await response.text()
                throw new Error(`Failed to delete: ${errorText}`)
            }

            toast.success(`Credentials for ${host} removed`)
            await fetchHosts()
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to delete credentials"
            toast.error(message)
            throw new Error(message)
        }
    }, [fetchHosts])

    useEffect(() => {
        fetchHosts()
    }, [fetchHosts])

    return {
        hosts,
        isLoading,
        isSubmitting,
        error,
        refetch: fetchHosts,
        createHost,
        updateHost,
        deleteHost,
    }
}