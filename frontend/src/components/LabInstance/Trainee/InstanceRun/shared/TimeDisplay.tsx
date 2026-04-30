// src/components/LabInstance/Trainee/InstanceRun/shared/TimeDisplay.tsx
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimeDisplayProps {
    formattedTime: string | null
}

export function TimeDisplay({ formattedTime }: TimeDisplayProps) {
    if (!formattedTime) return null

    return (
        <div className="flex items-center gap-1.5 border-l border-[#e8e8e8] pl-4">
            <Clock className="h-3.5 w-3.5" />
            <span className={cn(formattedTime === "Expired" && "text-red-600 font-medium")}>
                {formattedTime}
            </span>
        </div>
    )
}