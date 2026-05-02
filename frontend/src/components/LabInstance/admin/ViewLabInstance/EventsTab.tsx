// src/components/LabInstance/admin/ViewLabInstance/EventsTab.tsx
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Activity, Clock, Hash, FileJson, ChevronDown, ChevronUp, Shield, Radio } from "lucide-react"
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

function SeverityDot({ severity }: { severity?: string }) {
    const color =
        severity === "error" ? "bg-red-500"
            : severity === "warning" ? "bg-amber-500"
                : severity === "debug" ? "bg-purple-500"
                    : "bg-[#1ca9b1]"
    return (
        <span className={cn("inline-block h-2 w-2 rounded-full", color)} title={`Severity: ${severity || "info"}`} />
    )
}

function SourceBadge({ source }: { source?: string }) {
    if (!source) return null
    return (
        <span className="inline-flex items-center gap-1 text-[10px] text-[#727373] bg-[#f5f5f5] px-1.5 py-0.5 rounded border border-[#e8e8e8]">
            <Radio className="h-2.5 w-2.5" />
            {source}
        </span>
    )
}

function EventCodeBadge({ code }: { code?: string | null }) {
    if (!code) return null
    return (
        <span className="text-[10px] font-mono text-[#1ca9b1] bg-[#1ca9b1]/10 px-1.5 py-0.5 rounded">
            {code}
        </span>
    )
}

function MetadataBlock({ metadata }: { metadata: Record<string, unknown> | null | undefined }) {
    const [expanded, setExpanded] = useState(false)

    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        return null
    }

    const entries = Object.entries(metadata)
    if (entries.length === 0) return null

    const visible = expanded ? entries : entries.slice(0, 3)

    return (
        <div className="mt-2 p-2.5 bg-[#f9f9f9] rounded-lg border border-[#e8e8e8]">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                    <FileJson className="h-3 w-3 text-[#c4c4c4]" />
                    <span className="text-[10px] font-medium text-[#727373] uppercase tracking-wider">
                        Metadata
                    </span>
                </div>
                {entries.length > 3 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
                        className="flex items-center gap-0.5 text-[10px] text-[#1ca9b1] hover:underline"
                    >
                        {expanded ? (
                            <>Less <ChevronUp className="h-3 w-3" /></>
                        ) : (
                            <>+{entries.length - 3} more <ChevronDown className="h-3 w-3" /></>
                        )}
                    </button>
                )}
            </div>
            <div className="space-y-1">
                {visible.map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-[11px]">
                        <span className="text-[#727373] font-mono shrink-0">{key}:</span>
                        <span className="text-[#3a3a3a] font-mono break-all">
                            {typeof value === "string" ? value : JSON.stringify(value)}
                        </span>
                    </div>
                ))}
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
                                className="px-5 py-4 transition-colors hover:bg-[#f9f9f9]"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="mt-0.5 flex flex-col gap-1.5 items-center">
                                            <EventTypeBadge eventType={event.event_type} />
                                            <SeverityDot severity={event.severity} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-[13px] text-[#3a3a3a] leading-relaxed">
                                                    {event.message}
                                                </p>
                                                <EventCodeBadge code={event.event_code} />
                                            </div>
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
                                                <SourceBadge source={event.source} />
                                            </div>
                                            <MetadataBlock metadata={event.metadata} />
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