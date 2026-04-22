// src/components/LabDefinition/LabConnection/ProtocolBadge.tsx
import { cn } from "@/lib/utils"
import type { ConnectionProtocol } from "@/types/LabDefinition/LabConnection"

interface ProtocolBadgeProps {
    protocol: ConnectionProtocol
}

export function ProtocolBadge({ protocol }: ProtocolBadgeProps) {
    const styles = {
        ssh: "bg-emerald-50 text-emerald-700 border-emerald-200",
        rdp: "bg-blue-50 text-blue-700 border-blue-200",
        vnc: "bg-purple-50 text-purple-700 border-purple-200",
    }

    return (
        <span
            className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide border",
                styles[protocol]
            )}
        >
            {protocol}
        </span>
    )
}