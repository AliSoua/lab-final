// src/hooks/LabDefinition/useCreateFullLabs.ts
import { useState, useCallback } from "react"
import type {
    CreateFullLabDefinitionRequest,
    CreateFullLabDefinitionFormData
} from "@/types/LabDefinition/CreateFullLabDefinition"
import type { LabDefinition } from "@/types/LabDefinition"

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface UseCreateFullLabsReturn {
    createFullLab: (data: CreateFullLabDefinitionFormData) => Promise<LabDefinition>
    isLoading: boolean
    error: string | null
    resetError: () => void
}

/**
 * Hook to create a full lab definition with VMs and Guide Blocks
 * 
 * Uses two separate endpoints:
 * - POST /lab-definitions/full (JSON, no image)
 * - POST /lab-definitions/full/thumbnail (FormData, with image)
 * 
 * @returns Create function, loading state, error, and reset function
 */
export function useCreateFullLabs(): UseCreateFullLabsReturn {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const resetError = useCallback(() => {
        setError(null)
    }, [])

    const createFullLab = useCallback(
        async (data: CreateFullLabDefinitionFormData): Promise<LabDefinition> => {
            setIsLoading(true)
            setError(null)

            try {
                const token = localStorage.getItem("access_token")

                if (!token) {
                    throw new Error("Authentication required")
                }

                const hasFile = data.thumbnail_file instanceof File
                const url = hasFile
                    ? `${API_BASE_URL}/lab-definitions/full/thumbnail`
                    : `${API_BASE_URL}/lab-definitions/full`

                let response: Response

                if (hasFile) {
                    // Use FormData for file upload → /full/thumbnail
                    const formData = new FormData()
                    formData.append("name", data.name)
                    formData.append("slug", data.slug)
                    formData.append("description", data.description)
                    formData.append("short_description", data.short_description || "")
                    formData.append("duration_minutes", data.duration_minutes.toString())
                    formData.append("max_concurrent_users", (data.max_concurrent_users ?? 1).toString())
                    formData.append("cooldown_minutes", (data.cooldown_minutes ?? 0).toString())
                    formData.append("difficulty", data.difficulty)
                    formData.append("category", data.category)

                    if (data.track) {
                        formData.append("track", data.track)
                    }

                    if (data.network_profile_id) {
                        formData.append("network_profile_id", data.network_profile_id)
                    }

                    // Arrays and objects as JSON strings
                    formData.append("objectives", JSON.stringify(data.objectives || []))
                    formData.append("prerequisites", JSON.stringify(data.prerequisites || []))
                    formData.append("tags", JSON.stringify(data.tags || []))
                    formData.append("vms", JSON.stringify(data.vms || []))
                    formData.append("guide_blocks", JSON.stringify(data.guide_blocks || []))

                    // Add the file (required for this endpoint)
                    if (data.thumbnail_file instanceof File) {
                        formData.append("thumbnail", data.thumbnail_file)
                    }

                    response = await fetch(url, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`
                            // Don't set Content-Type - browser sets it with boundary for FormData
                        },
                        body: formData
                    })
                } else {
                    // Use JSON for regular request (no file) → /full
                    const { thumbnail_file, ...jsonData } = data

                    const requestBody: CreateFullLabDefinitionRequest = {
                        name: jsonData.name,
                        slug: jsonData.slug,
                        description: jsonData.description,
                        short_description: jsonData.short_description,
                        category: jsonData.category as import("@/types/LabDefinition/CreateFullLabDefinition").LabCategory,
                        difficulty: jsonData.difficulty as import("@/types/LabDefinition/CreateFullLabDefinition").LabDifficulty,
                        duration_minutes: jsonData.duration_minutes,
                        max_concurrent_users: jsonData.max_concurrent_users,
                        cooldown_minutes: jsonData.cooldown_minutes,
                        track: jsonData.track || undefined,
                        thumbnail_url: jsonData.thumbnail_url || undefined,
                        status: jsonData.status,
                        objectives: jsonData.objectives,
                        prerequisites: jsonData.prerequisites,
                        tags: jsonData.tags,
                        network_profile_id: jsonData.network_profile_id || undefined,
                        vms: jsonData.vms,
                        guide_blocks: jsonData.guide_blocks,
                        // featured fields use defaults from backend (is_featured=false, featured_priority=0)
                    }

                    response = await fetch(url, {
                        method: "POST",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify(requestBody)
                    })
                }

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error("Unauthorized. Please log in.")
                    }
                    if (response.status === 403) {
                        throw new Error("Forbidden. Admin or moderator access required.")
                    }
                    if (response.status === 409) {
                        const errorData = await response.json()
                        throw new Error(errorData.detail || "Lab with this slug already exists")
                    }
                    if (response.status === 422) {
                        const errorData = await response.json()
                        const detail = errorData.detail?.[0]?.msg || "Validation error"
                        throw new Error(`Validation error: ${detail}`)
                    }
                    throw new Error(`Failed to create lab: ${response.statusText}`)
                }

                const createdLab: LabDefinition = await response.json()
                return createdLab
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to create lab definition"
                setError(message)
                throw new Error(message)
            } finally {
                setIsLoading(false)
            }
        },
        []
    )

    return {
        createFullLab,
        isLoading,
        error,
        resetError,
    }
}