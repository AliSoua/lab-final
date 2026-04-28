// src/components/LabInstance/Trainee/InstanceDetail/StatusBadge.tsx
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
    status: string
    className?: string
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    provisioning: { color: "text-amber-600", label: "Provisioning" },
    running: { color: "text-emerald-600", label: "Running" },
    stopped: { color: "text-[#a0a0a0]", label: "Stopped" },
    terminated: { color: "text-rose-600", label: "Terminated" },
    failed: { color: "text-rose-600", label: "Failed" },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] || {
        color: "text-[#a0a0a0]",
        label: status,
    }

    return (
        <span className={cn("text-[12px] font-medium", config.color, className)}>
            {config.label}
        </span>
    )
}