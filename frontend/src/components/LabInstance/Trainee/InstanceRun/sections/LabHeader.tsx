// src/components/LabInstance/Trainee/InstanceRun/sections/LabHeader.tsx
import { useState, useEffect, useRef } from "react"
import {
    ArrowLeft,
    Monitor,
    Power,
    RefreshCw,
    PowerOff,
    Loader2,
    Terminal,
    Laptop,
    ChevronDown,
    Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusBadge } from "../shared/StatusBadge"
import { TimeDisplay } from "../shared/TimeDisplay"
import type { ConnectionEntry, ConnectionProtocol } from "../hooks/useLabConnections"

interface LabHeaderProps {
    instanceId: string
    labName?: string
    status: string
    powerState: string | null | undefined
    formattedTime: string | null
    minutesRemaining: number | null
    isReady: boolean
    isRefreshing: boolean
    isTerminating: boolean
    entries: ConnectionEntry[]
    activeKey: string | null
    onBack: () => void
    onRefresh: () => void
    onTerminate: () => void
    onSelectConnection: (key: string) => void
}

const PROTOCOL_ICONS: Record<ConnectionProtocol, React.ElementType> = {
    ssh: Terminal,
    vnc: Monitor,
    rdp: Laptop,
    unknown: Monitor,
}

function ProtocolIcon({ protocol, className }: { protocol: ConnectionProtocol; className?: string }) {
    const Icon = PROTOCOL_ICONS[protocol] || Monitor
    return <Icon className={className} />
}

export function LabHeader({
    instanceId,
    labName,
    status,
    powerState,
    formattedTime,
    minutesRemaining,
    isReady,
    isRefreshing,
    isTerminating,
    entries,
    activeKey,
    onBack,
    onRefresh,
    onTerminate,
    onSelectConnection,
}: LabHeaderProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const hasConnections = entries.length > 0
    const activeEntry = entries.find(e => e.key === activeKey)

    // Close dropdown on outside click
    useEffect(() => {
        if (!dropdownOpen) return
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [dropdownOpen])

    return (
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e8e8e8] bg-white px-4 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-[#727373] hover:text-[#1ca9b1] transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Instance Details
                </button>
                <span className="text-[#c4c4c4]">•</span>
                <h1 className="text-[14px] font-semibold text-[#3a3a3a] truncate">
                    {labName || "Lab Instance"}
                </h1>
                <StatusBadge status={status} />
            </div>

            <div className="flex items-center gap-4 text-[12px] text-[#727373]">
                {/* Connection Switcher */}
                {hasConnections ? (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(prev => !prev)}
                            className={cn(
                                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors",
                                dropdownOpen
                                    ? "border-[#1ca9b1] bg-[#1ca9b1]/5 text-[#1ca9b1]"
                                    : "border-[#e8e8e8] bg-white hover:border-[#1ca9b1] hover:text-[#1ca9b1]"
                            )}
                            title="Switch connection"
                        >
                            {activeEntry ? (
                                <>
                                    <ProtocolIcon protocol={activeEntry.protocol} className="h-3.5 w-3.5" />
                                    <span className="max-w-[120px] truncate">{activeEntry.key}</span>
                                </>
                            ) : (
                                <>
                                    <Monitor className="h-3.5 w-3.5" />
                                    <span>Select connection</span>
                                </>
                            )}
                            <ChevronDown className={cn("h-3 w-3 transition-transform", dropdownOpen && "rotate-180")} />
                        </button>

                        {dropdownOpen && (
                            <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-[#e8e8e8] bg-white py-1 shadow-lg">
                                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#c4c4c4]">
                                    {entries.length} connection{entries.length !== 1 ? "s" : ""} available
                                </div>
                                {entries.map(entry => {
                                    const isActive = entry.key === activeKey
                                    return (
                                        <button
                                            key={entry.key}
                                            onClick={() => {
                                                onSelectConnection(entry.key)
                                                setDropdownOpen(false)
                                            }}
                                            className={cn(
                                                "flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors",
                                                isActive
                                                    ? "bg-[#1ca9b1]/5 text-[#1ca9b1]"
                                                    : "text-[#3a3a3a] hover:bg-[#f9f9f9]"
                                            )}
                                        >
                                            <ProtocolIcon protocol={entry.protocol} className="h-3.5 w-3.5 shrink-0" />
                                            <span className="flex-1 truncate">{entry.key}</span>
                                            {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <Power className="h-3.5 w-3.5" />
                        <span>No connections</span>
                    </div>
                )}

                {/* Timer */}
                {isReady ? (
                    <TimeDisplay formattedTime={formattedTime} minutesRemaining={minutesRemaining} />
                ) : (
                    <div className="flex items-center gap-1.5 border-l border-[#e8e8e8] pl-4 text-[#c4c4c4]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="text-[11px]">Waiting for lab...</span>
                    </div>
                )}

                <div className="flex items-center gap-1.5 border-l border-[#e8e8e8] pl-4">
                    <Power className="h-3.5 w-3.5" />
                    <span className="capitalize">{powerState ?? "unknown"}</span>
                </div>

                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-1 border-l border-[#e8e8e8] pl-4 text-[#727373] hover:text-[#1ca9b1] disabled:opacity-50 transition-colors"
                    title="Refresh status"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                </button>

                <button
                    onClick={onTerminate}
                    disabled={isTerminating}
                    className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium border transition-colors",
                        isTerminating
                            ? "bg-red-50 text-red-300 border-red-100 cursor-not-allowed"
                            : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
                    )}
                    title="Terminate lab instance"
                >
                    <PowerOff className="h-3.5 w-3.5" />
                    {isTerminating ? "Terminating..." : "Terminate"}
                </button>
            </div>
        </header>
    )
}