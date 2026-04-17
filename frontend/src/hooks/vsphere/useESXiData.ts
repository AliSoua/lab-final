// src/hooks/vsphere/useESXiData.ts
import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import type { ESXiHost, VMTemplate } from "@/types/infrastructure"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface ESXiApiEnvelope {
    results: Array<{ host: string; data: unknown }>
    errors: Array<{ host?: string; host_name?: string; error: string }>
    total_hosts: number
    successful: number
    failed: number
}

interface UseESXiDataReturn {
    hosts: ESXiHost[]
    templates: VMTemplate[]
    isLoading: boolean
    error: string | null
    refetch: () => void
}

function inferTypeFromGuestOS(guestOS: string): VMTemplate["type"] {
    const lower = guestOS.toLowerCase()
    if (lower.includes("esxi")) return "esxi"
    if (lower.includes("vcenter")) return "vcenter"
    if (lower.includes("kali") || lower.includes("security") || lower.includes("metasploitable")) return "security"
    if (lower.includes("windows")) return "windows"
    if (lower.includes("linux") || lower.includes("ubuntu") || lower.includes("debian") || lower.includes("centos") || lower.includes("rhel") || lower.includes("freebsd")) return "linux"
    return "other"
}

function inferOSFamily(guestOS: string): string {
    const lower = guestOS.toLowerCase()
    if (lower.includes("windows")) return "Windows"
    if (lower.includes("freebsd")) return "FreeBSD"
    if (lower.includes("vmware") || lower.includes("esxi")) return "VMware"
    return "Linux"
}

export function useESXiData(): UseESXiDataReturn {
    const [hosts, setHosts] = useState<ESXiHost[]>([])
    const [templates, setTemplates] = useState<VMTemplate[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        const token = localStorage.getItem("access_token")
        if (!token) {
            setError("Authentication required")
            setIsLoading(false)
            return
        }

        try {
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json",
            }

            const [infoRes, templateRes] = await Promise.all([
                fetch(`${API_BASE_URL}/vsphere/esxi/info`, { headers }),
                fetch(`${API_BASE_URL}/vsphere/esxi/templates`, { headers }),
            ])

            if (!infoRes.ok || !templateRes.ok) {
                if (infoRes.status === 401 || templateRes.status === 401) {
                    throw new Error("Unauthorized. Please log in.")
                }
                if (infoRes.status === 403 || templateRes.status === 403) {
                    throw new Error("Forbidden. Moderator access required.")
                }
                if (infoRes.status === 404) {
                    const data = await infoRes.json().catch(() => ({}))
                    throw new Error(data.detail || "No ESXi credentials configured")
                }
                const text = await infoRes.text()
                throw new Error(`Failed to load data: ${text}`)
            }

            const infoData: ESXiApiEnvelope = await infoRes.json()
            const templateData: ESXiApiEnvelope = await templateRes.json()

            const hostMap = new Map<string, ESXiHost>()

            // Successful host connections
            infoData.results.forEach((r) => {
                const info = r.data as {
                    name: string
                    model: string | null
                    cpu_cores: number
                    memory_gb: number
                    esxi_version: string | null
                    connection_state: string
                    power_state: string
                }

                const connState = info.connection_state.toLowerCase()
                const status: ESXiHost["status"] =
                    connState.includes("connected") ? "online" :
                        connState.includes("disconnected") ? "offline" :
                            connState.includes("maintenance") ? "maintenance" : "error"

                hostMap.set(r.host, {
                    id: r.host,
                    name: info.name || r.host,
                    hostname: r.host,
                    status,
                    data_center: "Default DC",
                    cluster: "Default Cluster",
                    cpu_total: info.cpu_cores || 0,
                    cpu_used: 0,
                    memory_total_gb: info.memory_gb || 0,
                    memory_used_gb: 0,
                    storage_total_gb: 0,
                    storage_used_gb: 0,
                    vm_count: 0,
                    template_count: 0,
                    last_synced_at: new Date().toISOString(),
                })
            })

            // Failed hosts shown as offline
            infoData.errors.forEach((err) => {
                const key = err.host || err.host_name || "unknown"
                if (!hostMap.has(key)) {
                    hostMap.set(key, {
                        id: key,
                        name: key,
                        hostname: key,
                        status: "offline",
                        data_center: "Unknown",
                        cluster: "Unknown",
                        cpu_total: 0,
                        cpu_used: 0,
                        memory_total_gb: 0,
                        memory_used_gb: 0,
                        storage_total_gb: 0,
                        storage_used_gb: 0,
                        vm_count: 0,
                        template_count: 0,
                        last_synced_at: new Date().toISOString(),
                    })
                }
            })

            // Map templates
            const allTemplates: VMTemplate[] = []
            const templateCounts = new Map<string, number>()

            templateData.results.forEach((r) => {
                const list = r.data as Array<{
                    name: string
                    guest_os: string
                    cpu_count: number
                    memory_mb: number
                    path: string
                    host: string
                }>

                templateCounts.set(r.host, list.length)

                list.forEach((t, idx) => {
                    allTemplates.push({
                        id: `tpl-${r.host}-${idx}`,
                        name: t.name,
                        description: t.guest_os || "VM Template",
                        type: inferTypeFromGuestOS(t.guest_os),
                        cpu_cores: t.cpu_count,
                        memory_mb: t.memory_mb,
                        disk_gb: 0,
                        esxi_host_id: r.host,
                        esxi_host_name: r.host,
                        status: "available",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        tags: [],
                        os_family: inferOSFamily(t.guest_os),
                        os_version: t.guest_os,
                    })
                })
            })

            // Attach template counts to hosts
            hostMap.forEach((host) => {
                host.template_count = templateCounts.get(host.hostname) || 0
            })

            setHosts(Array.from(hostMap.values()))
            setTemplates(allTemplates)

            if (infoData.failed > 0) {
                toast.warning(`${infoData.failed} host(s) unreachable`, {
                    description: "Check credentials or network connectivity",
                })
            }

        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to load infrastructure data"
            setError(msg)
            toast.error(msg)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return { hosts, templates, isLoading, error, refetch: fetchData }
}