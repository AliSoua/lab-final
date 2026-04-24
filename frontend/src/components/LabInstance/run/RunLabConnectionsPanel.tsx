// src/components/LabInstance/run/RunLabConnectionsPanel.tsx
import { Monitor, Terminal, Server, Calendar, Clock, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LabInstance } from "@/types/LabInstance/LabInstance"

interface ConnectionsPanelProps {
    instance: LabInstance
    entries: [string, string][]
    activeKey: string | null
    onSelect: (key: string) => void
}

const PROTOCOL_CONFIG: Record<
    string,
    { label: string; icon: React.ElementType; tint: string; port: number }
> = {
    ssh: { label: "SSH", icon: Terminal, tint: "text-violet-700 bg-violet-50 border-violet-200", port: 22 },
    rdp: { label: "RDP", icon: Monitor, tint: "text-sky-700 bg-sky-50 border-sky-200", port: 3389 },
    vnc: { label: "VNC", icon: Monitor, tint: "text-amber-700 bg-amber-50 border-amber-200", port: 5901 },
}

function parseKey(key: string): { slug: string; protocol: string } {
    const parts = key.split("_")
    const protocol = (parts[parts.length - 1] || "ssh").toLowerCase()
    const slug = parts.slice(0, -1).join("_") || key
    return { slug, protocol }
}

export function RunLabConnectionsPanel({
    instance,
    entries,
    activeKey,
    onSelect,
}: ConnectionsPanelProps) {
    return (
        <div className="flex h-full flex-col overflow-y-auto bg-[#f9f9f9] p-4">
            <div className="mb-4">
                <h2 className="text-[13px] font-bold uppercase tracking-wide text-[#727373]">
                    Connections
                </h2>
                <p className="mt-1 text-[12px] text-[#727373]">
                    Switch between available protocols to reload the console.
                </p>
            </div>

            <div className="flex flex-col gap-2">
                {entries.map(([key, connId]) => {
                    const { slug, protocol } = parseKey(key)
                    const cfg = PROTOCOL_CONFIG[protocol] || PROTOCOL_CONFIG.ssh
                    const Icon = cfg.icon
                    const isActive = key === activeKey
                    return (
                        <button
                            key={key}
                            onClick={() => onSelect(key)}
                            className={cn(
                                "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                                cfg.tint,
                                isActive
                                    ? "ring-2 ring-[#1ca9b1] shadow-sm"
                                    : "hover:shadow-sm",
                            )}
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-semibold">
                                        {cfg.label}
                                    </span>
                                    <span className="text-[11px] text-[#727373]">
                                        port {cfg.port}
                                    </span>
                                </div>
                                <p className="mt-0.5 text-[12px] text-[#3a3a3a] truncate">
                                    {slug}
                                </p>
                                <p className="mt-0.5 text-[10px] font-mono text-[#727373] truncate">
                                    {connId}
                                </p>
                            </div>
                        </button>
                    )
                })}
            </div>

            <div className="mt-6 rounded-xl border border-[#e8e8e8] bg-white p-4">
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#727373]">
                    Instance
                </h3>
                <div className="mt-3 space-y-2.5 text-[12px]">
                    <InfoRow
                        icon={Server}
                        label="VM"
                        value={instance.vm_name || "—"}
                    />
                    <InfoRow
                        icon={Shield}
                        label="vCenter"
                        value={instance.vcenter_host || "—"}
                    />
                    <InfoRow
                        icon={Calendar}
                        label="Started"
                        value={
                            instance.started_at
                                ? new Date(instance.started_at).toLocaleString()
                                : "—"
                        }
                    />
                    <InfoRow
                        icon={Clock}
                        label="Expires"
                        value={
                            instance.expires_at
                                ? new Date(instance.expires_at).toLocaleString()
                                : "—"
                        }
                    />
                </div>
            </div>
        </div>
    )
}

function InfoRow({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType
    label: string
    value: string
}) {
    return (
        <div className="flex items-start gap-2">
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#727373]" />
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#727373]">
                    {label}
                </p>
                <p className="text-[12px] text-[#3a3a3a] truncate">{value}</p>
            </div>
        </div>
    )
}
