// src/components/LabDefinition/catalogue/HeroSection.tsx
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
    Play,
    ChevronRight,
    ChevronLeft,
    Clock,
    Users,
    BookOpen,
    CheckCircle2,
    FlaskConical,
    TrendingUp,
    Target,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { PublicLabDefinition } from "@/types/LabDefinition"

interface HeroSectionProps {
    featuredLabs: PublicLabDefinition[]
    totalLabs: number
    completedLabs?: number
    inProgressLabs?: number
    onBrowseLabs: () => void
}

export function HeroSection({
    featuredLabs,
    totalLabs,
    completedLabs = 0,
    inProgressLabs = 0,
    onBrowseLabs,
}: HeroSectionProps) {
    const navigate = useNavigate()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPaused, setIsPaused] = useState(false)

    // Auto-rotate every 5 seconds
    useEffect(() => {
        if (featuredLabs.length <= 1 || isPaused) return
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % featuredLabs.length)
        }, 5000)
        return () => clearInterval(interval)
    }, [featuredLabs.length, isPaused])

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % featuredLabs.length)
    }, [featuredLabs.length])

    const prevSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + featuredLabs.length) % featuredLabs.length)
    }, [featuredLabs.length])

    const currentLab = featuredLabs[currentIndex]
    if (!currentLab) return null

    const DIFFICULTY_LABEL: Record<string, string> = {
        beginner: "Beginner",
        intermediate: "Intermediate",
        advanced: "Advanced",
    }

    return (
        <div
            className="relative overflow-hidden font-['Inter','Helvetica_Neue',Arial,sans-serif]"
            style={{
                background: "linear-gradient(160deg, #0d8f96 0%, #1ca9b1 55%, #2ec4cc 100%)",
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* ── Decorative circles — identical to login right panel ── */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-[360px] w-[360px] rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-[240px] w-[240px] rounded-full border border-white/[0.08]" />
            <div className="pointer-events-none absolute -bottom-24 -left-14 h-[320px] w-[320px] rounded-full border border-white/[0.07]" />
            <div className="pointer-events-none absolute top-1/2 left-1/3 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04]" />

            {/* ── Main layout ── */}
            <div className="relative mx-auto max-w-7xl px-14 py-16 lg:py-20">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

                    {/* ── Left: copy ── */}
                    <div className="flex flex-col gap-8">

                        {/* Eyebrow — same style as "Welcome back" on login */}
                        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/60">
                            Featured Lab {currentIndex + 1} of {featuredLabs.length}
                        </p>

                        {/* Headline block */}
                        <div key={currentLab.id} className="space-y-4">
                            <h1 className="text-[2.4rem] font-bold leading-[1.18] tracking-[-0.03em] text-white">
                                {currentLab.name}
                            </h1>
                            <p className="max-w-xl text-[14.5px] leading-[1.7] text-white/70">
                                {currentLab.short_description || currentLab.description}
                            </p>
                        </div>

                        {/* Meta pills */}
                        <div key={`${currentLab.id}-meta`} className="flex flex-wrap gap-2.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12.5px] text-white/80">
                                <Target className="h-3.5 w-3.5 text-white/60" />
                                {currentLab.category.replace("_", " ")}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12.5px] text-white/80">
                                {DIFFICULTY_LABEL[currentLab.difficulty] ?? currentLab.difficulty}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12.5px] text-white/80">
                                <Clock className="h-3.5 w-3.5 text-white/60" />
                                {currentLab.duration_minutes} min
                            </span>
                        </div>

                        {/* CTAs — white primary mirrors login submit; ghost mirrors "Contact admin" */}
                        <div className="flex flex-wrap gap-3.5">
                            <button
                                onClick={() => navigate(`/labs/${currentLab.slug}`)}
                                className={cn(
                                    "group flex h-[42px] items-center gap-2 rounded-md bg-white px-6",
                                    "text-[13.5px] font-semibold tracking-wide text-[#0d8f96]",
                                    "shadow-lg shadow-black/10 transition-colors duration-200",
                                    "hover:bg-white/90"
                                )}
                            >
                                <Play className="h-4 w-4 fill-current" />
                                Start This Lab
                                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </button>

                            <button
                                onClick={onBrowseLabs}
                                className={cn(
                                    "flex h-[42px] items-center gap-2 rounded-md border border-white/30 bg-white/10 px-6",
                                    "text-[13.5px] font-semibold tracking-wide text-white",
                                    "transition-colors duration-200 hover:bg-white/20"
                                )}
                            >
                                <BookOpen className="h-4 w-4" />
                                Browse All Labs
                            </button>
                        </div>

                        {/* Stats — identical pattern to login's FEATURE_HIGHLIGHTS list */}
                        <ul className="flex flex-col gap-3.5 border-t border-white/20 pt-6">
                            {[
                                {
                                    icon: TrendingUp,
                                    label: `${completedLabs} lab${completedLabs !== 1 ? "s" : ""} completed`,
                                },
                                {
                                    icon: Clock,
                                    label: `${inProgressLabs} in progress`,
                                },
                                {
                                    icon: FlaskConical,
                                    label: `${totalLabs} lab${totalLabs !== 1 ? "s" : ""} available on the platform`,
                                },
                            ].map(({ label }) => (
                                <li key={label} className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white/90" />
                                    <span className="text-[13.5px] leading-snug text-white/75">
                                        {label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ── Right: lab card — white, mirrors login left panel ── */}
                    <div className="relative">
                        {/* Prev / Next arrows */}
                        {featuredLabs.length > 1 && (
                            <>
                                <button
                                    onClick={prevSlide}
                                    className="absolute -left-5 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                                    aria-label="Previous lab"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={nextSlide}
                                    className="absolute -right-5 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                                    aria-label="Next lab"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </>
                        )}

                        {/* White card — clean like the login form panel */}
                        <div
                            key={currentLab.id}
                            className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/20"
                        >
                            {/* Thumbnail */}
                            <div className="relative aspect-video w-full overflow-hidden">
                                {currentLab.thumbnail_url ? (
                                    <img
                                        src={`http://localhost:8000${currentLab.thumbnail_url}`}
                                        alt={currentLab.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="flex h-full w-full items-center justify-center"
                                        style={{
                                            background:
                                                "linear-gradient(160deg, #e8f8f9 0%, #d0f0f2 100%)",
                                        }}
                                    >
                                        <FlaskConical className="h-16 w-16 text-[#1ca9b1]/40" />
                                    </div>
                                )}
                            </div>

                            {/* Card body */}
                            <div className="px-6 py-5">
                                {/* Eyebrow inside card */}
                                <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#1ca9b1]">
                                    Featured Lab
                                </p>

                                <h3 className="mb-1.5 text-[16px] font-semibold leading-tight tracking-[-0.02em] text-[#3a3a3a]">
                                    {currentLab.name}
                                </h3>

                                <p className="mb-4 text-[13px] leading-relaxed text-[#727373] line-clamp-2">
                                    {currentLab.short_description || currentLab.description}
                                </p>

                                <div className="flex items-center justify-between text-[12.5px] text-[#727373]">
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-[#1ca9b1]" />
                                        {currentLab.duration_minutes} min
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5 text-[#1ca9b1]" />
                                        Max {currentLab.max_concurrent_users}
                                    </span>
                                </div>

                                {/* Objectives — CheckCircle2 matches login feature list */}
                                {currentLab.objectives && currentLab.objectives.length > 0 && (
                                    <div className="mt-4 border-t border-[#f0f0f0] pt-4">
                                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#c4c4c4]">
                                            What you&apos;ll learn
                                        </p>
                                        <ul className="flex flex-col gap-2">
                                            {currentLab.objectives.slice(0, 2).map((obj, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-start gap-2 text-[12.5px] text-[#3a3a3a]"
                                                >
                                                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1ca9b1]" />
                                                    <span className="line-clamp-1">{obj}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Carousel indicators */}
                        {featuredLabs.length > 1 && (
                            <div className="mt-5 flex justify-center gap-2">
                                {featuredLabs.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentIndex(index)}
                                        className={cn(
                                            "h-1.5 rounded-full transition-all duration-300",
                                            index === currentIndex
                                                ? "w-8 bg-white"
                                                : "w-2 bg-white/30 hover:bg-white/50"
                                        )}
                                        aria-label={`Go to slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Bottom rule — same footer element as login right panel ── */}
            <div className="absolute bottom-6 left-14 right-14 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/20" />
            </div>
        </div>
    )
}