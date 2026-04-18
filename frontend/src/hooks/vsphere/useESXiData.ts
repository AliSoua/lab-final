import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import type { ESXiHost, VMTemplate, VirtualMachine } from "@/types/infrastructure"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

// Backend API envelope structure
interface ESXiApiEnvelope<T> {
    results: Array<{ host: string; data: T }>
    errors: Array<{ host?: string; host_name?: string; error: string }>
    total_hosts: number
    successful: number
    failed: number
}

// Raw types from backend (before transformation)
interface RawESXiHostInfo {
    name: string
    model: string | null
    vendor: string | null
    cpu_model: string | null
    cpu_cores: number
    cpu_threads: number
    cpu_packages: number
    cpu_mhz: number
    memory_gb: number
    esxi_version: string | null
    esxi_build: string | null
    license_name: string | null
    connection_state: string
    power_state: string
    in_maintenance_mode: boolean
    overall_status: string
    vm_count: number
    boot_time: string | null
}

interface RawVMTemplate {
    uuid: string
    name: string
    guest_os: string
    cpu_count: number
    memory_mb: number
    path: string | null
    host: string
}

interface RawVirtualMachine {
    uuid: string | null
    name: string
    power_state: string
    guest_os: string | null
    cpu_count: number
    memory_mb: number
    ip_address: string | null
    tools_status: string
    is_template: boolean
    host: string
}

interface UseESXiDataReturn {
    hosts: ESXiHost[]
    templates: VMTemplate[]
    vms: VirtualMachine[]
    isLoading: boolean
    error: string | null
    refetch: () => void
}

// Helper: Infer template type from guest OS
function inferTypeFromGuestOS(guestOS: string): VMTemplate["type"] {
    const lower = guestOS.toLowerCase()
    if (lower.includes("esxi")) return "esxi"
    if (lower.includes("vcenter")) return "vcenter"
    if (lower.includes("kali") || lower.includes("security") || lower.includes("metasploitable")) return "security"
    if (lower.includes("windows")) return "windows"
    if (lower.includes("linux") || lower.includes("ubuntu") || lower.includes("debian") || lower.includes("centos") || lower.includes("rhel") || lower.includes("freebsd")) return "linux"
    return "other"
}

// Helper: Infer OS family from guest OS
function inferOSFamily(guestOS: string): string {
    const lower = guestOS.toLowerCase()
    if (lower.includes("windows")) return "Windows"
    if (lower.includes("freebsd")) return "FreeBSD"
    if (lower.includes("vmware") || lower.includes("esxi")) return "VMware"
    return "Linux"
}

// Helper: Map VM power state to UI status
function mapVMStatus(powerState: string): VirtualMachine["status"] {
    switch (powerState) {
        case "poweredOn": return "running"
        case "poweredOff": return "stopped"
        case "suspended": return "suspended"
        default: return "error"
    }
}

export function useESXiData(): UseESXiDataReturn {
    const [hosts, setHosts] = useState<ESXiHost[]>([])
    const [templates, setTemplates] = useState<VMTemplate[]>([])
    const [vms, setVMs] = useState<VirtualMachine[]>([])
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

            const [infoRes, templateRes, vmsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/vsphere/esxi/info`, { headers }),
                fetch(`${API_BASE_URL}/vsphere/esxi/templates`, { headers }),
                fetch(`${API_BASE_URL}/vsphere/esxi/vms`, { headers }),
            ])

            if (!infoRes.ok || !templateRes.ok || !vmsRes.ok) {
                if (infoRes.status === 401 || templateRes.status === 401 || vmsRes.status === 401) {
                    throw new Error("Unauthorized. Please log in.")
                }
                if (infoRes.status === 403 || templateRes.status === 403 || vmsRes.status === 403) {
                    throw new Error("Forbidden. Moderator access required.")
                }
                if (infoRes.status === 404) {
                    const data = await infoRes.json().catch(() => ({}))
                    throw new Error(data.detail || "No ESXi credentials configured")
                }
                const text = await infoRes.text()
                throw new Error(`Failed to load data: ${text}`)
            }

            const infoData: ESXiApiEnvelope<RawESXiHostInfo> = await infoRes.json()
            const templateData: ESXiApiEnvelope<RawVMTemplate[]> = await templateRes.json()
            const vmsData: ESXiApiEnvelope<RawVirtualMachine[]> = await vmsRes.json()

            // Transform hosts - use raw data directly as it matches our type
            const transformedHosts: ESXiHost[] = infoData.results.map((r) => r.data)

            // Track template counts per host for any additional UI needs
            const templateCounts = new Map<string, number>()

            // Transform templates
            const transformedTemplates: VMTemplate[] = []

            templateData.results.forEach((r) => {
                const hostTemplates = r.data || []
                templateCounts.set(r.host, hostTemplates.length)

                hostTemplates.forEach((t) => {
                    transformedTemplates.push({
                        // Core backend fields
                        uuid: t.uuid,
                        id: t.uuid,
                        name: t.name,
                        guest_os: t.guest_os,
                        cpu_count: t.cpu_count,
                        memory_mb: t.memory_mb,
                        path: t.path,
                        host: t.host,

                        // UI-enriched fields
                        esxi_host_id: r.host,
                        esxi_host_name: r.host,
                        cpu_cores: t.cpu_count,
                        type: inferTypeFromGuestOS(t.guest_os),
                        status: "available",
                        os_family: inferOSFamily(t.guest_os),
                        os_version: t.guest_os,
                        description: t.guest_os || "VM Template",
                        disk_gb: 0,
                    })
                })
            })

            // Transform VMs
            const transformedVMs: VirtualMachine[] = []

            vmsData.results.forEach((r) => {
                const hostVMs = r.data || []

                hostVMs.forEach((vm) => {
                    transformedVMs.push({
                        // Core backend fields
                        uuid: vm.uuid,
                        id: vm.uuid || `${r.host}-${vm.name}`,
                        name: vm.name,
                        power_state: vm.power_state,
                        guest_os: vm.guest_os,
                        cpu_count: vm.cpu_count,
                        memory_mb: vm.memory_mb,
                        ip_address: vm.ip_address,
                        tools_status: vm.tools_status,
                        is_template: vm.is_template,
                        host: vm.host,

                        // UI-enriched fields
                        esxi_host_id: r.host,
                        esxi_host_name: r.host,
                        status: mapVMStatus(vm.power_state),
                    })
                })
            })

            setHosts(transformedHosts)
            setTemplates(transformedTemplates)
            setVMs(transformedVMs)

            if (infoData.failed > 0 || vmsData.failed > 0) {
                const totalFailed = infoData.failed + vmsData.failed
                toast.warning(`${totalFailed} host(s) unreachable`, {
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

    return { hosts, templates, vms, isLoading, error, refetch: fetchData }
}