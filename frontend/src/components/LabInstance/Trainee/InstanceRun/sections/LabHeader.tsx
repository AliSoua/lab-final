// src/components/LabInstance/Trainee/InstanceRun/sections/LabHeader.tsx
import { ArrowLeft, Monitor, Power, RefreshCw, PowerOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusBadge } from "../shared/StatusBadge"
import { TimeDisplay } from "../shared/TimeDisplay"

interface LabHeaderProps {
    instanceId: string
    labName?: string  // ← FIXED: Made optional
    status: string
    powerState: string | null | undefined
    formattedTime: string | null
    minutesRemaining: number | null
    connectionCount: number
    isRefreshing: boolean
    isTerminating: boolean
    onBack: () => void
    onRefresh: () => void
    onTerminate: () => void
}

export function LabHeader({
    instanceId,
    labName,
    status,
    powerState,
    formattedTime,
    minutesRemaining,
    connectionCount,
    isRefreshing,
    isTerminating,
    onBack,
    onRefresh,
    onTerminate,
}: LabHeaderProps) {
    const hasConnections = connectionCount > 0

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
                {hasConnections ? (
                    <div className="flex items-center gap-1.5">
                        <Monitor className="h-3.5 w-3.5" />
                        <span>
                            {connectionCount} connection{connectionCount !== 1 ? "s" : ""}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <Power className="h-3.5 w-3.5" />
                        <span>No connections</span>
                    </div>
                )}

                <TimeDisplay formattedTime={formattedTime} minutesRemaining={minutesRemaining} />

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