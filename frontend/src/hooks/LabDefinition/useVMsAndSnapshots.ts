// src/hooks/LabDefinition/useVMsAndSnapshots.ts

import { useState, useCallback } from "react"
import { toast } from "sonner"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// =============================================================================
// TYPES
// =============================================================================

export interface VMInfo {
    uuid: string
    name: string
    guest_os: string
    cpu_count: number
    memory_mb: number
    path: string | null
    datacenter: string | null
    cluster: string | null
    host: string | null
    has_snapshots: boolean
}

export interface VMSnapshot {
    name: string
    moid: string
    description: string
    create_time: string
    path: string
}

export interface ESXiHost {
    esxi_host: string
    username: string
}

interface UseVMsAndSnapshotsReturn {
    // ESXi hosts
    hosts: ESXiHost[]
    selectedHost: string | null
    isLoadingHosts: boolean

    // VMs
    vms: VMInfo[]
    selectedVM: VMInfo | null
    isLoadingVMs: boolean

    // Snapshots
    snapshots: VMSnapshot[]
    selectedSnapshot: VMSnapshot | null
    isLoadingSnapshots: boolean

    // Error
    error: string | null

    // Actions
    fetchHosts: () => Promise<ESXiHost[]>
    selectHost: (host: string) => void
    fetchVMs: (host: string) => Promise<VMInfo[]>
    selectVM: (vm: VMInfo | null) => void
    fetchSnapshots: (host: string, vmUuid: string) => Promise<VMSnapshot[]>
    selectSnapshot: (snapshot: VMSnapshot | null) => void
    reset: () => void
}

// =============================================================================
// HOOK
// =============================================================================

export function useVMsAndSnapshots(): UseVMsAndSnapshotsReturn {
    const [hosts, setHosts] = useState<ESXiHost[]>([])
    const [selectedHost, setSelectedHost] = useState<string | null>(null)
    const [isLoadingHosts, setIsLoadingHosts] = useState(false)

    const [vms, setVms] = useState<VMInfo[]>([])
    const [selectedVM, setSelectedVM] = useState<VMInfo | null>(null)
    const [isLoadingVMs, setIsLoadingVMs] = useState(false)

    const [snapshots, setSnapshots] = useState<VMSnapshot[]>([])
    const [selectedSnapshot, setSelectedSnapshot] = useState<VMSnapshot | null>(null)
    const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false)

    const [error, setError] = useState<string | null>(null)

    const getToken = () => localStorage.getItem("access_token")

    const fetchHosts = useCallback(async (): Promise<ESXiHost[]> => {
        setIsLoadingHosts(true)
        setError(null)

        try {
            const token = getToken()
            if (!token) throw new Error("Authentication required")

            const response = await fetch(`${API_BASE_URL}/credentials/moderators/hosts`, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                if (response.status === 401) throw new Error("Unauthorized. Please log in.")
                if (response.status === 403) throw new Error("Forbidden. Moderator access required.")
                throw new Error(`Failed to fetch hosts: ${response.statusText}`)
            }

            const data: ESXiHost[] = await response.json()
            setHosts(data)
            return data

        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to fetch ESXi hosts"
            setError(msg)
            toast.error(msg)
            throw new Error(msg)
        } finally {
            setIsLoadingHosts(false)
        }
    }, [])

    const selectHost = useCallback((host: string) => {
        setSelectedHost(host)
        setVms([])
        setSelectedVM(null)
        setSnapshots([])
        setSelectedSnapshot(null)
    }, [])

    const fetchVMs = useCallback(async (host: string): Promise<VMInfo[]> => {
        setIsLoadingVMs(true)
        setError(null)

        const loadingToast = toast.loading(`Fetching VMs on ${host}...`)

        try {
            const token = getToken()
            if (!token) throw new Error("Authentication required")

            const encodedHost = encodeURIComponent(host)
            const response = await fetch(
                `${API_BASE_URL}/credentials/moderators/hosts/${encodedHost}/vms`,
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                }
            )

            if (!response.ok) {
                toast.dismiss(loadingToast)
                if (response.status === 404) throw new Error("ESXi host not found or no vCenter managing it")
                throw new Error(`Failed to fetch VMs: ${response.statusText}`)
            }

            const data: VMInfo[] = await response.json()
            setVms(data)

            toast.dismiss(loadingToast)
            toast.success(`Found ${data.length} VMs on ${host}`)
            return data

        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to fetch VMs"
            toast.dismiss(loadingToast)
            toast.error(msg)
            setError(msg)
            throw new Error(msg)
        } finally {
            setIsLoadingVMs(false)
        }
    }, [])

    const selectVM = useCallback((vm: VMInfo | null) => {
        setSelectedVM(vm)
        setSnapshots([])
        setSelectedSnapshot(null)
    }, [])

    const fetchSnapshots = useCallback(async (host: string, vmUuid: string): Promise<VMSnapshot[]> => {
        setIsLoadingSnapshots(true)
        setError(null)

        const loadingToast = toast.loading("Fetching snapshots...")

        try {
            const token = getToken()
            if (!token) throw new Error("Authentication required")

            const encodedHost = encodeURIComponent(host)
            const response = await fetch(
                `${API_BASE_URL}/credentials/moderators/hosts/${encodedHost}/vms/${vmUuid}/snapshots`,
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                }
            )

            if (!response.ok) {
                toast.dismiss(loadingToast)
                if (response.status === 404) throw new Error("VM not found or no snapshots available")
                throw new Error(`Failed to fetch snapshots: ${response.statusText}`)
            }

            const data: VMSnapshot[] = await response.json()
            setSnapshots(data)

            toast.dismiss(loadingToast)
            if (data.length === 0) {
                toast.info("No snapshots found for this VM")
            } else {
                toast.success(`Found ${data.length} snapshot(s)`)
            }
            return data

        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to fetch snapshots"
            toast.dismiss(loadingToast)
            toast.error(msg)
            setError(msg)
            throw new Error(msg)
        } finally {
            setIsLoadingSnapshots(false)
        }
    }, [])

    const selectSnapshot = useCallback((snapshot: VMSnapshot | null) => {
        setSelectedSnapshot(snapshot)
    }, [])

    const reset = useCallback(() => {
        setSelectedHost(null)
        setVms([])
        setSelectedVM(null)
        setSnapshots([])
        setSelectedSnapshot(null)
        setError(null)
    }, [])

    return {
        hosts,
        selectedHost,
        isLoadingHosts,
        vms,
        selectedVM,
        isLoadingVMs,
        snapshots,
        selectedSnapshot,
        isLoadingSnapshots,
        error,
        fetchHosts,
        selectHost,
        fetchVMs,
        selectVM,
        fetchSnapshots,
        selectSnapshot,
        reset,
    }
}