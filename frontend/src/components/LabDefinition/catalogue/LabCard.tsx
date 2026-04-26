// src/components/LabDefinition/catalogue/LabCard.tsx
import { Clock, Users, Signal, ChevronRight, PlayCircle, Bookmark } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PublicLabDefinition } from "@/types/LabDefinition"
import { useState } from "react"

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL

interface LabCardProps {
    lab: PublicLabDefinition
    onClick?: (lab: PublicLabDefinition) => void
    progress?: number // 0-100 for progress tracking
    isBookmarked?: boolean
    onBookmarkToggle?: (labId: string) => void
}

const difficultyConfig = {
    beginner: {
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "Beginner",
        dot: "bg-emerald-500"
    },
    intermediate: {
        color: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Intermediate",
        dot: "bg-amber-500"
    },
    advanced: {
        color: "bg-rose-50 text-rose-700 border-rose-200",
        label: "Advanced",
        dot: "bg-rose-500"
    },
}

export function LabCard({
    lab,
    onClick,
    progress,
    isBookmarked,
    onBookmarkToggle
}: LabCardProps) {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)

    const difficulty = difficultyConfig[lab.difficulty] || difficultyConfig.beginner

    return (
        <div
            onClick={() => onClick?.(lab)}
            className={cn(
                "group relative flex flex-col overflow-hidden rounded-xl border bg-white",
                "border-[#e8e8e8] transition-all duration-300",
                "hover:border-[#1ca9b1]/30 hover:shadow-lg hover:shadow-[#1ca9b1]/5",
                "cursor-pointer"
            )}
        >
            {/* Thumbnail Section */}
            <div className="relative aspect-video w-full overflow-hidden bg-[#f8f8f8]">
                {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#f0f0f0] to-[#e8e8e8]" />
                )}

                {lab.thumbnail_url && !imageError ? (
                    <img
                        src={`${API_BASE_URL}${lab.thumbnail_url}`}
                        alt={lab.name}
                        className={cn(
                            "h-full w-full object-cover transition-all duration-500",
                            imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
                            "group-hover:scale-105"
                        )}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1ca9b1]/10 to-[#1ca9b1]/5">
                        <span className="text-5xl">🔬</span>
                    </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Bookmark Button */}
                {onBookmarkToggle && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onBookmarkToggle(lab.id)
                        }}
                        className={cn(
                            "absolute top-3 right-3 p-2 rounded-full transition-all duration-200",
                            "opacity-0 group-hover:opacity-100",
                            isBookmarked
                                ? "bg-[#1ca9b1] text-white"
                                : "bg-white/90 text-[#727373] hover:bg-white"
                        )}
                    >
                        <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
                    </button>
                )}

                {/* Progress Bar */}
                {progress !== undefined && progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                        <div
                            className="h-full bg-[#1ca9b1] transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-[#1ca9b1] shadow-xl transition-transform duration-300 group-hover:scale-100 scale-90">
                        <PlayCircle className="h-8 w-8 fill-current" />
                    </div>
                </div>

                {/* Difficulty Badge - Top Left */}
                <div className="absolute top-3 left-3">
                    <span className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm",
                        difficulty.color
                    )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", difficulty.dot)} />
                        {difficulty.label}
                    </span>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col gap-3 p-5">
                {/* Category & Track */}
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#1ca9b1]">
                        {lab.category.replace("_", " ")}
                    </span>
                    {lab.track && (
                        <div className="flex items-center gap-1 text-[11px] text-[#727373]">
                            <Signal className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{lab.track}</span>
                        </div>
                    )}
                </div>

                {/* Title & Description */}
                <div className="space-y-1">
                    <h3 className="text-[16px] font-semibold leading-tight text-[#3a3a3a] line-clamp-2 group-hover:text-[#1ca9b1] transition-colors">
                        {lab.name}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-[#727373] line-clamp-2">
                        {lab.short_description || lab.description}
                    </p>
                </div>

                {/* Tags */}
                {lab.tags && lab.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {lab.tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag}
                                className="rounded-md bg-[#f8f8f8] px-2 py-0.5 text-[10px] font-medium text-[#727373]"
                            >
                                {tag}
                            </span>
                        ))}
                        {lab.tags.length > 3 && (
                            <span className="rounded-md bg-[#f8f8f8] px-2 py-0.5 text-[10px] font-medium text-[#727373]">
                                +{lab.tags.length - 3}
                            </span>
                        )}
                    </div>
                )}

                {/* Footer Meta */}
                <div className="mt-auto flex items-center justify-between border-t border-[#f0f0f0] pt-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[12px] text-[#727373]">
                            <Clock className="h-3.5 w-3.5 text-[#1ca9b1]" />
                            <span>{lab.duration_minutes} min</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[12px] text-[#727373]">
                            <Users className="h-3.5 w-3.5 text-[#1ca9b1]" />
                            <span>Max {lab.max_concurrent_users}</span>
                        </div>
                    </div>

                    <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        "bg-[#f8f8f8] text-[#727373] transition-all duration-300",
                        "group-hover:bg-[#1ca9b1] group-hover:text-white group-hover:shadow-lg group-hover:shadow-[#1ca9b1]/30"
                    )}>
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                </div>
            </div>
        </div>
    )
}