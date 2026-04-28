// src/components/LabDefinition/catalogue/LabCard.tsx
import { Clock, Users, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PublicLabDefinition } from "@/types/LabDefinition"
import { useState } from "react"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface LabCardProps {
    lab: PublicLabDefinition
    onClick?: (lab: PublicLabDefinition) => void
    progress?: number // 0-100 for progress tracking
}

const difficultyConfig = {
    beginner: { label: "Beginner" },
    intermediate: { label: "Intermediate" },
    advanced: { label: "Advanced" },
}

export function LabCard({ lab, onClick, progress }: LabCardProps) {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)

    const difficulty = difficultyConfig[lab.difficulty] || difficultyConfig.beginner

    return (
        <div
            onClick={() => onClick?.(lab)}
            className={cn(
                "group relative flex flex-col overflow-hidden rounded-xl border bg-white",
                "border-[#e8e8e8] transition-all duration-200",
                "hover:border-[#c4c4c4] cursor-pointer"
            )}
        >
            {/* Thumbnail */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#f5f5f5]">
                {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 animate-pulse bg-[#f0f0f0]" />
                )}

                {lab.thumbnail_url && !imageError ? (
                    <img
                        src={`${API_BASE_URL}${lab.thumbnail_url}`}
                        alt={lab.name}
                        className={cn(
                            "h-full w-full object-cover transition-opacity duration-500",
                            imageLoaded ? "opacity-100" : "opacity-0"
                        )}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <span className="font-serif text-[48px] font-light text-[#e0e0e0]">
                            {lab.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}

                {/* Progress bar */}
                {progress !== undefined && progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/10">
                        <div
                            className="h-full bg-[#1ca9b1] transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* Difficulty badge */}
                <div className="absolute top-3 left-3">
                    <span className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
                        {difficulty.label}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-3 p-5">
                {/* Category eyebrow */}
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#1ca9b1]">
                    {lab.category.replace("_", " ")}
                </span>

                {/* Title */}
                <h3 className="text-[15px] font-semibold leading-snug text-[#1a1a1a] line-clamp-2 group-hover:text-[#1ca9b1] transition-colors duration-200">
                    {lab.name}
                </h3>

                {/* Description */}
                <p className="text-[13px] leading-relaxed text-[#727373] line-clamp-2">
                    {lab.short_description || lab.description}
                </p>

                {/* Tags */}
                {lab.tags && lab.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {lab.tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag}
                                className="rounded-sm bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium text-[#a0a0a0]"
                            >
                                {tag}
                            </span>
                        ))}
                        {lab.tags.length > 3 && (
                            <span className="rounded-sm bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium text-[#a0a0a0]">
                                +{lab.tags.length - 3}
                            </span>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between border-t border-[#f0f0f0] pt-4">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-[12px] text-[#a0a0a0]">
                            <Clock className="h-3.5 w-3.5" />
                            {lab.duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1.5 text-[12px] text-[#a0a0a0]">
                            <Users className="h-3.5 w-3.5" />
                            {lab.max_concurrent_users}
                        </span>
                    </div>

                    <ChevronRight className="h-4 w-4 text-[#c4c4c4] transition-all duration-200 group-hover:text-[#1ca9b1] group-hover:translate-x-0.5" />
                </div>
            </div>
        </div>
    )
}