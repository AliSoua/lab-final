// src/components/LabInstance/list/LabInstanceCard.tsx
import { useNavigate } from "react-router-dom"
import {
    Calendar,
    Clock,
    Monitor,
    Wifi,
    WifiOff,
    Power,
    MapPin,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusBadge } from "./StatusBadge"
import type { LabInstance } from "@/types/LabInstance/LabInstance"

interface LabInstanceCardProps {
    instance: LabInstance
}

export function LabInstanceCard({ instance }: LabInstanceCardProps) {
    const navigate = useNavigate()

    const handleClick = () => {
        navigate(`/lab-instances/${instance.id}`)
    }

    const hasIp = !!instance.ip_address

    return (
        <div
            onClick={handleClick}
            className={cn(
                "group relative flex flex-col gap-4 rounded-2xl border border-[#e8e8e8] bg-white p-5",
                "cursor-pointer transition-all duration-200",
                "hover:border-[#1ca9b1]/30 hover:shadow-lg hover:-translate-y-0.5"
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-bold text-[#3a3a3a] truncate group-hover:text-[#1ca9b1] transition-colors">
                        {instance.vm_name || "Lab Instance"}
                    </h3>
                    <p className="mt-0.5 text-[12px] font-mono text-[#727373] truncate">
                        {instance.id}
                    </p>
                </div>
                <StatusBadge status={instance.status} />
            </div>

            {/* Meta grid */}
            <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-[13px] text-[#727373]">
                    <Monitor className="h-3.5 w-3.5 shrink-0 text-[#c4c4c4]" />
                    <span className="truncate">
                        {instance.vcenter_host || "No host assigned"}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-[13px] text-[#727373]">
                    {hasIp ? (
                        <>
                            <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            <span className="font-mono text-[#3a3a3a]">
                                {instance.ip_address}
                            </span>
                        </>
                    ) : (
                        <>
                            <WifiOff className="h-3.5 w-3.5 shrink-0 text-[#c4c4c4]" />
                            <span>No IP assigned</span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2 text-[13px] text-[#727373]">
                    <Power className="h-3.5 w-3.5 shrink-0 text-[#c4c4c4]" />
                    <span
                        className={cn(
                            instance.power_state === "poweredOn" &&
                            "text-emerald-600 font-medium",
                            instance.power_state === "poweredOff" &&
                            "text-red-500 font-medium"
                        )}
                    >
                        {instance.power_state || "Unknown"}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-[13px] text-[#727373]">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-[#c4c4c4]" />
                    <span>
                        {instance.created_at
                            ? new Date(instance.created_at).toLocaleDateString()
                            : "—"}
                    </span>
                </div>

                {instance.expires_at && (
                    <div className="flex items-center gap-2 text-[13px] text-[#727373]">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-[#c4c4c4]" />
                        <span>
                            Expires{" "}
                            {new Date(instance.expires_at).toLocaleDateString()}
                        </span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-1 flex items-center justify-between border-t border-[#f0f0f0] pt-3">
                <span className="text-[12px] text-[#c4c4c4]">
                    Click to view details
                </span>
                <MapPin className="h-3.5 w-3.5 text-[#c4c4c4] group-hover:text-[#1ca9b1] transition-colors" />
            </div>
        </div>
    )
}