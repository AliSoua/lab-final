// src/hooks/LabDefinition/useVMTemplates.ts
import { useState, useCallback } from "react"
import { toast } from "sonner"

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL

// =============================================================================
// TYPES
// =============================================================================

export interface VMTemplate {
    uuid: string
    name: string
    guest_os: string
    cpu_count: number
    memory_mb: number
    path: string
    datacenter: string
    cluster: string
    host: string
}

export interface VCenterTemplatesResponse {
    vcenter_host: string
    admin_id: string
    templates: VMTemplate[]
    count: number
    error?: string
}

interface UseVMTemplatesReturn {
    templates: VMTemplate[]
    vcenters: VCenterTemplatesResponse[]
    isLoading: boolean
    error: string | null
    fetchTemplates: () => Promise<VMTemplate[]>
    resetError: () => void
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to fetch VM templates from all registered vCenter servers.
 * 
 * Calls GET /credentials/moderators/vcenters/templates
 * which aggregates templates from all admin-registered vCenters.
 * 
 * @returns Templates array, vCenter groupings, loading state, error, and fetch function
 */
export function useVMTemplates(): UseVMTemplatesReturn {
    const [templates, setTemplates] = useState<VMTemplate[]>([])
    const [vcenters, setVcenters] = useState<VCenterTemplatesResponse[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const resetError = useCallback(() => {
        setError(null)
    }, [])

    const fetchTemplates = useCallback(async (): Promise<VMTemplate[]> => {
        setIsLoading(true)
        setError(null)

        const loadingToast = toast.loading("Fetching VM templates...")

        try {
            const token = localStorage.getItem("access_token")

            if (!token) {
                toast.dismiss(loadingToast)
                toast.error("Authentication required")
                throw new Error("Authentication required")
            }

            const url = `${API_BASE_URL}/credentials/moderators/vcenters/templates`

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!response.ok) {
                toast.dismiss(loadingToast)

                if (response.status === 401) {
                    const msg = "Unauthorized. Please log in."
                    toast.error(msg)
                    throw new Error(msg)
                }
                if (response.status === 403) {
                    const msg = "Forbidden. Moderator access required."
                    toast.error(msg)
                    throw new Error(msg)
                }
                if (response.status === 404) {
                    const msg = "No vCenter credentials found."
                    toast.error(msg)
                    throw new Error(msg)
                }

                const msg = `Failed to fetch templates: ${response.statusText}`
                toast.error(msg)
                throw new Error(msg)
            }

            const data: VCenterTemplatesResponse[] = await response.json()

            // Flatten all templates from all vCenters
            const allTemplates: VMTemplate[] = data.flatMap(
                vc => vc.templates.map(t => ({
                    ...t,
                    // Ensure host field is set to vcenter_host if not present
                    host: t.host || vc.vcenter_host
                }))
            )

            setVcenters(data)
            setTemplates(allTemplates)

            toast.dismiss(loadingToast)
            toast.success(`Loaded ${allTemplates.length} templates from ${data.length} vCenters`)

            return allTemplates

        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to fetch VM templates"

            const alreadyHandled =
                message === "Authentication required" ||
                message === "Unauthorized. Please log in." ||
                message === "Forbidden. Moderator access required." ||
                message === "No vCenter credentials found." ||
                message.includes("Failed to fetch templates")

            if (!alreadyHandled) {
                toast.dismiss(loadingToast)
                toast.error(message)
            }

            setError(message)
            throw new Error(message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    return {
        templates,
        vcenters,
        isLoading,
        error,
        fetchTemplates,
        resetError,
    }
}