// src/components/LabDefinition/catalogue/HeroSection.tsx
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Play, ChevronRight, ChevronLeft, Clock, Users, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PublicLabDefinition } from "@/types/LabDefinition"

interface HeroSectionProps {
    featuredLabs: PublicLabDefinition[]
    totalLabs: number
    completedLabs?: number
    inProgressLabs?: number
    onBrowseLabs: () => void
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

/* ── Animated counter hook ── */
function useAnimatedCounter(target: number, duration: number = 1200) {
    const [count, setCount] = useState(0)

    useEffect(() => {
        if (target === 0) {
            setCount(0)
            return
        }
        let startTime: number | null = null
        let raf: number

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * target))
            if (progress < 1) raf = requestAnimationFrame(animate)
        }

        raf = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(raf)
    }, [target, duration])

    return count
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

    const animatedTotal = useAnimatedCounter(totalLabs)
    const animatedCompleted = useAnimatedCounter(completedLabs)
    const animatedInProgress = useAnimatedCounter(inProgressLabs)

    useEffect(() => {
        if (featuredLabs.length <= 1 || isPaused) return
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % featuredLabs.length)
        }, 6000)
        return () => clearInterval(interval)
    }, [featuredLabs.length, isPaused])

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % featuredLabs.length)
    }, [featuredLabs.length])

    const prevSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + featuredLabs.length) % featuredLabs.length)
    }, [featuredLabs.length])

    const currentLab = featuredLabs[currentIndex]

    // ── Fallback: no featured labs ──
    if (!currentLab) {
        return (
            <section className="bg-[#1ca9b1]">
                <div className="mx-auto max-w-7xl px-6 py-24 lg:px-14 lg:py-32">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
                            Lab Orchestration Platform
                        </p>

                        <h1 className="mb-6 font-serif font-light text-[2.75rem] leading-[1.1] tracking-tight text-white sm:text-[3.5rem]">
                            Hands-on Learning for
                            <br />
                            Modern Infrastructure
                        </h1>

                        <p className="mx-auto mb-10 max-w-xl text-[16px] leading-[1.7] text-white/70">
                            Explore real-world labs in cloud, security, DevOps, and more.
                            Build practical skills with guided, interactive environments.
                        </p>

                        <button
                            onClick={onBrowseLabs}
                            className={cn(
                                "inline-flex h-[48px] items-center gap-2.5 rounded-lg bg-white px-8",
                                "text-[14px] font-semibold text-[#1ca9b1]",
                                "transition-all duration-200 hover:bg-white/90"
                            )}
                        >
                            <BookOpen className="h-4 w-4" />
                            Browse All Labs
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </section>
        )
    }

    const DIFFICULTY_LABEL: Record<string, string> = {
        beginner: "Beginner",
        intermediate: "Intermediate",
        advanced: "Advanced",
    }

    return (
        <section
            className="bg-[#1ca9b1]"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className="mx-auto max-w-7xl px-6 py-20 lg:px-14 lg:py-24">
                <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
                    {/* ── Left: copy ── */}
                    <div className="flex flex-col gap-8">
                        {/* Eyebrow */}
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/100">
                                Featured Lab
                            </span>
                            <span className="h-px w-8 bg-white/30" />
                            <span className="font-mono text-[10px] text-white/100">
                                {currentIndex + 1} / {featuredLabs.length}
                            </span>
                        </div>

                        {/* Headline */}
                        <div>
                            <h1 className="mb-5 font-serif font-light text-[2.5rem] leading-[1.12] tracking-tight text-white sm:text-[3rem]">
                                {currentLab.name}
                            </h1>
                            <p className="max-w-lg text-[15px] leading-[1.7] text-white/100">
                                {currentLab.short_description || currentLab.description}
                            </p>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-medium text-white">
                                {DIFFICULTY_LABEL[currentLab.difficulty] ?? currentLab.difficulty}
                            </span>
                            <span className="text-[12px] text-white/100">
                                {currentLab.category.replace("_", " ")}
                            </span>
                            <span className="text-white/100">·</span>
                            <span className="flex items-center gap-1.5 text-[12px] text-white/100">
                                <Clock className="h-3 w-3" />
                                {currentLab.duration_minutes} min
                            </span>
                        </div>

                        {/* CTAs */}
                        <div className="flex flex-wrap items-center gap-4">
                            <button
                                onClick={() => navigate(`/labs/${currentLab.slug}`)}
                                className={cn(
                                    "flex h-[44px] items-center gap-2 rounded-lg bg-white px-6",
                                    "text-[13.5px] font-semibold text-[#1ca9b1]",
                                    "transition-all duration-200 hover:bg-white/90"
                                )}
                            >
                                <Play className="h-4 w-4 fill-current" />
                                Start This Lab
                            </button>

                            <button
                                onClick={onBrowseLabs}
                                className={cn(
                                    "flex h-[44px] items-center gap-2 rounded-lg border border-white/30",
                                    "px-6 text-[13.5px] font-medium text-white",
                                    "transition-all duration-200 hover:border-white/50 hover:bg-white/10"
                                )}
                            >
                                Browse All Labs
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-8 border-t border-white/20 pt-6">
                            <div>
                                <p className="text-[24px] font-bold tracking-tight text-white">
                                    {animatedTotal}
                                </p>
                                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/100">
                                    Labs available
                                </p>
                            </div>
                            <div className="h-8 w-px bg-white/20" />
                            <div>
                                <p className="text-[24px] font-bold tracking-tight text-white">
                                    {animatedCompleted}
                                </p>
                                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/100">
                                    Completed
                                </p>
                            </div>
                            <div className="h-8 w-px bg-white/20" />
                            <div>
                                <p className="text-[24px] font-bold tracking-tight text-white">
                                    {animatedInProgress}
                                </p>
                                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/100">
                                    In progress
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Right: lab card ── */}
                    <div className="relative px-9">
                        {/* Navigation arrows */}
                        {featuredLabs.length > 1 && (
                            <>
                                <button
                                    onClick={prevSlide}
                                    className={cn(
                                        "absolute -left-12 top-1/2 z-20 -translate-y-1/2",
                                        "flex h-10 w-10 items-center justify-center",
                                        "text-white/50 transition-colors duration-200 hover:text-white"
                                    )}
                                    aria-label="Previous lab"
                                >
                                    <ChevronLeft className="h-6 w-6" strokeWidth={1.5} />
                                </button>
                                <button
                                    onClick={nextSlide}
                                    className={cn(
                                        "absolute -right-12 top-1/2 z-20 -translate-y-1/2",
                                        "flex h-10 w-10 items-center justify-center",
                                        "text-white/50 transition-colors duration-200 hover:text-white"
                                    )}
                                    aria-label="Next lab"
                                >
                                    <ChevronRight className="h-6 w-6" strokeWidth={1.5} />
                                </button>
                            </>
                        )}

                        {/* Card */}
                        <div className="overflow-hidden rounded-xl border border-white/15 bg-[#0a5c61]/50 shadow-xl">
                            {/* Thumbnail */}
                            <div className="relative aspect-[3/2] w-full overflow-hidden bg-[#0a5c61]/60">
                                {currentLab.thumbnail_url ? (
                                    <img
                                        src={`${API_BASE_URL}${currentLab.thumbnail_url}`}
                                        alt={currentLab.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <span className="font-serif text-[48px] font-light text-white/100">
                                            {currentLab.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Card body */}
                            <div className="px-6 py-5">
                                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#2ec4cc]">
                                    Featured
                                </p>
                                <h3 className="mb-2 text-[16px] font-semibold leading-tight text-white">
                                    {currentLab.name}
                                </h3>
                                <p className="mb-4 text-[13px] leading-relaxed text-white/100 line-clamp-2">
                                    {currentLab.short_description || currentLab.description}
                                </p>
                                <div className="flex items-center justify-between border-t border-white/10 pt-4">
                                    <span className="flex items-center gap-1.5 text-[12px] text-white/100">
                                        <Clock className="h-3.5 w-3.5" />
                                        {currentLab.duration_minutes} min
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[12px] text-white/100">
                                        <Users className="h-3.5 w-3.5" />
                                        {currentLab.max_concurrent_users}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Dots */}
                        {featuredLabs.length > 1 && (
                            <div className="mt-5 flex justify-center gap-2">
                                {featuredLabs.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentIndex(index)}
                                        className={cn(
                                            "h-[3px] rounded-full transition-all duration-300",
                                            index === currentIndex
                                                ? "w-6 bg-white/70"
                                                : "w-2 bg-white/25 hover:bg-white/40"
                                        )}
                                        aria-label={`Go to slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}