// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/sections/TasksSection.tsx

import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GuideTask } from "@/types/LabGuide"

interface TasksSectionProps {
    tasks: GuideTask[]
    completedIndices: number[]
}

export function TasksSection({ tasks, completedIndices }: TasksSectionProps) {
    if (tasks.length === 0) return null

    return (
        <div className="space-y-2">
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                Tasks
            </h4>
            {tasks.map((task, i) => {
                const isDone = completedIndices.includes(i)
                return (
                    <div
                        key={i}
                        className={cn(
                            "flex items-start gap-2 rounded-lg border p-3 text-[13px] transition-colors",
                            isDone
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-[#e8e8e8] bg-white text-[#3a3a3a]",
                        )}
                    >
                        <CheckCircle2
                            className={cn(
                                "mt-0.5 h-4 w-4 shrink-0",
                                isDone ? "text-emerald-500" : "text-[#c4c4c4]",
                            )}
                        />
                        <span>{task.description}</span>
                    </div>
                )
            })}
        </div>
    )
}