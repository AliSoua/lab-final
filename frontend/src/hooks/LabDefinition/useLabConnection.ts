// src/hooks/LabDefinition/useLabConnection.ts
import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import type {
    LabConnectionCreateRequest,
    LabConnectionUpdateRequest,
    LabConnectionResponse,
    LabConnectionListItem,
    LabConnectionDetailResponse,
    LabConnectionGroupedItem,
    ConnectionProtocol,
} from "@/types/LabDefinition/LabConnection"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface UseLabConnectionReturn {
    connections: LabConnectionListItem[]
    grouped: LabConnectionGroupedItem[]
    isLoading: boolean
    isSubmitting: boolean
    error: string | null
    refetch: () => Promise<void>
    refetchGrouped: () => Promise<void>
    createConnection: (data: LabConnectionCreateRequest) => Promise<void>
    updateConnection: (connectionId: string, data: LabConnectionUpdateRequest) => Promise<void>
    deleteConnection: (connectionId: string) => Promise<void>
    getConnectionDetail: (connectionId: string) => Promise<LabConnectionDetailResponse | null>
    getAvailableProtocols: (slug: string) => ConnectionProtocol[]
}

export function useLabConnection(): UseLabConnectionReturn {
    const [connections, setConnections] = useState<LabConnectionListItem[]>([])
    const [grouped, setGrouped] = useState<LabConnectionGroupedItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getToken = () => localStorage.getItem("access_token")

    const fetchConnections = useCallback(
        async (search?: string, protocol?: ConnectionProtocol) => {
            setIsLoading(true)
            setError(null)
            try {
                const token = getToken()
                if (!token) throw new Error("Authentication required")

                const params = new URLSearchParams()
                if (search) params.append("search", search)
                if (protocol) params.append("protocol", protocol)

                const queryString = params.toString()
                const url = `${API_BASE_URL}/lab-definitions/lab-connections/${queryString ? `?${queryString}` : ""}`

                const response = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                })

                if (!response.ok) {
                    if (response.status === 401) throw new Error("Unauthorized. Please log in.")
                    if (response.status === 403) throw new Error("Forbidden.")
                    const errorText = await response.text()
                    throw new Error(`Failed to fetch connections: ${errorText}`)
                }

                const data: LabConnectionListItem[] = await response.json()
                setConnections(data)
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to load connections"
                setError(message)
                toast.error(message)
                throw err

            } finally {
                setIsLoading(false)
            }
        },
        []
    )

    const fetchGrouped = useCallback(
        async (search?: string) => {
            setIsLoading(true)
            setError(null)
            try {
                const token = getToken()
                if (!token) throw new Error("Authentication required")

                const params = new URLSearchParams()
                if (search) params.append("search", search)

                const url = `${API_BASE_URL}/lab-definitions/lab-connections/by-slug${params.toString() ? `?${params.toString()}` : ""}`

                const response = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                })

                if (!response.ok) {
                    if (response.status === 401) throw new Error("Unauthorized")
                    if (response.status === 403) throw new Error("Forbidden")
                    const errorText = await response.text()
                    throw new Error(`Failed to fetch grouped connections: ${errorText}`)
                }

                const data: LabConnectionGroupedItem[] = await response.json()
                setGrouped(data)
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to load grouped connections"
                setError(message)
                toast.error(message)
                throw err

            } finally {
                setIsLoading(false)
            }
        },
        []
    )

    const createConnection = useCallback(
        async (data: LabConnectionCreateRequest) => {
            setIsSubmitting(true)
            const loadingToast = toast.loading("Creating connection...")
            try {
                const token = getToken()
                if (!token) throw new Error("Authentication required")

                const response = await fetch(`${API_BASE_URL}/lab-definitions/lab-connections/`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(data),
                })

                toast.dismiss(loadingToast)

                if (!response.ok) {
                    if (response.status === 401) {
                        toast.error("Unauthorized")
                        throw new Error("Unauthorized")
                    }
                    if (response.status === 403) {
                        toast.error("Forbidden")
                        throw new Error("Forbidden")
                    }
                    if (response.status === 409) {
                        const errorData = await response.json().catch(() => ({}))
                        const msg = errorData.detail || "Connection already exists for this slug/protocol"
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const errorText = await response.text()
                    const msg = `Failed to create: ${errorText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const result: LabConnectionResponse = await response.json()
                toast.success(`Connection '${result.title}' created`)
                await fetchGrouped()
                await fetchConnections()
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to create connection"
                const handled = message.includes("Unauthorized") || message.includes("Forbidden") || message.includes("already exists")
                if (!handled) {
                    toast.dismiss(loadingToast)
                    toast.error(message)
                }
                throw new Error(message)
            } finally {
                setIsSubmitting(false)
            }
        },
        [fetchConnections, fetchGrouped]
    )

    const updateConnection = useCallback(
        async (connectionId: string, data: LabConnectionUpdateRequest) => {
            setIsSubmitting(true)
            const loadingToast = toast.loading("Updating connection...")
            try {
                const token = getToken()
                if (!token) throw new Error("Authentication required")

                const response = await fetch(
                    `${API_BASE_URL}/lab-definitions/lab-connections/${encodeURIComponent(connectionId)}`,
                    {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify(data),
                    }
                )

                toast.dismiss(loadingToast)

                if (!response.ok) {
                    if (response.status === 401) {
                        toast.error("Unauthorized")
                        throw new Error("Unauthorized")
                    }
                    if (response.status === 403) {
                        toast.error("Forbidden")
                        throw new Error("Forbidden")
                    }
                    if (response.status === 400) {
                        const errorData = await response.json().catch(() => ({}))
                        const msg = errorData.detail || "Invalid request"
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    if (response.status === 404) {
                        toast.error("Connection not found")
                        throw new Error("Connection not found")
                    }
                    if (response.status === 409) {
                        const errorData = await response.json().catch(() => ({}))
                        const msg = errorData.detail || "Conflict"
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const errorText = await response.text()
                    const msg = `Failed to update: ${errorText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const result: LabConnectionResponse = await response.json()
                toast.success(`Connection '${result.title}' updated`)
                await fetchGrouped()
                await fetchConnections()
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to update connection"
                const handled =
                    message.includes("Unauthorized") ||
                    message.includes("Forbidden") ||
                    message.includes("not found") ||
                    message.includes("conflict") ||
                    message.includes("cannot be changed")
                if (!handled) {
                    toast.dismiss(loadingToast)
                    toast.error(message)
                }
                throw new Error(message)
            } finally {
                setIsSubmitting(false)
            }
        },
        [fetchConnections, fetchGrouped]
    )

    const deleteConnection = useCallback(
        async (connectionId: string) => {
            const loadingToast = toast.loading("Removing connection...")
            try {
                const token = getToken()
                if (!token) throw new Error("Authentication required")

                const response = await fetch(
                    `${API_BASE_URL}/lab-definitions/lab-connections/${encodeURIComponent(connectionId)}`,
                    {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                    }
                )

                toast.dismiss(loadingToast)

                if (!response.ok) {
                    if (response.status === 401) {
                        toast.error("Unauthorized")
                        throw new Error("Unauthorized")
                    }
                    if (response.status === 404) {
                        toast.error("Connection not found")
                        throw new Error("Connection not found")
                    }
                    const errorText = await response.text()
                    throw new Error(`Failed to delete: ${errorText}`)
                }

                toast.success("Connection removed")
                await fetchGrouped()
                await fetchConnections()
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to delete connection"
                toast.error(message)
                throw new Error(message)
            }
        },
        [fetchConnections, fetchGrouped]
    )

    const getConnectionDetail = useCallback(
        async (connectionId: string): Promise<LabConnectionDetailResponse | null> => {
            try {
                const token = getToken()
                if (!token) throw new Error("Authentication required")

                const response = await fetch(
                    `${API_BASE_URL}/lab-definitions/lab-connections/${encodeURIComponent(connectionId)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: "application/json",
                        },
                    }
                )

                if (!response.ok) {
                    if (response.status === 401) throw new Error("Unauthorized")
                    if (response.status === 403) throw new Error("Forbidden")
                    if (response.status === 404) throw new Error("Connection not found")
                    const errorText = await response.text()
                    throw new Error(`Failed to fetch detail: ${errorText}`)
                }

                return (await response.json()) as LabConnectionDetailResponse
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to load connection detail"
                toast.error(message)
                return null
            }
        },
        []
    )

    const getAvailableProtocols = useCallback(
        (slug: string): ConnectionProtocol[] => {
            const group = grouped.find((g) => g.slug === slug)
            const used = new Set(group?.connections.map((c) => c.protocol) || [])
            return (["ssh", "rdp", "vnc"] as ConnectionProtocol[]).filter((p) => !used.has(p))
        },
        [grouped]
    )

    useEffect(() => {
        fetchConnections()
        fetchGrouped()
    }, [fetchConnections, fetchGrouped])

    return {
        connections,
        grouped,
        isLoading,
        isSubmitting,
        error,
        refetch: fetchConnections,
        refetchGrouped: fetchGrouped,
        createConnection,
        updateConnection,
        deleteConnection,
        getConnectionDetail,
        getAvailableProtocols,
    }
}