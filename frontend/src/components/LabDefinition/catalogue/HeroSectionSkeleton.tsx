// src/components/LabDefinition/catalogue/HeroSectionSkeleton.tsx
import { cn } from "@/lib/utils"

export function HeroSectionSkeleton() {
    return (
        <section className="relative overflow-hidden">
            {/* Base gradient matching HeroSection */}
            <div
                className="absolute inset-0"
                style={{
                    background: "linear-gradient(165deg, #0a5c61 0%, #0d8f96 40%, #1ca9b1 70%, #2ec4cc 100%)",
                }}
            />

            <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-14 lg:py-24">
                <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
                    {/* Left: copy skeleton */}
                    <div className="flex flex-col gap-8">
                        {/* Eyebrow */}
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-28 animate-pulse rounded bg-white/15" />
                            <div className="h-px w-8 bg-white/10" />
                            <div className="h-3 w-10 animate-pulse rounded bg-white/10" />
                        </div>

                        {/* Headline */}
                        <div className="space-y-4">
                            <div className="h-10 w-full animate-pulse rounded bg-white/15" />
                            <div className="h-10 w-4/5 animate-pulse rounded bg-white/15" />
                            <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                            <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                        </div>

                        {/* Meta pills */}
                        <div className="flex flex-wrap gap-3">
                            <div className="h-7 w-24 animate-pulse rounded-md bg-white/10" />
                            <div className="h-7 w-20 animate-pulse rounded-md bg-white/10" />
                            <div className="h-7 w-16 animate-pulse rounded-md bg-white/10" />
                        </div>

                        {/* CTAs */}
                        <div className="flex flex-wrap gap-4">
                            <div className="h-11 w-36 animate-pulse rounded-lg bg-white/25" />
                            <div className="h-11 w-32 animate-pulse rounded-lg border border-white/15 bg-white/8" />
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-8 border-t border-white/10 pt-6">
                            <div className="space-y-2">
                                <div className="h-7 w-12 animate-pulse rounded bg-white/15" />
                                <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
                            </div>
                            <div className="h-8 w-px bg-white/10" />
                            <div className="space-y-2">
                                <div className="h-7 w-12 animate-pulse rounded bg-white/15" />
                                <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
                            </div>
                            <div className="h-8 w-px bg-white/10" />
                            <div className="space-y-2">
                                <div className="h-7 w-12 animate-pulse rounded bg-white/15" />
                                <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
                            </div>
                        </div>
                    </div>

                    {/* Right: card skeleton */}
                    <div className="relative">
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a5c61]/40 shadow-2xl shadow-black/20">
                            {/* Thumbnail */}
                            <div className="aspect-[16/10] w-full animate-pulse bg-[#0a5c61]/80" />

                            {/* Card body */}
                            <div className="space-y-3 px-6 py-5">
                                <div className="h-5 w-3/4 animate-pulse rounded bg-white/15" />
                                <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                                <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                                <div className="flex justify-between border-t border-white/8 pt-4">
                                    <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
                                    <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
                                </div>
                            </div>
                        </div>

                        {/* Dots */}
                        <div className="mt-5 flex justify-center gap-2">
                            <div className="h-[3px] w-6 rounded-full bg-white/15" />
                            <div className="h-[3px] w-2 rounded-full bg-white/10" />
                            <div className="h-[3px] w-2 rounded-full bg-white/10" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
        </section>
    )
}