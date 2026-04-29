// src/components/LabInstance/admin/MonitoringDashboard/MonitoringEventList.tsx
import { cn } from "@/lib/utils"
import { Activity, Clock, Hash, FileJson, Server, ExternalLink } from "lucide-react"
import type { LabInstanceEventLog } from "@/types/LabInstance/LabInstanceEvent"

interface MonitoringEventListProps {
    events: LabInstanceEventLog[]
    isLoading: boolean
    onViewInstance: (instanceId: string) => void
}

function SkeletonRow() {
    return (
        <div className="animate-pulse flex gap-4 py-4 border-b border-[#f0f0f0] last:border-0">
            <div className="h-5 w-20 bg-[#f0f0f0] rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-[#f0f0f0] rounded" />
                <div className="h-3 w-1/2 bg-[#f0f0f0] rounded" />
            </div>
            <div className="h-4 w-24 bg-[#f0f0f0] rounded shrink-0" />
        </div>
    )
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    })
}

function EventTypeBadge({ eventType }: { eventType: string }) {
    const colorMap: Record<string, string> = {
        instance_auto_terminated: "bg-emerald-50 text-emerald-700 border-emerald-200",
        instance_auto_failed: "bg-amber-50 text-amber-700 border-amber-200",
        expired_instance_detected: "bg-blue-50 text-blue-700 border-blue-200",
        unhealthy_instance_detected: "bg-purple-50 text-purple-700 border-purple-200",
        auto_terminate_failed: "bg-red-50 text-red-700 border-red-200",
        auto_fail_failed: "bg-red-50 text-red-700 border-red-200",
    }

    return (
        <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border",
            colorMap[eventType] || "bg-slate-50 text-slate-700 border-slate-200"
        )}>
            {eventType.replace(/_/g, " ")}
        </span>
    )
}

function MetadataPreview({ metadata }: { metadata: Record<string, unknown> | null | undefined }) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        return null
    }

    const entries = Object.entries(metadata)
    if (entries.length === 0) return null

    return (
        <div className="mt-2 p-2 bg-[#f9f9f9] rounded-lg border border-[#e8e8e8]">
            <div className="flex items-center gap-1.5 mb-1">
                <FileJson className="h-3 w-3 text-[#c4c4c4]" />
                <span className="text-[10px] font-medium text-[#727373] uppercase tracking-wider">
                    Metadata
                </span>
            </div>
            <div className="space-y-1">
                {entries.slice(0, 3).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-[11px]">
                        <span className="text-[#727373] font-mono">{key}:</span>
                        <span className="text-[#3a3a3a] font-mono truncate">
                            {typeof value === "string" ? value : JSON.stringify(value)}
                        </span>
                    </div>
                ))}
                {entries.length > 3 && (
                    <span className="text-[10px] text-[#c4c4c4]">
                        +{entries.length - 3} more
                    </span>
                )}
            </div>
        </div>
    )
}

export function MonitoringEventList({
    events,
    isLoading,
    onViewInstance,
}: MonitoringEventListProps) {
    if (!isLoading && events.length === 0) {
        return (
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-6 w-6 text-[#c4c4c4]" />
                </div>
                <h3 className="text-sm font-medium text-[#3a3a3a]">No events</h3>
                <p className="text-xs text-[#727373] mt-1">
                    Monitoring events appear as the system processes instances
                </p>
            </div>
        )
    }

    return (
        <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="divide-y divide-[#f0f0f0]">
                {isLoading ? (
                    <>
                        <div className="px-5 py-4"><SkeletonRow /></div>
                        <div className="px-5 py-4"><SkeletonRow /></div>
                        <div className="px-5 py-4"><SkeletonRow /></div>
                    </>
                ) : (
                    events.map((event) => (
                        <div
                            key={event.id}
                            className="px-5 py-4 transition-colors hover:bg-[#f9f9f9]"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className="mt-0.5">
                                        <EventTypeBadge eventType={event.event_type} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] text-[#3a3a3a] leading-relaxed">
                                            {event.message}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                            <div className="flex items-center gap-1">
                                                <Hash className="h-3 w-3 text-[#c4c4c4]" />
                                                <span className="text-[10px] text-[#c4c4c4] font-mono">
                                                    {event.id.slice(0, 8)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Hash className="h-3 w-3 text-[#c4c4c4]" />
                                                <span className="text-[10px] text-[#c4c4c4] font-mono">
                                                    task {event.task_id.slice(0, 8)}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => onViewInstance(event.lab_instance_id)}
                                                className="inline-flex items-center gap-1 text-[10px] text-[#1ca9b1] hover:text-[#17959c] font-medium transition-colors"
                                            >
                                                <Server className="h-3 w-3" />
                                                {event.lab_instance_id.slice(0, 8)}
                                                <ExternalLink className="h-2.5 w-2.5" />
                                            </button>
                                        </div>
                                        <MetadataPreview metadata={event.metadata} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-[#727373]">
                                    <Clock className="h-3 w-3 text-[#c4c4c4]" />
                                    {formatDate(event.created_at)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}