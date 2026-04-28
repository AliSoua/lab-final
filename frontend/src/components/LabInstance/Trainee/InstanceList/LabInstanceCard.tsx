// src/components/LabInstance/list/LabInstanceCard.tsx
import { useNavigate } from "react-router-dom"
import {
    Calendar,
    Clock,
    Power,
    ChevronRight,
    Timer,
    BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/LabInstance/Trainee/InstanceList/StatusBadge"
import type { MyLabInstance } from "@/types/LabInstance/Trainee/LabInstance"

interface LabInstanceCardProps {
    instance: MyLabInstance
}

export function LabInstanceCard({ instance }: LabInstanceCardProps) {
    const navigate = useNavigate()
    const lab = instance.lab_definition

    const handleClick = () => {
        navigate(`/lab-instances/${instance.id}`)
    }

    const isExpired =
        instance.time_remaining_minutes != null &&
        instance.time_remaining_minutes <= 0

    const isRunning = instance.status === "running"

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
                        {lab.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        {lab.difficulty && (
                            <span className="rounded-full bg-[#f8f8f8] px-2 py-0.5 text-[11px] font-medium text-[#727373]">
                                {lab.difficulty}
                            </span>
                        )}
                        {lab.track && (
                            <span className="rounded-full bg-[#f8f8f8] px-2 py-0.5 text-[11px] font-medium text-[#727373]">
                                {lab.track}
                            </span>
                        )}
                        {lab.category && (
                            <span className="rounded-full bg-[#f8f8f8] px-2 py-0.5 text-[11px] font-medium text-[#727373]">
                                {lab.category}
                            </span>
                        )}
                    </div>
                </div>
                <StatusBadge status={instance.status} />
            </div>

            {/* Meta grid */}
            <div className="space-y-2.5">
                {/* Time Remaining */}
                {instance.time_remaining_minutes != null && instance.time_remaining_minutes > 0 ? (
                    <div className="flex items-center gap-2 text-[13px]">
                        <Timer className="h-3.5 w-3.5 shrink-0 text-[#1ca9b1]" />
                        <span className="font-medium text-[#3a3a3a]">
                            {instance.time_remaining_minutes} min remaining
                        </span>
                    </div>
                ) : instance.time_remaining_minutes != null && isExpired ? (
                    <div className="flex items-center gap-2 text-[13px] text-red-600">
                        <Timer className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-medium">Expired</span>
                    </div>
                ) : instance.duration_minutes ? (
                    <div className="flex items-center gap-2 text-[13px] text-[#727373]">
                        <Timer className="h-3.5 w-3.5 shrink-0 text-[#c4c4c4]" />
                        <span>{instance.duration_minutes} min duration</span>
                    </div>
                ) : null}

                {/* Power State */}
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

                {/* Current Step */}
                {isRunning && (
                    <div className="flex items-center gap-2 text-[13px] text-[#727373]">
                        <BarChart3 className="h-3.5 w-3.5 shrink-0 text-[#c4c4c4]" />
                        <span>
                            Step {instance.current_step_index + 1}
                        </span>
                    </div>
                )}

                {/* Created At */}
                <div className="flex items-center gap-2 text-[13px] text-[#727373]">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-[#c4c4c4]" />
                    <span>
                        {instance.created_at
                            ? new Date(instance.created_at).toLocaleDateString()
                            : "—"}
                    </span>
                </div>

                {/* Expires At */}
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
                    Click to open lab
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#c4c4c4] group-hover:text-[#1ca9b1] transition-colors" />
            </div>
        </div>
    )
}