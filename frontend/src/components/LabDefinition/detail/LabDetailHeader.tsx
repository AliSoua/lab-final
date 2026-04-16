// src/components/LabDefinition/detail/LabDetailHeader.tsx
import { useNavigate } from "react-router-dom"
import {
    ChevronLeft,
    Clock,
    Users,
    Target,
    Signal,
    Play,
    BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LabDetail } from "@/types/LabDefinition/LabDetail"

interface LabDetailHeaderProps {
    lab: LabDetail
    onStartLab?: (labId: string) => void
}

const difficultyConfig = {
    beginner: {
        color: "bg-emerald-500/20 text-emerald-100 border-emerald-400/30",
        label: "Beginner",
    },
    intermediate: {
        color: "bg-amber-500/20 text-amber-100 border-amber-400/30",
        label: "Intermediate",
    },
    advanced: {
        color: "bg-rose-500/20 text-rose-100 border-rose-400/30",
        label: "Advanced",
    },
}

export function LabDetailHeader({ lab, onStartLab }: LabDetailHeaderProps) {
    const navigate = useNavigate()
    const difficulty = difficultyConfig[lab.difficulty] || difficultyConfig.beginner

    return (
        <div
            className="relative overflow-hidden"
            style={{
                background: "linear-gradient(160deg, #0d8f96 0%, #1ca9b1 55%, #2ec4cc 100%)",
            }}
        >
            {/* Decorative circles — identical to login/HeroSection */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-[360px] w-[360px] rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-[240px] w-[240px] rounded-full border border-white/[0.08]" />
            <div className="pointer-events-none absolute -bottom-24 -left-14 h-[320px] w-[320px] rounded-full border border-white/[0.07]" />
            <div className="pointer-events-none absolute top-1/2 left-1/3 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04]" />

            <div className="relative mx-auto max-w-7xl px-4 py-12 lg:py-16 sm:px-6 lg:px-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate("/")}
                    className={cn(
                        "mb-6 flex items-center gap-2 text-[13px] font-medium text-white/70",
                        "transition-colors hover:text-white"
                    )}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Catalogue
                </button>

                <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
                    {/* Left Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Category & Track */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                                {lab.category.replace("_", " ")}
                            </span>
                            {lab.track && (
                                <>
                                    <span className="text-white/30">•</span>
                                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/80">
                                        <Signal className="h-3.5 w-3.5" />
                                        {lab.track}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="text-[2.2rem] font-bold leading-[1.15] tracking-[-0.03em] text-white lg:text-[2.6rem]">
                            {lab.name}
                        </h1>

                        {/* Description */}
                        <p className="max-w-2xl text-[14.5px] leading-[1.7] text-white/75">
                            {lab.short_description || lab.description}
                        </p>

                        {/* Meta Pills */}
                        <div className="flex flex-wrap gap-2.5">
                            <span className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium backdrop-blur-sm",
                                difficulty.color
                            )}>
                                <Target className="h-3.5 w-3.5" />
                                {difficulty.label}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12.5px] text-white/80">
                                <Clock className="h-3.5 w-3.5 text-white/60" />
                                {lab.duration_minutes} minutes
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12.5px] text-white/80">
                                <Users className="h-3.5 w-3.5 text-white/60" />
                                Max {lab.max_concurrent_users} concurrent
                            </span>
                            {lab.tags?.slice(0, 3).map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] text-white/70"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Right: Thumbnail Card */}
                    <div className="relative">
                        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/20">
                            <div className="relative aspect-video w-full overflow-hidden">
                                {lab.thumbnail_url ? (
                                    <img
                                        src={`http://localhost:8000${lab.thumbnail_url}`}
                                        alt={lab.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="flex h-full w-full items-center justify-center"
                                        style={{
                                            background: "linear-gradient(160deg, #e8f8f9 0%, #d0f0f2 100%)",
                                        }}
                                    >
                                        <span className="text-6xl">🔬</span>
                                    </div>
                                )}
                            </div>

                            {/* Quick Actions */}
                            <div className="p-5 space-y-3">
                                <button
                                    onClick={() => onStartLab?.(lab.id)}
                                    className={cn(
                                        "group flex w-full items-center justify-center gap-2 rounded-lg bg-[#1ca9b1] px-6 py-3",
                                        "text-[14px] font-semibold tracking-wide text-white",
                                        "shadow-lg shadow-[#1ca9b1]/30 transition-all duration-200",
                                        "hover:bg-[#17959c] hover:shadow-xl hover:shadow-[#1ca9b1]/40"
                                    )}
                                >
                                    <Play className="h-4 w-4 fill-current" />
                                    Start Lab
                                </button>

                                <button
                                    className={cn(
                                        "flex w-full items-center justify-center gap-2 rounded-lg border border-[#e8e8e8] bg-white px-6 py-3",
                                        "text-[14px] font-medium text-[#727373]",
                                        "transition-all duration-200 hover:border-[#1ca9b1]/30 hover:text-[#1ca9b1]"
                                    )}
                                >
                                    <BookOpen className="h-4 w-4" />
                                    Preview Guide
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom rule */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-white/20" />
        </div>
    )
}