// src/components/LabInstance/list/StatusBadge.tsx
import { cn } from "@/lib/utils"
import {
    Loader2,
    CheckCircle2,
    PowerOff,
    XCircle,
    AlertCircle,
    Activity,
} from "lucide-react"

interface StatusBadgeProps {
    status: string
    className?: string
}

const STATUS_CONFIG: Record<
    string,
    { color: string; icon: React.ElementType; label: string }
> = {
    provisioning: {
        color: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Loader2,
        label: "Provisioning",
    },
    running: {
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
        label: "Running",
    },
    stopped: {
        color: "bg-slate-50 text-slate-700 border-slate-200",
        icon: PowerOff,
        label: "Stopped",
    },
    terminated: {
        color: "bg-red-50 text-red-700 border-red-200",
        icon: XCircle,
        label: "Terminated",
    },
    failed: {
        color: "bg-red-50 text-red-700 border-red-200",
        icon: AlertCircle,
        label: "Failed",
    },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] || {
        color: "bg-gray-50 text-gray-700 border-gray-200",
        icon: Activity,
        label: status,
    }
    const Icon = config.icon

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                config.color,
                className
            )}
        >
            <Icon
                className={cn("h-3 w-3", status === "provisioning" && "animate-spin")}
            />
            {config.label}
        </span>
    )
}