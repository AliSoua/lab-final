// src/components/LabInstance/admin/ViewLabInstance/EventTypeBadge.tsx
import { cn } from "@/lib/utils"

interface EventTypeBadgeProps {
    eventType: string
}

const typeStyles: Record<string, string> = {
    vm_created: "bg-emerald-50 text-emerald-700 border-emerald-200",
    vm_started: "bg-[#e6f7f8] text-[#1ca9b1] border-[#1ca9b1]/20",
    vm_stopped: "bg-amber-50 text-amber-700 border-amber-200",
    vm_terminated: "bg-red-50 text-red-700 border-red-200",
    task_enqueued: "bg-blue-50 text-blue-700 border-blue-200",
    task_started: "bg-violet-50 text-violet-700 border-violet-200",
    task_completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    task_failed: "bg-red-50 text-red-700 border-red-200",
    connection_created: "bg-cyan-50 text-cyan-700 border-cyan-200",
    session_updated: "bg-gray-100 text-gray-600 border-gray-200",
    error: "bg-red-50 text-red-700 border-red-200",
}

export function EventTypeBadge({ eventType }: EventTypeBadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                typeStyles[eventType] || "bg-gray-100 text-gray-600 border-gray-200"
            )}
        >
            {eventType.replace(/_/g, " ")}
        </span>
    )
}