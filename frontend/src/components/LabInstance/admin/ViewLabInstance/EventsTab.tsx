// src/components/LabInstance/admin/ViewLabInstance/EventsTab.tsx
import { useEffect } from "react"
import { cn } from "@/lib/utils"
import { Activity, Clock, Hash, FileJson } from "lucide-react"
import { EventTypeBadge } from "./EventTypeBadge"
import type { LabInstanceEventLog } from "@/types/LabInstance/LabInstanceEvent"

interface EventsTabProps {
    instanceId: string
    events: LabInstanceEventLog[]
    total: number
    isLoading: boolean
    error: string | null
    onFetch: (instanceId: string, skip?: number, limit?: number) => void
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

function MetadataPreview({ metadata }: { metadata: Record<string, unknown> }) {
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

export function EventsTab({
    instanceId,
    events,
    total,
    isLoading,
    error,
    onFetch,
}: EventsTabProps) {
    useEffect(() => {
        onFetch(instanceId, 0, 100)
    }, [instanceId, onFetch])

    if (!isLoading && events.length === 0) {
        return (
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-6 w-6 text-[#c4c4c4]" />
                </div>
                <h3 className="text-sm font-medium text-[#3a3a3a]">No events</h3>
                <p className="text-xs text-[#727373] mt-1">
                    Audit events will appear here as operations are performed
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-[#727373]">
                    {total} event{total !== 1 ? "s" : ""} found
                </p>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">{error}</p>
                </div>
            )}

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
                                className={cn(
                                    "px-5 py-4 transition-colors hover:bg-[#f9f9f9]"
                                )}
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
                                            <div className="flex items-center gap-3 mt-1.5">
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
        </div>
    )
}