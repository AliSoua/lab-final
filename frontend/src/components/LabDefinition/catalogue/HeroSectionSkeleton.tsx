// src/components/LabDefinition/catalogue/HeroSectionSkeleton.tsx
import { cn } from "@/lib/utils"

export function HeroSectionSkeleton() {
    return (
        <div
            className="relative overflow-hidden font-['Inter','Helvetica_Neue',Arial,sans-serif]"
            style={{
                background: "linear-gradient(160deg, #0d8f96 0%, #1ca9b1 55%, #2ec4cc 100%)",
            }}
        >
            {/* Decorative circles - same as HeroSection */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-[360px] w-[360px] rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-[240px] w-[240px] rounded-full border border-white/[0.08]" />
            <div className="pointer-events-none absolute -bottom-24 -left-14 h-[320px] w-[320px] rounded-full border border-white/[0.07]" />

            {/* Main layout */}
            <div className="relative mx-auto max-w-7xl px-14 py-16 lg:py-20">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    {/* Left: copy skeleton */}
                    <div className="flex flex-col gap-8 animate-pulse">
                        {/* Eyebrow */}
                        <div className="h-3 w-32 bg-white/20 rounded" />

                        {/* Headline */}
                        <div className="space-y-4">
                            <div className="h-12 w-full bg-white/20 rounded" />
                            <div className="h-12 w-2/3 bg-white/20 rounded" />
                            <div className="h-4 w-full bg-white/10 rounded mt-4" />
                            <div className="h-4 w-3/4 bg-white/10 rounded" />
                        </div>

                        {/* Meta pills */}
                        <div className="flex flex-wrap gap-2.5">
                            <div className="h-7 w-24 bg-white/10 rounded-full" />
                            <div className="h-7 w-20 bg-white/10 rounded-full" />
                            <div className="h-7 w-16 bg-white/10 rounded-full" />
                        </div>

                        {/* CTAs */}
                        <div className="flex flex-wrap gap-3.5">
                            <div className="h-10 w-32 bg-white/30 rounded-md" />
                            <div className="h-10 w-28 bg-white/10 rounded-md border border-white/20" />
                        </div>

                        {/* Stats */}
                        <div className="flex flex-col gap-3.5 border-t border-white/20 pt-6">
                            <div className="h-4 w-48 bg-white/10 rounded" />
                            <div className="h-4 w-36 bg-white/10 rounded" />
                            <div className="h-4 w-56 bg-white/10 rounded" />
                        </div>
                    </div>

                    {/* Right: card skeleton */}
                    <div className="relative">
                        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/20 animate-pulse">
                            {/* Thumbnail */}
                            <div className="aspect-video w-full bg-gradient-to-br from-slate-100 to-slate-200" />

                            {/* Card body */}
                            <div className="px-6 py-5 space-y-3">
                                <div className="h-3 w-20 bg-slate-200 rounded" />
                                <div className="h-5 w-3/4 bg-slate-200 rounded" />
                                <div className="h-4 w-full bg-slate-100 rounded" />
                                <div className="h-4 w-2/3 bg-slate-100 rounded" />
                                <div className="flex justify-between pt-2">
                                    <div className="h-4 w-16 bg-slate-100 rounded" />
                                    <div className="h-4 w-20 bg-slate-100 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom rule */}
            <div className="absolute bottom-6 left-14 right-14 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/20" />
            </div>
        </div>
    )
}