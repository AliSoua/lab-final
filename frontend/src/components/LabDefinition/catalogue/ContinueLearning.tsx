// src/components/LabDefinition/catalogue/ContinueLearning.tsx
import { useNavigate } from "react-router-dom"
import { Clock, RotateCcw, ChevronRight, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PublicLabDefinition } from "@/types/LabDefinition"

interface LabProgress {
    lab: PublicLabDefinition
    progress: number // 0-100
    timeSpent: number // minutes
    lastAccessed: string
}

interface ContinueLearningProps {
    inProgressLabs: LabProgress[]
}

export function ContinueLearning({ inProgressLabs }: ContinueLearningProps) {
    const navigate = useNavigate()

    if (inProgressLabs.length === 0) return null

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[#3a3a3a]">
                        Continue Learning
                    </h2>
                    <p className="text-sm text-[#727373]">
                        Pick up where you left off
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inProgressLabs.map(({ lab, progress, timeSpent }) => (
                    <div
                        key={lab.id}
                        onClick={() => navigate(`/labs/${lab.slug}`)}
                        className={cn(
                            "group relative flex gap-4 rounded-xl border bg-white p-4 transition-all duration-200",
                            "border-[#e8e8e8] hover:border-[#1ca9b1]/30 hover:shadow-md cursor-pointer"
                        )}
                    >
                        {/* Thumbnail */}
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#f8f8f8]">
                            {lab.thumbnail_url ? (
                                <img
                                    src={`http://localhost:8000${lab.thumbnail_url}`}
                                    alt={lab.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-2xl">
                                    🔬
                                </div>
                            )}

                            {/* Progress Ring Overlay */}
                            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#e8e8e8"
                                    strokeWidth="3"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#1ca9b1"
                                    strokeWidth="3"
                                    strokeDasharray={`${progress}, 100`}
                                />
                            </svg>
                        </div>

                        {/* Content */}
                        <div className="flex flex-1 flex-col justify-center">
                            <h3 className="text-sm font-semibold text-[#3a3a3a] line-clamp-1 group-hover:text-[#1ca9b1] transition-colors">
                                {lab.name}
                            </h3>

                            <div className="mt-2 flex items-center gap-3 text-xs text-[#727373]">
                                <span className="flex items-center gap-1">
                                    <Trophy className="h-3 w-3 text-[#1ca9b1]" />
                                    {progress}% complete
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {timeSpent}m spent
                                </span>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                                <button className={cn(
                                    "flex items-center gap-1.5 rounded-lg bg-[#1ca9b1]/10 px-3 py-1.5",
                                    "text-xs font-medium text-[#1ca9b1]",
                                    "hover:bg-[#1ca9b1] hover:text-white transition-colors"
                                )}>
                                    <RotateCcw className="h-3 w-3" />
                                    Resume
                                </button>
                            </div>
                        </div>

                        <ChevronRight className="h-5 w-5 text-[#c4c4c4] self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                ))}
            </div>
        </div>
    )
}