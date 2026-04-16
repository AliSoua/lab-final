// src/components/profile/StatsCard.tsx
import { CheckCircle2, Clock, Award, Star, Zap, Target } from "lucide-react"
import type { UserStats } from "@/types/profile/user"

interface StatsCardProps {
    stats: UserStats | null
    isLoading: boolean
}

function StatItem({
    icon: Icon,
    label,
    value,
    colorClass,
}: {
    icon: React.ElementType
    label: string
    value: string | number
    colorClass: string
}) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-[#fafafa]">
            <div className="flex items-center gap-3">
                <div className={colorClass}>
                    <Icon className="h-4 w-4" />
                </div>
                <span className="text-[13px] text-[#3a3a3a]">{label}</span>
            </div>
            <span className="text-[16px] font-bold text-[#3a3a3a]">{value}</span>
        </div>
    )
}

export function StatsCard({ stats, isLoading }: StatsCardProps) {
    if (isLoading || !stats) {
        return (
            <div className="bg-white rounded-xl border border-[#ebebeb] p-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl border border-[#ebebeb] p-6">
            <h3 className="text-[14px] font-semibold text-[#3a3a3a] mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-[#1ca9b1]" />
                Platform Stats
            </h3>

            <div className="space-y-3">
                <StatItem
                    icon={CheckCircle2}
                    label="Completed"
                    value={stats.labs_completed}
                    colorClass="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"
                />

                <StatItem
                    icon={Clock}
                    label="In Progress"
                    value={stats.labs_in_progress}
                    colorClass="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600"
                />

                <StatItem
                    icon={Zap}
                    label="Time Spent"
                    value={`${stats.total_time_hours}h`}
                    colorClass="h-8 w-8 rounded-lg bg-[#f0fafa] flex items-center justify-center text-[#1ca9b1]"
                />

                <StatItem
                    icon={Star}
                    label="Points"
                    value={stats.points.toLocaleString()}
                    colorClass="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600"
                />

                <StatItem
                    icon={Award}
                    label="Badges"
                    value={stats.badges_count}
                    colorClass="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600"
                />
            </div>
        </div>
    )
}