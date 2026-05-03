// src/components/LabDefinition/CreateFullLabDefinitions/VMsStep.tsx

import { cn } from "@/lib/utils"
import { useFormContext } from "react-hook-form"
import type { CreateFullLabDefinitionFormData } from "@/types/LabDefinition/CreateFullLabDefinition"
import { useVMsAndSnapshots } from "@/hooks/LabDefinition/useVMsAndSnapshots"
import {
    Server, Check, Cpu, MemoryStick,
    Search, X, AlertCircle, ChevronRight,
    Camera, Layers, Monitor
} from "lucide-react"
import { useState, useEffect } from "react"

export function VMsStep() {
    const { setValue, watch, formState: { errors } } = useFormContext<CreateFullLabDefinitionFormData>()

    const {
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
    } = useVMsAndSnapshots()

    const [searchTerm, setSearchTerm] = useState("")
    const [hasFetchedHosts, setHasFetchedHosts] = useState(false)
    const [hasFetchedVMs, setHasFetchedVMs] = useState(false)
    const [hasFetchedSnapshots, setHasFetchedSnapshots] = useState(false)

    // Reset fetch flags when selection changes
    useEffect(() => {
        setHasFetchedVMs(false)
    }, [selectedHost])

    useEffect(() => {
        setHasFetchedSnapshots(false)
    }, [selectedVM])

    // Fetch ESXi hosts on mount
    useEffect(() => {
        if (!hasFetchedHosts) {
            fetchHosts().catch(() => { })
            setHasFetchedHosts(true)
        }
    }, [fetchHosts, hasFetchedHosts])

    // Fetch VMs once when host is selected
    useEffect(() => {
        if (selectedHost && !hasFetchedVMs && !isLoadingVMs) {
            fetchVMs(selectedHost)
                .catch(() => { })
                .finally(() => setHasFetchedVMs(true))
        }
    }, [selectedHost, hasFetchedVMs, isLoadingVMs, fetchVMs])

    // Fetch snapshots once when VM is selected
    useEffect(() => {
        if (selectedVM && selectedHost && !hasFetchedSnapshots && !isLoadingSnapshots) {
            fetchSnapshots(selectedHost, selectedVM.uuid)
                .catch(() => { })
                .finally(() => setHasFetchedSnapshots(true))
        }
    }, [selectedVM, selectedHost, hasFetchedSnapshots, isLoadingSnapshots, fetchSnapshots])

    const filteredVMs = searchTerm
        ? vms.filter(vm =>
            vm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vm.guest_os.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : vms

    const handleSelectSnapshot = (vm: typeof selectedVM, snapshot: typeof selectedSnapshot) => {
        if (!vm || !snapshot || !selectedHost) return

        setValue("vms", [{
            name: vm.name,
            source_vm_id: vm.uuid,
            snapshot_name: snapshot.name,
            esxi_host: selectedHost,
            cpu_cores: vm.cpu_count,
            memory_mb: vm.memory_mb,
            order: 0,
        }], { shouldValidate: true })

        selectSnapshot(snapshot)
    }

    const handleClear = () => {
        setValue("vms", [], { shouldValidate: true })
        reset()
    }

    const currentVM = watch("vms.0")

    // ── Render ─────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#e8e8e8]">
                <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-[#1ca9b1]" />
                    <h2 className="text-[14px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                        Select VM & Snapshot
                    </h2>
                </div>
                {currentVM && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="flex items-center gap-1.5 text-[12px] text-[#727373] hover:text-red-500 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear selection
                    </button>
                )}
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-[#fef3f2] border border-red-200 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-[12px] text-red-600">{error}</p>
                </div>
            )}

            {/* Selected State Banner */}
            {currentVM && selectedVM && selectedSnapshot && (
                <div className="bg-[#e6f7f8] border border-[#1ca9b1]/20 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1ca9b1]/10 flex items-center justify-center text-[#1ca9b1]">
                            <Check className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[#3a3a3a]">{selectedVM.name}</p>
                            <p className="text-[11px] text-[#727373]">
                                {selectedVM.guest_os} • {selectedHost}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pl-[52px]">
                        <ChevronRight className="h-3 w-3 text-[#1ca9b1]" />
                        <span className="text-[11px] px-2 py-0.5 rounded bg-[#1ca9b1] text-white font-medium">
                            {selectedSnapshot.name}
                        </span>
                        <span className="text-[10px] text-[#727373]">
                            {selectedSnapshot.description}
                        </span>
                    </div>
                </div>
            )}

            {/* Step 1: ESXi Host Selection */}
            {!selectedHost && (
                <div className="space-y-3">
                    <h3 className="text-[13px] font-medium text-[#3a3a3a] flex items-center gap-2">
                        <Monitor className="h-3.5 w-3.5 text-[#727373]" />
                        Step 1: Choose ESXi Host
                    </h3>

                    {isLoadingHosts ? (
                        <div className="space-y-2">
                            {[1, 2].map(i => (
                                <div key={i} className="h-14 rounded-xl border border-[#e8e8e8] bg-white animate-pulse" />
                            ))}
                        </div>
                    ) : hosts.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-[#d4d4d4]">
                            <Monitor className="h-10 w-10 text-[#c4c4c4] mx-auto mb-3" />
                            <p className="text-[12px] text-[#727373]">No ESXi hosts registered</p>
                            <p className="text-[11px] text-[#c4c4c4] mt-1">
                                Register an ESXi host in your credentials first
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {hosts.map(host => (
                                <button
                                    key={host.esxi_host}
                                    type="button"
                                    onClick={() => selectHost(host.esxi_host)}
                                    className={cn(
                                        "w-full text-left bg-white rounded-xl border p-3 transition-all",
                                        "hover:border-[#1ca9b1]/50 hover:shadow-sm",
                                        "border-[#e8e8e8]"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-[#727373]">
                                            <Monitor className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[13px] font-medium text-[#3a3a3a]">{host.esxi_host}</p>
                                            <p className="text-[11px] text-[#727373]">{host.username}</p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-[#c4c4c4]" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Step 2: VM Selection */}
            {selectedHost && !selectedVM && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[13px] font-medium text-[#3a3a3a] flex items-center gap-2">
                            <Server className="h-3.5 w-3.5 text-[#727373]" />
                            Step 2: Choose VM on {selectedHost}
                        </h3>
                        <button
                            type="button"
                            onClick={() => selectHost("")}
                            className="text-[11px] text-[#1ca9b1] hover:text-[#17959c]"
                        >
                            Change host
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search VMs by name or OS..."
                            disabled={isLoadingVMs}
                            className={cn(
                                "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-3 py-2.5",
                                "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20",
                                isLoadingVMs && "opacity-50"
                            )}
                        />
                    </div>

                    {isLoadingVMs ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 rounded-xl border border-[#e8e8e8] bg-white animate-pulse" />
                            ))}
                        </div>
                    ) : filteredVMs.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-[#d4d4d4]">
                            <Server className="h-10 w-10 text-[#c4c4c4] mx-auto mb-3" />
                            <p className="text-[12px] text-[#727373]">
                                {hasFetchedVMs ? "No VMs found on this host" : "Failed to load VMs"}
                            </p>
                            {hasFetchedVMs && error && (
                                <button
                                    type="button"
                                    onClick={() => setHasFetchedVMs(false)}
                                    className="text-[11px] text-[#1ca9b1] hover:text-[#17959c] mt-2"
                                >
                                    Retry
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredVMs.map(vm => (
                                <button
                                    key={vm.uuid}
                                    type="button"
                                    onClick={() => selectVM(vm)}
                                    disabled={!vm.has_snapshots}
                                    className={cn(
                                        "w-full text-left bg-white rounded-xl border p-3 transition-all",
                                        vm.has_snapshots
                                            ? "hover:border-[#1ca9b1]/50 hover:shadow-sm border-[#e8e8e8] cursor-pointer"
                                            : "border-[#f0f0f0] opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                            vm.has_snapshots ? "bg-[#f5f5f5] text-[#727373]" : "bg-[#fafafa] text-[#c4c4c4]"
                                        )}>
                                            <Server className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] font-medium text-[#3a3a3a] truncate">
                                                    {vm.name}
                                                </p>
                                                {!vm.has_snapshots && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#fef3f2] text-red-500 font-medium">
                                                        No snapshots
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-[11px] text-[#727373]">{vm.guest_os}</span>
                                                <span className="flex items-center gap-1 text-[11px] text-[#727373]">
                                                    <Cpu className="h-3 w-3" /> {vm.cpu_count}
                                                </span>
                                                <span className="flex items-center gap-1 text-[11px] text-[#727373]">
                                                    <MemoryStick className="h-3 w-3" /> {vm.memory_mb}MB
                                                </span>
                                            </div>
                                        </div>
                                        {vm.has_snapshots && (
                                            <ChevronRight className="h-4 w-4 text-[#c4c4c4]" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: Snapshot Selection */}
            {selectedVM && !selectedSnapshot && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[13px] font-medium text-[#3a3a3a] flex items-center gap-2">
                            <Camera className="h-3.5 w-3.5 text-[#727373]" />
                            Step 3: Choose Snapshot for {selectedVM.name}
                        </h3>
                        <button
                            type="button"
                            onClick={() => selectVM(null)}
                            className="text-[11px] text-[#1ca9b1] hover:text-[#17959c]"
                        >
                            Change VM
                        </button>
                    </div>

                    {isLoadingSnapshots ? (
                        <div className="space-y-2">
                            {[1, 2].map(i => (
                                <div key={i} className="h-14 rounded-xl border border-[#e8e8e8] bg-white animate-pulse" />
                            ))}
                        </div>
                    ) : snapshots.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-[#d4d4d4]">
                            <Camera className="h-10 w-10 text-[#c4c4c4] mx-auto mb-3" />
                            <p className="text-[12px] text-[#727373]">
                                {hasFetchedSnapshots ? "No snapshots available" : "Failed to load snapshots"}
                            </p>
                            {hasFetchedSnapshots && (
                                <>
                                    <p className="text-[11px] text-[#c4c4c4] mt-1">
                                        Create a snapshot on this VM in vCenter first
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setHasFetchedSnapshots(false)}
                                        className="text-[11px] text-[#1ca9b1] hover:text-[#17959c] mt-2"
                                    >
                                        Retry
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {snapshots.map(snapshot => (
                                <button
                                    key={snapshot.moid}
                                    type="button"
                                    onClick={() => handleSelectSnapshot(selectedVM, snapshot)}
                                    className={cn(
                                        "w-full text-left bg-white rounded-xl border p-3 transition-all",
                                        "hover:border-[#1ca9b1]/50 hover:shadow-sm border-[#e8e8e8]"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#e6f7f8] flex items-center justify-center text-[#1ca9b1]">
                                            <Layers className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-[#3a3a3a]">{snapshot.name}</p>
                                            <p className="text-[11px] text-[#727373] truncate">
                                                {snapshot.description || "No description"}
                                            </p>
                                            <p className="text-[10px] text-[#c4c4c4] mt-0.5">
                                                {new Date(snapshot.create_time).toLocaleString()}
                                            </p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-[#c4c4c4]" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Validation Error */}
            {errors.vms && (
                <p className="text-[12px] text-red-500 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {errors.vms.message || "Please select a VM and snapshot"}
                </p>
            )}
        </div>
    )
}