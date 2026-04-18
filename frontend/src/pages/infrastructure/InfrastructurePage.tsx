// src/pages/infrastructure/InfrastructurePage.tsx
import { useState, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Server, Database, Monitor, Plus, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useESXiData } from "@/hooks/vsphere/useESXiData"
import {
    InfrastructureFilters as InfrastructureFilterBar,
    VMTemplateTable,
    ESXiHostTable,
    VMTable,
    InfrastructurePagination,
} from "@/components/infrastructure"
import {
    DEFAULT_INFRASTRUCTURE_FILTERS,
    type InfrastructureFilters
} from "@/types/infrastructure"
import { toast } from "sonner"
import type { VMTemplate, ESXiHost, VirtualMachine } from "@/types/infrastructure"

const ITEMS_PER_PAGE = 10

type ViewTab = "templates" | "hosts" | "vms"

export default function InfrastructurePage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { hosts, templates, vms, isLoading, error, refetch } = useESXiData()
    const [currentPage, setCurrentPage] = useState(1)
    const [filters, setFilters] = useState<InfrastructureFilters>(DEFAULT_INFRASTRUCTURE_FILTERS)
    const [activeTab, setActiveTab] = useState<ViewTab>("templates")

    const filteredTemplates = useMemo(() => {
        return templates.filter((template) => {
            const matchesHost = filters.host === "all" || template.esxi_host_name === filters.host
            const matchesType = filters.type === "all" || template.type === filters.type
            const matchesStatus = filters.status === "all" || template.status === filters.status
            const matchesSearch =
                filters.searchQuery === "" ||
                template.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                template.description.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                template.os_family.toLowerCase().includes(filters.searchQuery.toLowerCase())

            return matchesHost && matchesType && matchesStatus && matchesSearch
        })
    }, [templates, filters])

    const filteredVMs = useMemo(() => {
        return (vms || []).filter((vm) => {
            const matchesHost = filters.host === "all" || vm.esxi_host_name === filters.host
            const matchesStatus = filters.status === "all" ||
                (filters.status === "running" && vm.power_state === "poweredOn") ||
                (filters.status === "stopped" && vm.power_state === "poweredOff")
            const matchesSearch =
                filters.searchQuery === "" ||
                vm.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                (vm.guest_os && vm.guest_os.toLowerCase().includes(filters.searchQuery.toLowerCase()))

            return matchesHost && matchesStatus && matchesSearch
        })
    }, [vms, filters])

    const currentItems = activeTab === "templates" ? filteredTemplates : filteredVMs
    const totalItems = currentItems.length
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE
        return currentItems.slice(start, start + ITEMS_PER_PAGE)
    }, [currentItems, currentPage])

    const handleFiltersChange = useCallback((newFilters: InfrastructureFilters) => {
        setFilters(newFilters)
        setCurrentPage(1)
    }, [])

    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page)
        window.scrollTo({ top: 0, behavior: "smooth" })
    }, [])

    const handleAddHost = () => {
        navigate("/admin/credentials")
    }

    const handleSyncHost = (host: ESXiHost) => {
        toast.success(`Syncing ${host.name}...`)
        refetch()
    }

    const handleProvisionTemplate = (template: VMTemplate) => {
        toast.success(`Provisioning VM from template: ${template.name}`)
    }

    const handleStartVM = (vm: VirtualMachine) => {
        toast.success(`Starting VM: ${vm.name}`)
    }

    const handleStopVM = (vm: VirtualMachine) => {
        toast.success(`Stopping VM: ${vm.name}`)
    }

    const handleRestartVM = (vm: VirtualMachine) => {
        toast.success(`Restarting VM: ${vm.name}`)
    }

    const handleDeleteVM = (vm: VirtualMachine) => {
        toast.info(`Delete VM: ${vm.name}`)
    }

    const isEmptyState = !isLoading && hosts.length === 0 && !error

    return (
        <div className="flex flex-col h-full bg-[#f9f9f9]">
            {/* Header */}
            <div className="bg-white border-b border-[#e8e8e8] px-6 py-5 shrink-0">
                <div className="flex items-center justify-between w-full px-4">
                    <div>
                        <h1 className="text-xl font-semibold text-[#3a3a3a]">
                            Infrastructure
                        </h1>
                        <p className="text-sm text-[#727373] mt-0.5">
                            Manage ESXi hosts, VM templates, and virtual machines
                        </p>
                    </div>

                    <button
                        onClick={handleAddHost}
                        className={cn(
                            "flex items-center gap-2 rounded-lg px-4 py-2",
                            "bg-[#1ca9b1] text-white text-sm font-medium",
                            "hover:bg-[#17959c] hover:shadow-md",
                            "transition-all duration-200"
                        )}
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add ESXi Host</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-[#e8e8e8] px-6 shrink-0">
                <div className="w-full px-4">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setActiveTab("templates")}
                            className={cn(
                                "flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors",
                                activeTab === "templates"
                                    ? "border-[#1ca9b1] text-[#1ca9b1]"
                                    : "border-transparent text-[#727373] hover:text-[#3a3a3a]"
                            )}
                        >
                            <Database className="h-4 w-4" />
                            VM Templates
                            <span className={cn(
                                "ml-1 px-2 py-0.5 rounded-full text-xs",
                                activeTab === "templates"
                                    ? "bg-[#1ca9b1]/10 text-[#1ca9b1]"
                                    : "bg-[#f5f5f5] text-[#727373]"
                            )}>
                                {templates.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab("vms")}
                            className={cn(
                                "flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors",
                                activeTab === "vms"
                                    ? "border-[#1ca9b1] text-[#1ca9b1]"
                                    : "border-transparent text-[#727373] hover:text-[#3a3a3a]"
                            )}
                        >
                            <Monitor className="h-4 w-4" />
                            Virtual Machines
                            <span className={cn(
                                "ml-1 px-2 py-0.5 rounded-full text-xs",
                                activeTab === "vms"
                                    ? "bg-[#1ca9b1]/10 text-[#1ca9b1]"
                                    : "bg-[#f5f5f5] text-[#727373]"
                            )}>
                                {vms?.length || 0}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab("hosts")}
                            className={cn(
                                "flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors",
                                activeTab === "hosts"
                                    ? "border-[#1ca9b1] text-[#1ca9b1]"
                                    : "border-transparent text-[#727373] hover:text-[#3a3a3a]"
                            )}
                        >
                            <Server className="h-4 w-4" />
                            ESXi Hosts
                            <span className={cn(
                                "ml-1 px-2 py-0.5 rounded-full text-xs",
                                activeTab === "hosts"
                                    ? "bg-[#1ca9b1]/10 text-[#1ca9b1]"
                                    : "bg-[#f5f5f5] text-[#727373]"
                            )}>
                                {hosts.length}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border-b border-[#e8e8e8] px-6 py-4 shrink-0">
                <div className="w-full px-4">
                    <InfrastructureFilterBar
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                        isLoading={isLoading}
                        hosts={hosts.map(h => ({ id: h.name, name: h.name }))}
                        showTypeFilter={activeTab === "templates"}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="w-full px-4 space-y-4">
                    {/* Error State */}
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-red-700 font-medium">Failed to load infrastructure</p>
                                <p className="text-xs text-red-600 mt-0.5">{error}</p>
                                {error.includes("credentials") && (
                                    <button
                                        onClick={() => navigate("/admin/credentials")}
                                        className="mt-2 text-xs text-red-600 hover:text-red-800 underline font-medium"
                                    >
                                        Go to Credentials
                                    </button>
                                )}
                                <button
                                    onClick={() => refetch()}
                                    className="mt-2 ml-3 text-xs text-red-600 hover:text-red-800 underline font-medium"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Empty State - No credentials configured */}
                    {isEmptyState && (
                        <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                            <div className="p-12 text-center">
                                <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                                    <Server className="h-6 w-6 text-[#c4c4c4]" />
                                </div>
                                <h3 className="text-sm font-medium text-[#3a3a3a]">No ESXi hosts configured</h3>
                                <p className="text-xs text-[#727373] mt-1 mb-4">
                                    Add ESXi host credentials to view templates and manage infrastructure
                                </p>
                                <button
                                    onClick={handleAddHost}
                                    className={cn(
                                        "inline-flex items-center gap-2 rounded-lg px-4 py-2",
                                        "bg-[#1ca9b1] text-white text-sm font-medium",
                                        "hover:bg-[#17959c] transition-colors"
                                    )}
                                >
                                    <Plus className="h-4 w-4" />
                                    Add First Host
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "templates" ? (
                        <>
                            <VMTemplateTable
                                templates={paginatedItems as VMTemplate[]}
                                isLoading={isLoading}
                                onView={(t: VMTemplate) => toast.info(`View: ${t.name}`)}
                                onEdit={(t: VMTemplate) => toast.info(`Edit: ${t.name}`)}
                                onDelete={(t: VMTemplate) => toast.info(`Delete: ${t.name}`)}
                                onProvision={handleProvisionTemplate}
                            />

                            {!isLoading && totalItems > 0 && (
                                <InfrastructurePagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={handlePageChange}
                                    isLoading={isLoading}
                                />
                            )}
                        </>
                    ) : activeTab === "vms" ? (
                        <>
                            <VMTable
                                vms={paginatedItems as VirtualMachine[]}
                                isLoading={isLoading}
                                onView={(vm: VirtualMachine) => toast.info(`View: ${vm.name}`)}
                                onStart={handleStartVM}
                                onStop={handleStopVM}
                                onRestart={handleRestartVM}
                                onDelete={handleDeleteVM}
                            />

                            {!isLoading && totalItems > 0 && (
                                <InfrastructurePagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={handlePageChange}
                                    isLoading={isLoading}
                                />
                            )}
                        </>
                    ) : (
                        <ESXiHostTable
                            hosts={hosts}
                            isLoading={isLoading}
                            onView={(h: ESXiHost) => toast.info(`View: ${h.name}`)}
                            onEdit={(h: ESXiHost) => toast.info(`Edit: ${h.name}`)}
                            onSync={handleSyncHost}
                            onDelete={(h: ESXiHost) => toast.info(`Delete: ${h.name}`)}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}