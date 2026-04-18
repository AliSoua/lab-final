// src/hooks/LabDefinition/useCreateSimpleLabs.ts
import { useState, useCallback } from "react"
import { toast } from "sonner"
import type {
    CreateSimpleLabDefinitionFormData,
    CreateSimpleLabDefinitionRequest
} from "@/types/LabDefinition/CreateSimpleLabDefinition"
import { toSimpleCreateRequest } from "@/types/LabDefinition/CreateSimpleLabDefinition"
import type { LabDefinition } from "@/types/LabDefinition/ListLabs"

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface UseCreateSimpleLabsReturn {
    createLab: (data: CreateSimpleLabDefinitionFormData) => Promise<LabDefinition>
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
        async (data: CreateSimpleLabDefinitionFormData): Promise<LabDefinition> => {
            setIsLoading(true)
            setError(null)

            const loadingToast = toast.loading("Creating lab definition...")

            try {
                const token = localStorage.getItem("access_token")

                if (!token) {
                    toast.dismiss(loadingToast)
                    toast.error("Authentication required")
                    throw new Error("Authentication required")
                }

                // Convert form data to API request format
                const requestData = toSimpleCreateRequest(data)

                const hasFile = data.thumbnail_file instanceof File
                const url = hasFile
                    ? `${API_BASE_URL}/lab-definitions/thumbnail`
                    : `${API_BASE_URL}/lab-definitions/`

                let response: Response

                if (hasFile) {
                    // Use FormData for file upload
                    const formData = new FormData()
                    formData.append("name", requestData.name)
                    formData.append("slug", requestData.slug)
                    formData.append("description", requestData.description)
                    formData.append("short_description", requestData.short_description || "")
                    formData.append("duration_minutes", requestData.duration_minutes.toString())
                    formData.append("max_concurrent_users", (requestData.max_concurrent_users ?? 1).toString())
                    formData.append("cooldown_minutes", (requestData.cooldown_minutes ?? 0).toString())
                    formData.append("difficulty", requestData.difficulty)
                    formData.append("category", requestData.category)

                    if (requestData.track) {
                        formData.append("track", requestData.track)
                    }

                    // Arrays as JSON strings - map from StringFieldItem[] to string[]
                    formData.append("objectives", JSON.stringify(requestData.objectives || []))
                    formData.append("prerequisites", JSON.stringify(requestData.prerequisites || []))
                    formData.append("tags", JSON.stringify(requestData.tags || []))

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
                    const jsonData: CreateSimpleLabDefinitionRequest = {
                        ...requestData,
                        thumbnail_url: data.thumbnail_url || undefined
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
                    // Dismiss loading toast before showing error
                    toast.dismiss(loadingToast)

                    if (response.status === 401) {
                        const msg = "Unauthorized. Please log in."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    if (response.status === 403) {
                        const msg = "Forbidden. Admin or moderator access required."
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    if (response.status === 409) {
                        const errorData = await response.json().catch(() => ({}))
                        const msg = errorData.detail || "Lab with this slug already exists"
                        toast.error(msg)
                        setError(null) // Prevent inline UI error for 409 conflicts
                        throw new Error(msg)
                    }
                    if (response.status === 422) {
                        const errorData = await response.json().catch(() => ({}))
                        const detail = errorData.detail?.[0]?.msg || "Validation error"
                        const msg = `Validation error: ${detail}`
                        toast.error(msg)
                        throw new Error(msg)
                    }
                    const errorText = await response.text()
                    const msg = `Failed to create lab: ${errorText}`
                    toast.error(msg)
                    throw new Error(msg)
                }

                const createdLab: LabDefinition = await response.json()

                // Dismiss loading and show success
                toast.dismiss(loadingToast)
                toast.success("Lab created successfully!", {
                    description: createdLab.name
                })

                return createdLab

            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to create lab definition"

                // Avoid double-toasting for response errors already handled above
                const alreadyHandled =
                    message === "Authentication required" ||
                    message === "Unauthorized. Please log in." ||
                    message === "Forbidden. Admin or moderator access required." ||
                    message.includes("already exists") ||
                    message.includes("Validation error") ||
                    message.includes("Failed to create lab")

                if (!alreadyHandled) {
                    toast.dismiss(loadingToast)
                    toast.error(message)
                    setError(message)
                }

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