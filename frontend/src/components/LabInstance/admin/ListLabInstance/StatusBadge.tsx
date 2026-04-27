// src/components/LabInstance/admin/ListLabInstance/StatusBadge.tsx
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
    status: string
}

const statusStyles: Record<string, string> = {
    provisioning: "bg-amber-50 text-amber-700 border-amber-200",
    running: "bg-[#e6f7f8] text-[#1ca9b1] border-[#1ca9b1]/20",
    stopped: "bg-gray-100 text-gray-600 border-gray-200",
    terminated: "bg-slate-100 text-slate-500 border-slate-200",
    failed: "bg-red-50 text-red-700 border-red-200",
}

export function StatusBadge({ status }: StatusBadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                statusStyles[status] || "bg-gray-100 text-gray-600 border-gray-200"
            )}
        >
            {status}
        </span>
    )
}