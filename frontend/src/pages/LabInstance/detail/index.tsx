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
    Terminal,
    ExternalLink,
    Shield,
    Wifi,
    WifiOff,
    CheckCircle2,
    XCircle,
    Copy,
    Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { buildGuacamoleClientUrl } from "@/lib/guacamole"
import { useLabInstance } from "@/hooks/LabInstance/useLabInstance"
import type { LabInstance } from "@/types/LabInstance/LabInstance"

// Protocol configuration
const PROTOCOL_CONFIG: Record<
    string,
    { label: string; icon: React.ElementType; color: string; bg: string; border: string; port: number }
> = {
    ssh: {
        label: "SSH",
        icon: Terminal,
        color: "text-violet-700",
        bg: "bg-violet-50",
        border: "border-violet-200",
        port: 22,
    },
    rdp: {
        label: "RDP",
        icon: Monitor,
        color: "text-sky-700",
        bg: "bg-sky-50",
        border: "border-sky-200",
        port: 3389,
    },
    vnc: {
        label: "VNC",
        icon: Monitor,
        color: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
        port: 5901,
    },
}

function getProtocolFromKey(key: string): string {
    const parts = key.split("_")
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "ssh"
}

function getSlugFromKey(key: string): string {
    const parts = key.split("_")
    return parts.slice(0, -1).join("_")
}

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
    const [copiedKey, setCopiedKey] = useState<string | null>(null)

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
        }, 30000)

        return () => clearInterval(interval)
    }, [instance, fetchInstance])

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------
    const handleRefresh = async () => {
        if (!instanceId) return
        try {
            await refreshInstanceStatus(instanceId)
            await fetchInstance()
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
        if (
            !window.confirm(
                "Are you sure you want to terminate this lab instance? This action cannot be undone."
            )
        ) {
            return
        }
        try {
            await terminateInstance(instanceId)
            navigate("/labs")
        } catch {
            // Error handled by hook
        }
    }

    const handleCopy = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedKey(key)
            setTimeout(() => setCopiedKey(null), 2000)
        } catch {
            // Fallback: silently fail
        }
    }

    // -------------------------------------------------------------------------
    // Status helpers
    // -------------------------------------------------------------------------
    const statusConfig = (status: string) => {
        switch (status) {
            case "running":
                return {
                    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    icon: CheckCircle2,
                    label: "Running",
                }
            case "provisioning":
                return {
                    color: "bg-amber-50 text-amber-700 border-amber-200",
                    icon: Loader2,
                    label: "Provisioning",
                }
            case "stopped":
                return {
                    color: "bg-slate-50 text-slate-700 border-slate-200",
                    icon: PowerOff,
                    label: "Stopped",
                }
            case "terminated":
                return {
                    color: "bg-red-50 text-red-700 border-red-200",
                    icon: XCircle,
                    label: "Terminated",
                }
            default:
                return {
                    color: "bg-gray-50 text-gray-700 border-gray-200",
                    icon: Activity,
                    label: status,
                }
        }
    }

    const powerColor = (state: string | null) => {
        if (!state) return "text-gray-400"
        if (state === "poweredOn") return "text-emerald-600"
        if (state === "poweredOff") return "text-red-500"
        return "text-amber-500"
    }

    // -------------------------------------------------------------------------
    // Parse connections
    // -------------------------------------------------------------------------
    const connections = instance?.guacamole_connections
        ? Object.entries(instance.guacamole_connections).map(([key, connId]) => {
            const protocol = getProtocolFromKey(key)
            const slug = getSlugFromKey(key)
            const config = PROTOCOL_CONFIG[protocol] || PROTOCOL_CONFIG.ssh
            return {
                key,
                connId,
                protocol,
                slug,
                config,
                url: buildGuacamoleClientUrl(connId),
            }
        })
        : []

    const hasConnections = connections.length > 0
    const isProvisioning = instance?.status === "provisioning"
    const isRunning = instance?.status === "running"
    const hasIp = !!instance?.ip_address

    // -------------------------------------------------------------------------
    // Loading state
    // -------------------------------------------------------------------------
    if (isLoading && !instance) {
        return (
            <div className="min-h-screen bg-[#fafafa]">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center justify-center gap-4 py-24">
                        <Loader2 className="h-10 w-10 animate-spin text-[#1ca9b1]" />
                        <p className="text-[14px] text-[#727373]">
                            Loading instance details...
                        </p>
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
                                {error?.includes("not found")
                                    ? "Instance Not Found"
                                    : "Failed to Load Instance"}
                            </h2>
                            <p className="mt-2 max-w-md text-[14px] text-red-700">
                                {error ||
                                    "The lab instance you're looking for doesn't exist or you don't have permission to view it."}
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

    const status = statusConfig(instance.status)
    const StatusIcon = status.icon

    // -------------------------------------------------------------------------
    // Main view
    // -------------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-[#fafafa]">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
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
                        <div className="flex items-center gap-3">
                            <h1 className="text-[22px] font-bold text-[#3a3a3a]">
                                {instance.vm_name || "Lab Instance"}
                            </h1>
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
                                    status.color
                                )}
                            >
                                <StatusIcon
                                    className={cn(
                                        "h-3.5 w-3.5",
                                        instance.status === "provisioning" && "animate-spin"
                                    )}
                                />
                                {status.label}
                            </span>
                        </div>
                        <p className="mt-1.5 text-[13px] text-[#727373] font-mono">
                            {instance.id}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {lastRefreshed && (
                            <span className="text-[12px] text-[#727373]">
                                Updated {lastRefreshed.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                </div>

                {/* Action Bar */}
                <div className="mb-8 flex flex-wrap items-center gap-3 rounded-xl border border-[#e8e8e8] bg-white p-3">
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className={cn(
                            "flex items-center gap-2 rounded-lg border border-[#e8e8e8] bg-white px-4 py-2",
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
                        Refresh
                    </button>

                    {instance.status === "running" && (
                        <button
                            onClick={handleStop}
                            disabled={isLoading}
                            className={cn(
                                "flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2",
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
                            "flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2",
                            "text-[13px] font-medium text-red-700",
                            "hover:bg-red-100 transition-all duration-200 disabled:opacity-50"
                        )}
                    >
                        <Trash2 className="h-4 w-4" />
                        Terminate
                    </button>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Left Column: Instance Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* VM Status Overview */}
                        <div className="rounded-2xl border border-[#e8e8e8] bg-white p-6">
                            <h2 className="mb-5 text-[16px] font-semibold text-[#3a3a3a]">
                                Instance Overview
                            </h2>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {/* Power State */}
                                <div className="flex items-start gap-4 rounded-xl bg-[#fafafa] p-4">
                                    <div
                                        className={cn(
                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                                            instance.power_state === "poweredOn"
                                                ? "bg-emerald-100"
                                                : "bg-red-100"
                                        )}
                                    >
                                        <Power
                                            className={cn(
                                                "h-5 w-5",
                                                powerColor(instance.power_state)
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                                            Power State
                                        </p>
                                        <p
                                            className={cn(
                                                "mt-1 text-[15px] font-semibold",
                                                powerColor(instance.power_state)
                                            )}
                                        >
                                            {instance.power_state || "Unknown"}
                                        </p>
                                    </div>
                                </div>

                                {/* IP Address */}
                                <div className="flex items-start gap-4 rounded-xl bg-[#fafafa] p-4">
                                    <div
                                        className={cn(
                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                                            hasIp ? "bg-emerald-100" : "bg-amber-100"
                                        )}
                                    >
                                        {hasIp ? (
                                            <Wifi className="h-5 w-5 text-emerald-600" />
                                        ) : (
                                            <WifiOff className="h-5 w-5 text-amber-600" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                                            IP Address
                                        </p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <p className="text-[15px] font-semibold text-[#3a3a3a] truncate">
                                                {instance.ip_address || "Not assigned"}
                                            </p>
                                            {instance.ip_address && (
                                                <button
                                                    onClick={() =>
                                                        handleCopy(instance.ip_address!, "ip")
                                                    }
                                                    className="shrink-0 text-[#727373] hover:text-[#1ca9b1] transition-colors"
                                                    title="Copy IP"
                                                >
                                                    {copiedKey === "ip" ? (
                                                        <Check className="h-4 w-4 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* VM Name */}
                                <div className="flex items-start gap-4 rounded-xl bg-[#fafafa] p-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100">
                                        <Monitor className="h-5 w-5 text-sky-600" />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                                            VM Name
                                        </p>
                                        <p className="mt-1 text-[15px] font-semibold text-[#3a3a3a]">
                                            {instance.vm_name || "—"}
                                        </p>
                                    </div>
                                </div>

                                {/* vCenter */}
                                <div className="flex items-start gap-4 rounded-xl bg-[#fafafa] p-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                                        <Server className="h-5 w-5 text-violet-600" />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                                            vCenter Host
                                        </p>
                                        <p className="mt-1 text-[15px] font-semibold text-[#3a3a3a]">
                                            {instance.vcenter_host || "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Timestamps */}
                            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[#e8e8e8] pt-5 sm:grid-cols-3">
                                <div>
                                    <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Created
                                    </p>
                                    <p className="mt-1 text-[13px] text-[#3a3a3a]">
                                        {instance.created_at
                                            ? new Date(instance.created_at).toLocaleString()
                                            : "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                                        <Clock className="h-3.5 w-3.5" />
                                        Started
                                    </p>
                                    <p className="mt-1 text-[13px] text-[#3a3a3a]">
                                        {instance.started_at
                                            ? new Date(instance.started_at).toLocaleString()
                                            : "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                                        <Shield className="h-3.5 w-3.5" />
                                        Expires
                                    </p>
                                    <p className="mt-1 text-[13px] text-[#3a3a3a]">
                                        {instance.expires_at
                                            ? new Date(instance.expires_at).toLocaleString()
                                            : "—"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Guacamole Connections */}
                        <div className="rounded-2xl border border-[#e8e8e8] bg-white p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-[16px] font-semibold text-[#3a3a3a]">
                                        Remote Connections
                                    </h2>
                                    <p className="mt-1 text-[13px] text-[#727373]">
                                        {isProvisioning && !hasIp
                                            ? "Waiting for VM to receive an IP address..."
                                            : hasConnections
                                                ? `${connections.length} connection${connections.length > 1 ? "s" : ""} available`
                                                : "No connections configured"}
                                    </p>
                                </div>
                                {isProvisioning && (
                                    <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[12px] font-medium text-amber-700">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Provisioning
                                    </span>
                                )}
                            </div>

                            {/* Provisioning State */}
                            {isProvisioning && !hasConnections && (
                                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#e8e8e8] bg-[#fafafa] py-12">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                                        <WifiOff className="h-6 w-6 text-amber-600" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[14px] font-medium text-[#3a3a3a]">
                                            Waiting for network...
                                        </p>
                                        <p className="mt-1 max-w-sm text-[13px] text-[#727373]">
                                            Guacamole connections will be created automatically once the VM receives an IP address. This usually takes 30–60 seconds.
                                        </p>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2 text-[12px] text-[#727373]">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1ca9b1]" />
                                        Polling every 15 seconds
                                    </div>
                                </div>
                            )}

                            {/* Connections Grid */}
                            {hasConnections && (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {connections.map(({ key, connId, protocol, slug, config, url }) => {
                                        const ProtocolIcon = config.icon
                                        return (
                                            <div
                                                key={key}
                                                className={cn(
                                                    "group relative flex flex-col gap-4 rounded-xl border p-5 transition-all duration-200",
                                                    config.border,
                                                    config.bg,
                                                    "hover:shadow-md hover:-translate-y-0.5"
                                                )}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={cn(
                                                                "flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm",
                                                                config.color
                                                            )}
                                                        >
                                                            <ProtocolIcon className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p
                                                                className={cn(
                                                                    "text-[14px] font-bold",
                                                                    config.color
                                                                )}
                                                            >
                                                                {config.label}
                                                            </p>
                                                            <p className="text-[12px] text-[#727373]">
                                                                {slug}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-700 shadow-sm">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Ready
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
                                                        <span className="text-[12px] text-[#727373]">
                                                            Connection ID
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <code className="text-[12px] font-mono text-[#3a3a3a]">
                                                                {connId.slice(0, 12)}...
                                                            </code>
                                                            <button
                                                                onClick={() => handleCopy(connId, key)}
                                                                className="text-[#727373] hover:text-[#1ca9b1] transition-colors"
                                                            >
                                                                {copiedKey === key ? (
                                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                                ) : (
                                                                    <Copy className="h-3.5 w-3.5" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
                                                        <span className="text-[12px] text-[#727373]">
                                                            Port
                                                        </span>
                                                        <span className="text-[12px] font-mono font-semibold text-[#3a3a3a]">
                                                            {config.port}
                                                        </span>
                                                    </div>
                                                </div>

                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={cn(
                                                        "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5",
                                                        "text-[13px] font-semibold text-white shadow-sm",
                                                        "transition-all duration-200 hover:shadow-md active:scale-[0.98]",
                                                        protocol === "ssh" &&
                                                        "bg-violet-600 hover:bg-violet-700",
                                                        protocol === "rdp" &&
                                                        "bg-sky-600 hover:bg-sky-700",
                                                        protocol === "vnc" &&
                                                        "bg-amber-600 hover:bg-amber-700"
                                                    )}
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                    Open {config.label} Session
                                                </a>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* No connections state (non-provisioning) */}
                            {!isProvisioning && !hasConnections && (
                                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#e8e8e8] bg-[#fafafa] py-12">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                        <Monitor className="h-6 w-6 text-slate-400" />
                                    </div>
                                    <p className="text-[14px] font-medium text-[#727373]">
                                        No remote connections available
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Quick Info & Legacy Connection */}
                    <div className="space-y-6">
                        {/* Legacy Single Connection (if exists) */}
                        {instance.connection_url && isRunning && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                                <div className="mb-4 flex items-center gap-2 text-emerald-800">
                                    <Monitor className="h-5 w-5" />
                                    <h3 className="text-[14px] font-bold">
                                        Primary Connection
                                    </h3>
                                </div>
                                <p className="mb-4 text-[13px] text-emerald-700">
                                    Direct link to the main Guacamole session for this lab instance.
                                </p>
                                <a
                                    href={instance.connection_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                        "flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3",
                                        "text-[14px] font-bold text-white",
                                        "shadow-lg shadow-emerald-600/20",
                                        "hover:bg-emerald-700 transition-all duration-200"
                                    )}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Open Lab Desktop
                                </a>
                            </div>
                        )}

                        {/* Instance Lifecycle Card */}
                        <div className="rounded-2xl border border-[#e8e8e8] bg-white p-6">
                            <h3 className="mb-4 text-[14px] font-bold text-[#3a3a3a]">
                                Lifecycle
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[13px] text-[#727373]">
                                        Status
                                    </span>
                                    <span
                                        className={cn(
                                            "rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
                                            status.color
                                        )}
                                    >
                                        {status.label}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[13px] text-[#727373]">
                                        VM UUID
                                    </span>
                                    <code className="text-[12px] font-mono text-[#3a3a3a]">
                                        {instance.vm_uuid
                                            ? `${instance.vm_uuid.slice(0, 8)}...`
                                            : "—"}
                                    </code>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[13px] text-[#727373]">
                                        Trainee
                                    </span>
                                    <span className="text-[13px] text-[#3a3a3a]">
                                        {instance.trainee_id}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Info Card */}
                        <div className="rounded-2xl border border-[#e8e8e8] bg-white p-6">
                            <h3 className="mb-3 text-[14px] font-bold text-[#3a3a3a]">
                                About Connections
                            </h3>
                            <div className="space-y-3 text-[13px] text-[#727373] leading-relaxed">
                                <p>
                                    <strong className="text-[#3a3a3a]">
                                        SSH
                                    </strong>{" "}
                                    — Terminal access via secure shell on port 22.
                                </p>
                                <p>
                                    <strong className="text-[#3a3a3a]">
                                        RDP
                                    </strong>{" "}
                                    — Full remote desktop experience on port 3389.
                                </p>
                                <p>
                                    <strong className="text-[#3a3a3a]">
                                        VNC
                                    </strong>{" "}
                                    — Lightweight remote framebuffer on port 5901.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}