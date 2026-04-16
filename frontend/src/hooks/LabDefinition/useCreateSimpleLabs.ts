// src/hooks/LabDefinition/useCreateSimpleLabs.ts
import { useState, useCallback } from "react"
import type { CreateSimpleLabDefinitionRequest } from "@/types/LabDefinition/CreateSimpleLabDefinition"
import type { LabDefinition } from "@/types/LabDefinition"

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface UseCreateSimpleLabsReturn {
    createLab: (data: CreateSimpleLabDefinitionRequest & { thumbnail_file?: File | null }) => Promise<LabDefinition>
    isLoading: boolean
    error: string | null
    resetError: () => void
}

/**
 * Hook to create a simple lab definition (basic info only, no VMs)
 * Hits POST /lab-definitions/ endpoint (requires admin or moderator role)
 * 
 * Supports both JSON (no image) and FormData (with image upload)
 * 
 * @returns Create function, loading state, error, and reset function
 * 
 * @example
 * ```tsx
 * const { createLab, isLoading, error } = useCreateSimpleLabs()
 * 
 * // Without image (JSON)
 * const newLab = await createLab({
 *   name: "NGINX Lab",
 *   slug: "nginx-lab",
 *   ...
 * })
 * 
 * // With image (FormData)
 * const newLab = await createLab({
 *   name: "NGINX Lab",
 *   slug: "nginx-lab",
 *   ...
 *   thumbnail_file: selectedFile
 * })
 * ```
 */
export function useCreateSimpleLabs(): UseCreateSimpleLabsReturn {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const resetError = useCallback(() => {
        setError(null)
    }, [])

    const createLab = useCallback(
        async (
            data: CreateSimpleLabDefinitionRequest & { thumbnail_file?: File | null }
        ): Promise<LabDefinition> => {
            setIsLoading(true)
            setError(null)

            try {
                const token = localStorage.getItem("access_token")

                if (!token) {
                    throw new Error("Authentication required")
                }

                const url = `${API_BASE_URL}/lab-definitions/`
                const hasFile = data.thumbnail_file instanceof File

                let response: Response

                if (hasFile) {
                    // Use FormData for file upload
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

                    // Arrays as JSON strings
                    formData.append("objectives", JSON.stringify(data.objectives || []))
                    formData.append("prerequisites", JSON.stringify(data.prerequisites || []))
                    formData.append("tags", JSON.stringify(data.tags || []))

                    // Add the file - this is the key difference
                    if (data.thumbnail_file instanceof File) {
                        formData.append("thumbnail", data.thumbnail_file)
                    }

                    response = await fetch(url, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`
                            // Note: Don't set Content-Type - browser sets it with boundary for FormData
                        },
                        body: formData
                    })
                } else {
                    // Use JSON for regular request (no file)
                    const { thumbnail_file, ...jsonData } = data

                    // If thumbnail_url exists, include it
                    if (data.thumbnail_url) {
                        (jsonData as CreateSimpleLabDefinitionRequest).thumbnail_url = data.thumbnail_url
                    }

                    response = await fetch(url, {
                        method: "POST",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify(jsonData)
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
                    const errorText = await response.text()
                    throw new Error(`Failed to create lab: ${errorText}`)
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
        createLab,
        isLoading,
        error,
        resetError,
    }
}