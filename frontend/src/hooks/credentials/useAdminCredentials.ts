// frontend/src/hooks/credentials/useAdminCredentials.ts
import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import type {
    VCenterInfo,
    VCenterCredentialsCreateRequest,
    VCenterCredentialsUpdateRequest,
} from "@/types/credentials/admin"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface UseAdminCredentialsReturn {
    vcenters: VCenterInfo[]
    isLoading: boolean
    isSubmitting: boolean
    error: string | null
    refetch: () => void
    createVCenter: (data: VCenterCredentialsCreateRequest) => Promise<void>
    updateVCenter: (currentHost: string, data: VCenterCredentialsUpdateRequest) => Promise<void>
    deleteVCenter: (host: string) => Promise<void>
}

export function useAdminCredentials(): UseAdminCredentialsReturn {
    const [vcenters, setVcenters] = useState<VCenterInfo[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getToken = () => localStorage.getItem("access_token")

    const fetchVcenters = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/credentials/admin/vcenters/hosts`, {
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
                    throw new Error("Forbidden. Admin access required.")
                }
                const errorText = await response.text()
                throw new Error(`Failed to fetch vCenters: ${errorText}`)
            }

            const data: VCenterInfo[] = await response.json()
            setVcenters(data)
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load vCenters"
            setError(message)
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const createVCenter = useCallback(async (data: VCenterCredentialsCreateRequest) => {
        setIsSubmitting(true)
        const loadingToast = toast.loading("Storing vCenter credentials...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/credentials/admin/vcenters/`, {
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
                    toast.error("Forbidden. Admin access required.")
                    throw new Error("Forbidden")
                }
                if (response.status === 409) {
                    const errorData = await response.json().catch(() => ({}))
                    const msg = errorData.detail || "Credentials for this vCenter already exist"
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
            await fetchVcenters()
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to store vCenter credentials"
            if (!message.includes("Unauthorized") && !message.includes("Forbidden") && !message.includes("already exist")) {
                toast.dismiss(loadingToast)
                toast.error(message)
            }
            throw new Error(message)
        } finally {
            setIsSubmitting(false)
        }
    }, [fetchVcenters])

    const updateVCenter = useCallback(async (currentHost: string, data: VCenterCredentialsUpdateRequest) => {
        setIsSubmitting(true)
        const loadingToast = toast.loading("Updating vCenter credentials...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(
                `${API_BASE_URL}/credentials/admin/vcenters/hosts/${encodeURIComponent(currentHost)}`,
                {
                    method: "PUT",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: JSON.stringify(data),
                }
            )

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
                    toast.error("vCenter not found")
                    throw new Error("vCenter not found")
                }
                if (response.status === 409) {
                    const errorData = await response.json().catch(() => ({}))
                    const msg = errorData.detail || "vCenter host name conflict"
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
            await fetchVcenters()
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update vCenter credentials"
            const handled =
                message.includes("Unauthorized") ||
                message.includes("match") ||
                message.includes("not found") ||
                message.includes("conflict")
            if (!handled) {
                toast.dismiss(loadingToast)
                toast.error(message)
            }
            throw new Error(message)
        } finally {
            setIsSubmitting(false)
        }
    }, [fetchVcenters])

    const deleteVCenter = useCallback(async (host: string) => {
        const loadingToast = toast.loading("Removing vCenter credentials...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(
                `${API_BASE_URL}/credentials/admin/vcenters/hosts/${encodeURIComponent(host)}`,
                {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                }
            )

            toast.dismiss(loadingToast)

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Unauthorized")
                    throw new Error("Unauthorized")
                }
                if (response.status === 404) {
                    toast.error("vCenter not found")
                    throw new Error("vCenter not found")
                }
                const errorText = await response.text()
                throw new Error(`Failed to delete: ${errorText}`)
            }

            toast.success(`Credentials for ${host} removed`)
            await fetchVcenters()
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to delete vCenter credentials"
            toast.error(message)
            throw new Error(message)
        }
    }, [fetchVcenters])

    useEffect(() => {
        fetchVcenters()
    }, [fetchVcenters])

    return {
        vcenters,
        isLoading,
        isSubmitting,
        error,
        refetch: fetchVcenters,
        createVCenter,
        updateVCenter,
        deleteVCenter,
    }
}