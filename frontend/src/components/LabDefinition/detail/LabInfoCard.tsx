// src/components/LabDefinition/detail/LabInfoCard.tsx
import { Clock, Users, Target, Calendar, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LabDetail } from "@/types/LabDefinition/LabDetail"

interface LabInfoCardProps {
    lab: LabDetail
}

const difficultyConfig = {
    beginner: {
        label: "Beginner",
        color: "text-emerald-600 bg-emerald-50",
    },
    intermediate: {
        label: "Intermediate",
        color: "text-amber-600 bg-amber-50",
    },
    advanced: {
        label: "Advanced",
        color: "text-rose-600 bg-rose-50",
    },
}

export function LabInfoCard({ lab }: LabInfoCardProps) {
    const difficulty = difficultyConfig[lab.difficulty] || difficultyConfig.beginner

    return (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-6">
            <h3 className="mb-4 text-[14px] font-semibold text-[#3a3a3a]">
                Lab Information
            </h3>

            <div className="space-y-4">
                {/* Difficulty */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[13px] text-[#727373]">
                        <BarChart3 className="h-4 w-4 text-[#c4c4c4]" />
                        <span>Difficulty</span>
                    </div>
                    <span className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        difficulty.color
                    )}>
                        {difficulty.label}
                    </span>
                </div>

                {/* Duration */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[13px] text-[#727373]">
                        <Clock className="h-4 w-4 text-[#c4c4c4]" />
                        <span>Duration</span>
                    </div>
                    <span className="text-[13px] font-medium text-[#3a3a3a]">
                        {lab.duration_minutes} min
                    </span>
                </div>

                {/* Concurrent Users */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[13px] text-[#727373]">
                        <Users className="h-4 w-4 text-[#c4c4c4]" />
                        <span>Max Users</span>
                    </div>
                    <span className="text-[13px] font-medium text-[#3a3a3a]">
                        {lab.max_concurrent_users} per session
                    </span>
                </div>

                {/* Category */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[13px] text-[#727373]">
                        <Target className="h-4 w-4 text-[#c4c4c4]" />
                        <span>Category</span>
                    </div>
                    <span className="text-[13px] font-medium text-[#3a3a3a]">
                        {lab.category.replace("_", " ")}
                    </span>
                </div>

                {/* Track */}
                {lab.track && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[13px] text-[#727373]">
                            <Calendar className="h-4 w-4 text-[#c4c4c4]" />
                            <span>Track</span>
                        </div>
                        <span className="text-[13px] font-medium text-[#3a3a3a]">
                            {lab.track}
                        </span>
                    </div>
                )}
            </div>

            {/* Tags */}
            {lab.tags && lab.tags.length > 0 && (
                <div className="mt-5 border-t border-[#f0f0f0] pt-4">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[#c4c4c4]">
                        Tags
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {lab.tags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-md bg-[#f8f8f8] px-2 py-1 text-[11px] font-medium text-[#727373]"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}