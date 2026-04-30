// src/components/LabInstance/Trainee/InstanceRun/shared/StatusBadge.tsx
import { useMemo } from "react"
import { cn } from "@/lib/utils"

export function StatusBadge({ status }: { status: string }) {
    const cls = useMemo(() => {
        switch (status) {
            case "running": return "bg-emerald-50 text-emerald-700"
            case "provisioning": return "bg-amber-50 text-amber-700"
            case "failed":
            case "expired": return "bg-red-50 text-red-700"
            default: return "bg-slate-50 text-slate-700"
        }
    }, [status])

    return (
        <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            cls,
        )}>
            {status}
        </span>
    )
}