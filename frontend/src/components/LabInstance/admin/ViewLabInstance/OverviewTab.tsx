// src/components/LabInstance/admin/ViewLabInstance/OverviewTab.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
    Server,
    Monitor,
    Globe,
    User,
    Clock,
    Info,
    Hash,
    Link2,
    AlertCircle,
    Copy,
    Check,
    Zap,
    Terminal,
    Cpu,
    HardDrive,
} from "lucide-react"
import type { LabInstance } from "@/types/LabInstance/LabInstance"

interface OverviewTabProps {
    instance: LabInstance
}

/* ─── Helpers ─── */

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    })
}

function timeAgo(dateStr: string | null | undefined): string {
    if (!dateStr) return "—"
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return "just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            /* noop */
        }
    }
    return (
        <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#f0f0f0] text-[#c4c4c4] hover:text-[#3a3a3a]"
            title="Copy"
        >
            {copied ? (
                <Check className="h-3 w-3 text-emerald-600" />
            ) : (
                <Copy className="h-3 w-3" />
            )}
        </button>
    )
}

function StatusBadge({ status }: { status?: string | null }) {
    const map: Record<string, string> = {
        running: "bg-emerald-50 text-emerald-700 border-emerald-200",
        provisioning: "bg-amber-50 text-amber-700 border-amber-200",
        terminating: "bg-orange-50 text-orange-700 border-orange-200",
        terminated: "bg-gray-50 text-gray-600 border-gray-200",
        stopped: "bg-gray-50 text-gray-600 border-gray-200",
        failed: "bg-red-50 text-red-700 border-red-200",
    }
    const dot =
        status === "running"
            ? "bg-emerald-500"
            : status === "provisioning"
                ? "bg-amber-500"
                : status === "failed"
                    ? "bg-red-500"
                    : "bg-gray-400"

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                map[status || ""] || "bg-gray-50 text-gray-600 border-gray-200"
            )}
        >
            <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
            {status || "unknown"}
        </span>
    )
}

function PowerBadge({ state }: { state?: string | null }) {
    const isOn = state?.toLowerCase() === "powered_on" || state?.toLowerCase() === "on"
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border",
                isOn
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-gray-50 text-gray-600 border-gray-200"
            )}
        >
            <Zap className={cn("h-3 w-3", isOn ? "text-emerald-500" : "text-gray-400")} />
            {state || "—"}
        </span>
    )
}

const LAUNCH_STAGES = [
    { key: "validated", label: "Validated" },
    { key: "vcenter_discovered", label: "vCenter" },
    { key: "vm_cloned", label: "Cloned" },
    { key: "vm_powered_on", label: "Power On" },
    { key: "ip_discovered", label: "IP Found" },
    { key: "guacamole_connected", label: "Guac" },
    { key: "finalized", label: "Ready" },
]

function LaunchStageStepper({ currentStage }: { currentStage?: string | null }) {
    const currentIndex = LAUNCH_STAGES.findIndex((s) => s.key === currentStage)
    return (
        <div className="flex flex-wrap items-center gap-y-2 gap-x-0.5">
            {LAUNCH_STAGES.map((stage, idx) => {
                const complete = currentIndex >= idx
                const current = currentIndex === idx
                return (
                    <div key={stage.key} className="flex items-center">
                        <div
                            className={cn(
                                "px-2 py-1 rounded text-[10px] font-medium border transition-colors",
                                complete
                                    ? "bg-[#1ca9b1]/10 text-[#1ca9b1] border-[#1ca9b1]/30"
                                    : "bg-gray-50 text-gray-400 border-gray-200",
                                current && "ring-1 ring-[#1ca9b1] shadow-sm"
                            )}
                            title={stage.key}
                        >
                            {stage.label}
                        </div>
                        {idx < LAUNCH_STAGES.length - 1 && (
                            <div
                                className={cn(
                                    "w-2.5 h-px mx-0.5",
                                    complete ? "bg-[#1ca9b1]" : "bg-gray-200"
                                )}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function InfoRow({
    icon: Icon,
    label,
    value,
    mono = false,
    highlight = false,
    copyable = false,
}: {
    icon: React.ElementType
    label: string
    value: string | null | undefined
    mono?: boolean
    highlight?: boolean
    copyable?: boolean
}) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-[#f0f0f0] last:border-0 group">
            <Icon className="h-4 w-4 text-[#c4c4c4] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                    {label}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <p
                        className={cn(
                            "text-[13px] text-[#3a3a3a] truncate",
                            mono && "font-mono",
                            highlight && "text-[#1ca9b1] font-medium"
                        )}
                    >
                        {value || "—"}
                    </p>
                    {copyable && value && <CopyButton text={value} />}
                </div>
            </div>
        </div>
    )
}

/* ─── Main Component ─── */

export function OverviewTab({ instance }: OverviewTabProps) {
    const sessionState = (instance.session_state ?? {}) as Record<string, any>
    const runtime = sessionState?.runtime_context
    const connections = (instance.guacamole_connections ?? {}) as
        | Record<string, string>
        | undefined

    return (
        <div className="space-y-4">
            {/* ── Header: Status + Launch Stage ── */}
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <StatusBadge status={instance.status} />
                        <div className="h-4 w-px bg-[#e8e8e8] hidden sm:block" />
                        <span className="text-[13px] text-[#727373]">
                            Launch stage:{" "}
                            <span className="font-medium text-[#3a3a3a] font-mono">
                                {instance.launch_stage || "—"}
                            </span>
                        </span>
                        {instance.current_step_index != null && (
                            <>
                                <div className="h-4 w-px bg-[#e8e8e8] hidden sm:block" />
                                <span className="text-[13px] text-[#727373]">
                                    Step:{" "}
                                    <span className="font-medium text-[#3a3a3a]">
                                        {instance.current_step_index}
                                    </span>
                                </span>
                            </>
                        )}
                    </div>
                    <LaunchStageStepper currentStage={instance.launch_stage} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ── VM Details ── */}
                <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#e8e8e8] bg-[#f9f9f9]">
                        <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-[#1ca9b1]" />
                            <h3 className="text-[13px] font-semibold text-[#3a3a3a]">
                                VM Details
                            </h3>
                        </div>
                    </div>
                    <div className="px-5">
                        <InfoRow
                            icon={Hash}
                            label="VM UUID"
                            value={instance.vm_uuid}
                            mono
                            copyable
                        />
                        <InfoRow icon={Server} label="VM Name" value={instance.vm_name} />
                        <InfoRow
                            icon={Globe}
                            label="IP Address"
                            value={instance.ip_address}
                            highlight
                            copyable
                        />
                        <InfoRow icon={Cpu} label="ESXi Host" value={instance.esxi_host} mono />
                        <InfoRow
                            icon={HardDrive}
                            label="vCenter Host"
                            value={instance.vcenter_host}
                            mono
                        />
                        <div className="flex items-start gap-3 py-2.5 border-b border-[#f0f0f0] last:border-0">
                            <Zap className="h-4 w-4 text-[#c4c4c4] shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                                    Power State
                                </p>
                                <div className="mt-0.5">
                                    <PowerBadge state={instance.power_state} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Identity & Ownership ── */}
                <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#e8e8e8] bg-[#f9f9f9]">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-[#1ca9b1]" />
                            <h3 className="text-[13px] font-semibold text-[#3a3a3a]">
                                Identity
                            </h3>
                        </div>
                    </div>
                    <div className="px-5">
                        <InfoRow icon={Hash} label="Instance ID" value={instance.id} mono copyable />
                        <InfoRow
                            icon={Hash}
                            label="Lab Definition ID"
                            value={instance.lab_definition_id}
                            mono
                            copyable
                        />
                        <InfoRow
                            icon={User}
                            label="Trainee ID"
                            value={instance.trainee_id}
                            mono
                            copyable
                        />
                        <InfoRow
                            icon={Hash}
                            label="Guide Version"
                            value={instance.guide_version_id || undefined}
                            mono
                        />
                    </div>
                </div>

                {/* ── Timeline ── */}
                <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#e8e8e8] bg-[#f9f9f9]">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-[#1ca9b1]" />
                            <h3 className="text-[13px] font-semibold text-[#3a3a3a]">
                                Timeline
                            </h3>
                        </div>
                    </div>
                    <div className="px-5">
                        <InfoRow
                            icon={Clock}
                            label="Created"
                            value={formatDate(instance.created_at)}
                        />
                        <InfoRow
                            icon={Clock}
                            label="Started"
                            value={formatDate(instance.started_at)}
                        />
                        <InfoRow
                            icon={Clock}
                            label="Stopped"
                            value={formatDate(instance.stopped_at)}
                        />
                        <InfoRow
                            icon={Clock}
                            label="Expires"
                            value={
                                instance.expires_at
                                    ? `${formatDate(instance.expires_at)} (${timeAgo(instance.expires_at)})`
                                    : undefined
                            }
                            highlight={!!instance.expires_at}
                        />
                    </div>
                </div>

                {/* ── Guacamole Connections ── */}
                <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#e8e8e8] bg-[#f9f9f9]">
                        <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-[#1ca9b1]" />
                            <h3 className="text-[13px] font-semibold text-[#3a3a3a]">
                                Guacamole Connections
                            </h3>
                            {connections && Object.keys(connections).length > 0 && (
                                <span className="text-[10px] font-medium text-[#1ca9b1] bg-[#1ca9b1]/10 px-1.5 py-0.5 rounded-full">
                                    {Object.keys(connections).length}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="px-5">
                        {connections && Object.keys(connections).length > 0 ? (
                            <div className="divide-y divide-[#f0f0f0]">
                                {Object.entries(connections).map(([key, connId]) => {
                                    const protocol = key.split("_").pop()?.toUpperCase()
                                    return (
                                        <div
                                            key={key}
                                            className="flex items-center justify-between py-2.5 group"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#1ca9b1]/10 text-[#1ca9b1] shrink-0">
                                                    {protocol}
                                                </span>
                                                <span className="text-[12px] text-[#727373] truncate">
                                                    {key}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[12px] font-mono text-[#3a3a3a]">
                                                    {connId}
                                                </span>
                                                <CopyButton text={connId} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="py-6 text-center">
                                <p className="text-xs text-[#c4c4c4]">
                                    No connections configured yet
                                </p>
                            </div>
                        )}

                        {/* Legacy single connection fallback */}
                        {(!connections || Object.keys(connections).length === 0) &&
                            instance.connection_url && (
                                <div className="pt-3 border-t border-[#f0f0f0]">
                                    <InfoRow
                                        icon={Link2}
                                        label="Legacy URL"
                                        value={instance.connection_url}
                                        mono
                                    />
                                </div>
                            )}
                    </div>
                </div>

                {/* ── Runtime Context (full width) ── */}
                {runtime && (
                    <div className="lg:col-span-2 border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-[#e8e8e8] bg-[#f9f9f9]">
                            <div className="flex items-center gap-2">
                                <Terminal className="h-4 w-4 text-[#1ca9b1]" />
                                <h3 className="text-[13px] font-semibold text-[#3a3a3a]">
                                    Runtime Context
                                </h3>
                            </div>
                        </div>
                        <div className="px-5 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1">
                                <InfoRow
                                    icon={Hash}
                                    label="Session ID"
                                    value={runtime.session_id}
                                    mono
                                    copyable
                                />
                                <InfoRow
                                    icon={Server}
                                    label="Default VM"
                                    value={runtime.default_vm}
                                />
                                <InfoRow
                                    icon={Clock}
                                    label="Session Started"
                                    value={
                                        runtime.started_at
                                            ? formatDate(runtime.started_at)
                                            : undefined
                                    }
                                />
                                <InfoRow
                                    icon={Clock}
                                    label="Session Expires"
                                    value={
                                        runtime.expires_at
                                            ? `${formatDate(runtime.expires_at)} (${timeAgo(runtime.expires_at)})`
                                            : undefined
                                    }
                                    highlight={!!runtime.expires_at}
                                />
                            </div>

                            {/* VM Mappings */}
                            {runtime.vm_mappings && runtime.vm_mappings.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-[11px] font-medium text-[#727373] uppercase tracking-wider mb-2">
                                        VM Mappings
                                    </p>
                                    <div className="space-y-2">
                                        {runtime.vm_mappings.map(
                                            (vm: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className="p-3 bg-[#f9f9f9] rounded-lg border border-[#e8e8e8]"
                                                >
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] text-[#727373]">
                                                                Name
                                                            </p>
                                                            <p className="text-[12px] font-medium text-[#3a3a3a] truncate">
                                                                {vm.vm_name}
                                                            </p>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] text-[#727373]">
                                                                IP
                                                            </p>
                                                            <p className="text-[12px] font-mono text-[#1ca9b1] truncate">
                                                                {vm.ip_address}
                                                            </p>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] text-[#727373]">
                                                                UUID
                                                            </p>
                                                            <p
                                                                className="text-[12px] font-mono text-[#3a3a3a] truncate"
                                                                title={vm.instance_id}
                                                            >
                                                                {vm.instance_id}
                                                            </p>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] text-[#727373]">
                                                                Host
                                                            </p>
                                                            <p className="text-[12px] font-mono text-[#3a3a3a] truncate">
                                                                {vm.hostname}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-1.5 flex items-center gap-1.5">
                                                        <span
                                                            className={cn(
                                                                "inline-block h-1.5 w-1.5 rounded-full",
                                                                vm.status === "running"
                                                                    ? "bg-emerald-500"
                                                                    : "bg-gray-400"
                                                            )}
                                                        />
                                                        <span className="text-[11px] text-[#727373] capitalize">
                                                            {vm.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Error Banner ── */}
            {instance.error_message && (
                <div className="border border-red-200 rounded-xl bg-red-50 overflow-hidden">
                    <div className="px-5 py-3 border-b border-red-200 bg-red-100/50">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <h3 className="text-[13px] font-semibold text-red-800">
                                Error
                            </h3>
                        </div>
                    </div>
                    <div className="px-5 py-3">
                        <p className="text-[13px] text-red-700 font-mono whitespace-pre-wrap">
                            {instance.error_message}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}