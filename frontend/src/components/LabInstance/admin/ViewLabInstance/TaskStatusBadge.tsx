// src/components/LabInstance/admin/ViewLabInstance/TaskStatusBadge.tsx
import { cn } from "@/lib/utils"

interface TaskStatusBadgeProps {
    status: string
}

const statusStyles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    running: "bg-[#e6f7f8] text-[#1ca9b1] border-[#1ca9b1]/20",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    cancelled: "bg-gray-100 text-gray-600 border-gray-200",
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                statusStyles[status] || "bg-gray-100 text-gray-600 border-gray-200"
            )}
        >
            {status}
        </span>
    )
}
