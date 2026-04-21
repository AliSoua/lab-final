// src/hooks/LabGuide/useGuideVersions.ts
import { useState, useCallback } from "react"
import { toast } from "sonner"
import type {
    GuideVersion,
    GuideVersionListItem,
    GuideVersionCreateRequest,
} from "@/types/LabGuide"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface UseGuideVersionsReturn {
    versions: GuideVersionListItem[]
    version: GuideVersion | null
    isSubmitting: boolean
    isLoading: boolean
    error: string | null
    fetchVersions: (guideId: string) => Promise<GuideVersionListItem[]>
    fetchVersion: (guideId: string, versionId: string) => Promise<GuideVersion>
    createVersion: (guideId: string, data: GuideVersionCreateRequest) => Promise<GuideVersion | undefined>
    publishVersion: (guideId: string, versionId: string) => Promise<GuideVersion | undefined>
    setCurrentVersion: (guideId: string, versionId: string) => Promise<void>
    deleteVersion: (guideId: string, versionId: string) => Promise<void>
}

export function useGuideVersions(): UseGuideVersionsReturn {
    const [versions, setVersions] = useState<GuideVersionListItem[]>([])
    const [version, setVersion] = useState<GuideVersion | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getToken = () => localStorage.getItem("access_token")

    const fetchVersions = useCallback(async (guideId: string) => {
        setIsLoading(true)
        setError(null)

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/lab-guides/${guideId}/versions`, {
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
                    throw new Error("Forbidden")
                }
                if (response.status === 404) {
                    throw new Error("Guide not found")
                }
                const errorText = await response.text()
                throw new Error(`Failed to fetch versions: ${errorText}`)
            }

            const data: GuideVersionListItem[] = await response.json()
            setVersions(data)
            return data
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load versions"
            setError(message)
            toast.error(message)
            throw new Error(message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const fetchVersion = useCallback(async (guideId: string, versionId: string) => {
        setIsLoading(true)
        setError(null)

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(
                `${API_BASE_URL}/lab-guides/${guideId}/versions/${versionId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            )

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Unauthorized")
                }
                if (response.status === 403) {
                    throw new Error("You do not have access to this version")
                }
                if (response.status === 404) {
                    throw new Error("Version not found")
                }
                const errorText = await response.text()
                throw new Error(`Failed to fetch version: ${errorText}`)
            }

            const data: GuideVersion = await response.json()
            setVersion(data)
            return data
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load version"
            setError(message)
            toast.error(message)
            throw new Error(message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const createVersion = useCallback(async (guideId: string, data: GuideVersionCreateRequest) => {
        setIsSubmitting(true)
        setError(null)
        const loadingToast = toast.loading("Creating version...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(`${API_BASE_URL}/lab-guides/${guideId}/versions`, {
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
                    throw new Error("Unauthorized")
                }
                if (response.status === 403) {
                    throw new Error("Forbidden")
                }
                if (response.status === 404) {
                    throw new Error("Guide not found")
                }
                const errorText = await response.text()
                throw new Error(`Failed to create version: ${errorText}`)
            }

            const result: GuideVersion = await response.json()
            toast.success(`Version ${result.version_number} created`)
            setVersions((prev) => [
                ...prev,
                {
                    id: result.id,
                    version_number: result.version_number,
                    is_published: result.is_published,
                    created_at: result.created_at,
                    step_count: result.step_count,
                },
            ])
            return result
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to create version"
            setError(message)
            toast.error(message)
            throw new Error(message)
        } finally {
            setIsSubmitting(false)
        }
    }, [])

    const publishVersion = useCallback(async (guideId: string, versionId: string) => {
        setIsSubmitting(true)
        setError(null)
        const loadingToast = toast.loading("Publishing version...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(
                `${API_BASE_URL}/lab-guides/${guideId}/versions/${versionId}/publish`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            )

            toast.dismiss(loadingToast)

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Unauthorized")
                }
                if (response.status === 403) {
                    throw new Error("Forbidden")
                }
                if (response.status === 404) {
                    throw new Error("Version not found")
                }
                const errorText = await response.text()
                throw new Error(`Failed to publish version: ${errorText}`)
            }

            const result: GuideVersion = await response.json()
            toast.success(`Version ${result.version_number} published`)
            setVersions((prev) =>
                prev.map((v) =>
                    v.id === versionId ? { ...v, is_published: true } : v
                )
            )
            return result
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to publish version"
            setError(message)
            toast.error(message)
            throw new Error(message)
        } finally {
            setIsSubmitting(false)
        }
    }, [])

    const setCurrentVersion = useCallback(async (guideId: string, versionId: string) => {
        setIsSubmitting(true)
        setError(null)
        const loadingToast = toast.loading("Setting current version...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(
                `${API_BASE_URL}/lab-guides/${guideId}/versions/${versionId}/set-current`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            )

            toast.dismiss(loadingToast)

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Unauthorized")
                }
                if (response.status === 403) {
                    throw new Error("Forbidden")
                }
                if (response.status === 404) {
                    throw new Error("Version not found")
                }
                const errorText = await response.text()
                throw new Error(`Failed to set current version: ${errorText}`)
            }

            toast.success("Current version updated")
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to set current version"
            setError(message)
            toast.error(message)
            throw new Error(message)
        } finally {
            setIsSubmitting(false)
        }
    }, [])

    const deleteVersion = useCallback(async (guideId: string, versionId: string) => {
        setError(null)
        const loadingToast = toast.loading("Deleting version...")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("Authentication required")
            }

            const response = await fetch(
                `${API_BASE_URL}/lab-guides/${guideId}/versions/${versionId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            toast.dismiss(loadingToast)

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Unauthorized")
                }
                if (response.status === 403) {
                    throw new Error("Forbidden")
                }
                if (response.status === 404) {
                    throw new Error("Version not found")
                }
                if (response.status === 409) {
                    const errorData = await response.json().catch(() => ({}))
                    const msg = errorData.detail || "Version is assigned to labs"
                    toast.error(msg)
                    throw new Error(msg)
                }
                const errorText = await response.text()
                throw new Error(`Failed to delete version: ${errorText}`)
            }

            toast.success("Version deleted")
            setVersions((prev) => prev.filter((v) => v.id !== versionId))
            if (version?.id === versionId) {
                setVersion(null)
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to delete version"
            toast.error(message)
            throw new Error(message)
        }
    }, [version])

    return {
        versions,
        version,
        isSubmitting,
        isLoading,
        error,
        fetchVersions,
        fetchVersion,
        createVersion,
        publishVersion,
        setCurrentVersion,
        deleteVersion,
    }
}