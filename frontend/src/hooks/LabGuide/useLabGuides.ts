// src/hooks/LabGuide/useLabGuides.ts
import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import type {
    LabGuide,
    LabGuideListItem,
    LabGuideCreateRequest,
    LabGuideUpdateRequest,
    AssignGuideRequest,
} from "@/types/LabGuide"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface UseLabGuidesReturn {
    guides: LabGuideListItem[]
    guide: LabGuide | null
    isLoading: boolean
    isSubmitting: boolean
    error: string | null
    refetch: () => void
    fetchGuide: (guideId: string) => Promise<LabGuide>
    createGuide: (data: LabGuideCreateRequest) => Promise<string | undefined>
    updateGuide: (guideId: string, data: LabGuideUpdateRequest) => Promise<void>
    deleteGuide: (guideId: string) => Promise<void>
    assignGuide: (guideId: string, data: AssignGuideRequest) => Promise<void>
}

export function useLabGuides(): UseLabGuidesReturn {
    const [guides, setGuides] = useState<LabGuideListItem[]>([])
    const [guide, setGuide] = useState<LabGuide | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getToken = () => localStorage.getItem("access_token")

    const fetchGuides = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/lab-guides`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            })

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Unauthorized. Please log in.")
                }
                if (response.status === 403) {
                    throw new Error("Forbidden.")
                }
                const errorText = await response.text()
                throw new Error(`Failed to fetch guides: ${errorText}`)
            }

            const data: LabGuideListItem[] = await response.json()
            setGuides(data)
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load guides"
            setError(message)
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const fetchGuide = useCallback(async (guideId: string) => {
        setIsLoading(true)
        setError(null)

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/lab-guides/${guideId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            })

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Unauthorized")
                }
                if (response.status === 403) {
                    throw new Error("You do not have access to this guide")
                }
                if (response.status === 404) {
                    throw new Error("Guide not found")
                }
                const errorText = await response.text()
                throw new Error(`Failed to fetch guide: ${errorText}`)
            }

            const data: LabGuide = await response.json()
            setGuide(data)
            return data
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load guide"
            setError(message)
            toast.error(message)
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    const createGuide = useCallback(async (data: LabGuideCreateRequest) => {
        setIsSubmitting(true)
        const loadingToast = toast.loading("Creating guide...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/lab-guides`, {
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
                const errorText = await response.text()
                const msg = `Failed to create guide: ${errorText}`
                toast.error(msg)
                throw new Error(msg)
            }

            const result: LabGuide = await response.json()
            toast.success(`Guide "${result.title}" created`)
            await fetchGuides()
            return result.id
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to create guide"
            toast.dismiss(loadingToast)
            toast.error(message)
            throw new Error(message)
        } finally {
            setIsSubmitting(false)
        }
    }, [fetchGuides])

    const updateGuide = useCallback(async (guideId: string, data: LabGuideUpdateRequest) => {
        setIsSubmitting(true)
        const loadingToast = toast.loading("Updating guide...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/lab-guides/${guideId}`, {
                method: "PUT",
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
                if (response.status === 404) {
                    toast.error("Guide not found")
                    throw new Error("Guide not found")
                }
                const errorText = await response.text()
                const msg = `Failed to update guide: ${errorText}`
                toast.error(msg)
                throw new Error(msg)
            }

            const result: LabGuide = await response.json()
            toast.success(`Guide "${result.title}" updated`)
            await fetchGuides()
            setGuide(result)
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update guide"
            toast.dismiss(loadingToast)
            toast.error(message)
            throw new Error(message)
        } finally {
            setIsSubmitting(false)
        }
    }, [fetchGuides])

    const deleteGuide = useCallback(async (guideId: string) => {
        const loadingToast = toast.loading("Deleting guide...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/lab-guides/${guideId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
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
                if (response.status === 404) {
                    toast.error("Guide not found")
                    throw new Error("Guide not found")
                }
                if (response.status === 409) {
                    const errorData = await response.json().catch(() => ({}))
                    const msg = errorData.detail || "Guide is assigned to labs"
                    toast.error(msg)
                    throw new Error(msg)
                }
                const errorText = await response.text()
                throw new Error(`Failed to delete guide: ${errorText}`)
            }

            toast.success("Guide deleted")
            await fetchGuides()
            if (guide?.id === guideId) {
                setGuide(null)
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to delete guide"
            toast.error(message)
            throw new Error(message)
        }
    }, [fetchGuides, guide])

    const assignGuide = useCallback(async (guideId: string, data: AssignGuideRequest) => {
        setIsSubmitting(true)
        const loadingToast = toast.loading("Assigning guide...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/lab-guides/${guideId}/assign`, {
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
                if (response.status === 404) {
                    toast.error("Guide or lab not found")
                    throw new Error("Guide or lab not found")
                }
                const errorText = await response.text()
                throw new Error(`Failed to assign guide: ${errorText}`)
            }

            const result = await response.json()
            toast.success(result.message || "Guide assigned successfully")
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to assign guide"
            toast.dismiss(loadingToast)
            toast.error(message)
            throw new Error(message)
        } finally {
            setIsSubmitting(false)
        }
    }, [])

    useEffect(() => {
        fetchGuides()
    }, [fetchGuides])

    return {
        guides,
        guide,
        isLoading,
        isSubmitting,
        error,
        refetch: fetchGuides,
        fetchGuide,
        createGuide,
        updateGuide,
        deleteGuide,
        assignGuide,
    }
}
