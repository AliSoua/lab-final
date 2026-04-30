// src/components/LabInstance/Trainee/InstanceRun/shared/TimeDisplay.tsx
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimeDisplayProps {
    formattedTime: string | null
    minutesRemaining: number | null
}

export function TimeDisplay({ formattedTime, minutesRemaining }: TimeDisplayProps) {
    if (!formattedTime) return null

    const isExpired = formattedTime === "Expired"
    const isCritical = !isExpired && minutesRemaining !== null && minutesRemaining <= 1
    const isWarning = !isExpired && minutesRemaining !== null && minutesRemaining <= 5

    return (
        <div className="flex items-center gap-1.5 border-l border-[#e8e8e8] pl-4">
            <Clock className={cn(
                "h-3.5 w-3.5",
                isExpired || isCritical ? "text-red-600" : isWarning ? "text-amber-500" : "text-[#727373]"
            )} />
            <span className={cn(
                "font-medium tabular-nums transition-colors",  // tabular-nums stops layout shift as digits change
                isExpired || isCritical ? "text-red-600" : isWarning ? "text-amber-500" : "text-[#727373]"
            )}>
                {formattedTime}
            </span>
        </div>
    )
}