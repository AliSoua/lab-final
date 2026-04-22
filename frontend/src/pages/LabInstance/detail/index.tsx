// src/pages/LabInstance/detail/index.tsx
import { useEffect, useCallback, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
    AlertCircle,
    ArrowLeft,
    Loader2,
    Power,
    PowerOff,
    RefreshCw,
    Trash2,
    Monitor,
    Server,
    MapPin,
    Clock,
    Calendar,
    Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLabInstance } from "@/hooks/LabInstance/useLabInstance"
import type { LabInstance } from "@/types/LabInstance/LabInstance"

export default function LabInstanceDetailPage() {
    const { instanceId } = useParams<{ instanceId: string }>()
    const navigate = useNavigate()

    const {
        getInstance,
        refreshInstanceStatus,
        stopInstance,
        terminateInstance,
        isLoading,
        error,
    } = useLabInstance()

    const [instance, setInstance] = useState<LabInstance | null>(null)
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

    // -------------------------------------------------------------------------
    // Fetch instance details
    // -------------------------------------------------------------------------
    const fetchInstance = useCallback(async () => {
        if (!instanceId) return
        try {
            const data = await getInstance(instanceId)
            setInstance(data)
            setLastRefreshed(new Date())
        } catch {
            // Error handled by hook
        }
    }, [instanceId, getInstance])

    // Initial load
    useEffect(() => {
        fetchInstance()
    }, [fetchInstance])

    // Auto-refresh every 15s while active
    useEffect(() => {
        if (!instance) return
        if (["terminated", "stopped"].includes(instance.status)) return

        const interval = setInterval(() => {
            fetchInstance()
        }, 15000)

        return () => clearInterval(interval)
    }, [instance, fetchInstance])

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------
    const handleRefresh = async () => {
        if (!instanceId) return
        try {
            await refreshInstanceStatus(instanceId)
            await fetchInstance() // Re-fetch full details after refresh
        } catch {
            // Error handled by hook
        }
    }

    const handleStop = async () => {
        if (!instanceId) return
        try {
            await stopInstance(instanceId)
            await fetchInstance()
        } catch {
            // Error handled by hook
        }
    }

    const handleTerminate = async () => {
        if (!instanceId) return
        if (!window.confirm("Are you sure you want to terminate this lab instance? This action cannot be undone.")) {
            return
        }
        try {
            await terminateInstance(instanceId)
            navigate("/labs")
        } catch {
            // Error handled by hook
        }
    }

    // -------------------------------------------------------------------------
    // Status badge helper
    // -------------------------------------------------------------------------
    const statusColor = (status: string) => {
        switch (status) {
            case "running":
                return "bg-emerald-50 text-emerald-700 border-emerald-200"
            case "provisioning":
                return "bg-amber-50 text-amber-700 border-amber-200"
            case "stopped":
                return "bg-slate-50 text-slate-700 border-slate-200"
            case "terminated":
                return "bg-red-50 text-red-700 border-red-200"
            default:
                return "bg-gray-50 text-gray-700 border-gray-200"
        }
    }

    const powerColor = (state: string | null) => {
        if (!state) return "text-gray-400"
        if (state === "poweredOn") return "text-emerald-600"
        if (state === "poweredOff") return "text-red-500"
        return "text-amber-500"
    }

    // -------------------------------------------------------------------------
    // Loading state
    // -------------------------------------------------------------------------
    if (isLoading && !instance) {
        return (
            <div className="min-h-screen bg-[#fafafa]">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center justify-center gap-4 py-24">
                        <Loader2 className="h-10 w-10 animate-spin text-[#1ca9b1]" />
                        <p className="text-[14px] text-[#727373]">Loading instance details...</p>
                    </div>
                </div>
            </div>
        )
    }

    // -------------------------------------------------------------------------
    // Error state
    // -------------------------------------------------------------------------
    if (error || !instance) {
        return (
            <div className="min-h-screen bg-[#fafafa]">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-[18px] font-semibold text-red-900">
                                {error?.includes("not found") ? "Instance Not Found" : "Failed to Load Instance"}
                            </h2>
                            <p className="mt-2 max-w-md text-[14px] text-red-700">
                                {error || "The lab instance you're looking for doesn't exist or you don't have permission to view it."}
                            </p>
                        </div>
                        <button
                            onClick={() => navigate("/labs")}
                            className={cn(
                                "flex items-center gap-2 rounded-lg bg-[#1ca9b1] px-5 py-2.5",
                                "text-[13px] font-medium text-white hover:bg-[#17959c]",
                                "transition-all duration-200"
                            )}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Labs
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // -------------------------------------------------------------------------
    // Main view
    // -------------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-[#fafafa]">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <button
                            onClick={() => navigate("/labs")}
                            className={cn(
                                "mb-3 flex items-center gap-1.5 text-[13px] font-medium text-[#727373]",
                                "hover:text-[#1ca9b1] transition-colors"
                            )}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Labs
                        </button>
                        <h1 className="text-[22px] font-bold text-[#3a3a3a]">
                            {instance.vm_name || "Lab Instance"}
                        </h1>
                        <p className="mt-1 text-[13px] text-[#727373] font-mono">
                            {instance.id}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold uppercase tracking-wide",
                                statusColor(instance.status)
                            )}
                        >
                            <Activity className="h-3.5 w-3.5" />
                            {instance.status}
                        </span>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="mb-8 flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className={cn(
                            "flex items-center gap-2 rounded-lg border border-[#e8e8e8] bg-white px-4 py-2.5",
                            "text-[13px] font-medium text-[#3a3a3a]",
                            "hover:border-[#1ca9b1] hover:text-[#1ca9b1]",
                            "transition-all duration-200 disabled:opacity-50"
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        Refresh Status
                    </button>

                    {instance.status === "running" && (
                        <button
                            onClick={handleStop}
                            disabled={isLoading}
                            className={cn(
                                "flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5",
                                "text-[13px] font-medium text-amber-700",
                                "hover:bg-amber-100 transition-all duration-200 disabled:opacity-50"
                            )}
                        >
                            <PowerOff className="h-4 w-4" />
                            Stop VM
                        </button>
                    )}

                    <button
                        onClick={handleTerminate}
                        disabled={isLoading}
                        className={cn(
                            "flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5",
                            "text-[13px] font-medium text-red-700",
                            "hover:bg-red-100 transition-all duration-200 disabled:opacity-50"
                        )}
                    >
                        <Trash2 className="h-4 w-4" />
                        Terminate
                    </button>

                    {lastRefreshed && (
                        <span className="ml-auto text-[12px] text-[#727373]">
                            Last updated: {lastRefreshed.toLocaleTimeString()}
                        </span>
                    )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* VM Name */}
                    <div className="rounded-xl border border-[#e8e8e8] bg-white p-5">
                        <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                            <Monitor className="h-4 w-4" />
                            VM Name
                        </div>
                        <p className="text-[15px] font-medium text-[#3a3a3a]">
                            {instance.vm_name || "—"}
                        </p>
                    </div>

                    {/* Power State */}
                    <div className="rounded-xl border border-[#e8e8e8] bg-white p-5">
                        <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                            <Power className="h-4 w-4" />
                            Power State
                        </div>
                        <p className={cn("text-[15px] font-medium", powerColor(instance.power_state))}>
                            {instance.power_state || "Unknown"}
                        </p>
                    </div>

                    {/* IP Address */}
                    <div className="rounded-xl border border-[#e8e8e8] bg-white p-5">
                        <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                            <MapPin className="h-4 w-4" />
                            IP Address
                        </div>
                        <p className="text-[15px] font-medium text-[#3a3a3a]">
                            {instance.ip_address || "—"}
                        </p>
                    </div>

                    {/* vCenter Host */}
                    <div className="rounded-xl border border-[#e8e8e8] bg-white p-5">
                        <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                            <Server className="h-4 w-4" />
                            vCenter Host
                        </div>
                        <p className="text-[15px] font-medium text-[#3a3a3a]">
                            {instance.vcenter_host || "—"}
                        </p>
                    </div>

                    {/* Created At */}
                    <div className="rounded-xl border border-[#e8e8e8] bg-white p-5">
                        <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                            <Calendar className="h-4 w-4" />
                            Created
                        </div>
                        <p className="text-[15px] font-medium text-[#3a3a3a]">
                            {instance.created_at
                                ? new Date(instance.created_at).toLocaleString()
                                : "—"}
                        </p>
                    </div>

                    {/* Expires At */}
                    <div className="rounded-xl border border-[#e8e8e8] bg-white p-5">
                        <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                            <Clock className="h-4 w-4" />
                            Expires
                        </div>
                        <p className="text-[15px] font-medium text-[#3a3a3a]">
                            {instance.expires_at
                                ? new Date(instance.expires_at).toLocaleString()
                                : "—"}
                        </p>
                    </div>
                </div>

                {instance.status === "provisioning" && (
                    <div className="flex items-center gap-2 text-amber-600 text-[13px]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Waiting for VM network...
                    </div>
                )}

                {/* Connection URL */}
                {instance.connection_url && instance.status === "running" && (
                    <a
                        href={instance.connection_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            "flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3",
                            "text-[14px] font-semibold text-white hover:bg-emerald-700",
                            "shadow-lg shadow-emerald-600/30 transition-all duration-200"
                        )}
                    >
                        <Monitor className="h-4 w-4" />
                        Open Lab Desktop
                    </a>
                )}

                {/* Footer hint */}
                <div className="mt-8 text-center">
                    <p className="text-[12px] text-[#727373]">
                        This page auto-refreshes every 15 seconds while the instance is active.
                    </p>
                </div>
            </div>
        </div>
    )
}