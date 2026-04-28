// src/components/LabDefinition/detail/LabDetailHeader.tsx
import { useNavigate } from "react-router-dom"
import { ChevronLeft, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LabDetail } from "@/types/LabDefinition/LabDetail"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface LabDetailHeaderProps {
    lab: LabDetail
}

export function LabDetailHeader({ lab }: LabDetailHeaderProps) {
    const navigate = useNavigate()

    return (
        <div className="bg-[#1ca9b1]">
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-14 lg:py-16">
                {/* Back */}
                <button
                    onClick={() => navigate("/")}
                    className={cn(
                        "mb-8 flex items-center gap-2 text-[13px] font-medium text-white/60",
                        "transition-colors duration-200 hover:text-white"
                    )}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Catalogue
                </button>

                <div className="grid gap-10 lg:grid-cols-5 lg:gap-16">
                    {/* Left */}
                    <div className="space-y-6 lg:col-span-3">
                        {/* Eyebrow */}
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
                            {lab.category.replace("_", " ")}
                        </p>

                        {/* Title */}
                        <h1 className="font-serif font-light text-[2.2rem] leading-[1.12] tracking-tight text-white lg:text-[2.8rem]">
                            {lab.name}
                        </h1>

                        {/* Description */}
                        <p className="max-w-2xl text-[15px] leading-[1.7] text-white/75">
                            {lab.short_description || lab.description}
                        </p>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-medium text-white">
                                {lab.difficulty}
                            </span>
                            <span className="text-[12px] text-white/50">
                                {lab.duration_minutes} min
                            </span>
                            <span className="text-white/25">·</span>
                            <span className="flex items-center gap-1.5 text-[12px] text-white/50">
                                <Users className="h-3.5 w-3.5" />
                                Max {lab.max_concurrent_users}
                            </span>
                        </div>

                        {/* Tags */}
                        {lab.tags && lab.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {lab.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-sm border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/50"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Thumbnail */}
                    <div className="lg:col-span-2">
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a5c61]/50">
                            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0a5c61]/60">
                                {lab.thumbnail_url ? (
                                    <img
                                        src={`${API_BASE_URL}${lab.thumbnail_url}`}
                                        alt={lab.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <span className="font-serif text-[64px] font-light text-white/20">
                                            {lab.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}