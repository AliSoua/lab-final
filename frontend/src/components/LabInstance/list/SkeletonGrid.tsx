// src/components/LabInstance/list/SkeletonGrid.tsx
import { cn } from "@/lib/utils"

function SkeletonCard() {
    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-[#e8e8e8] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-[#f0f0f0] animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-[#f0f0f0] animate-pulse" />
                </div>
                <div className="h-5 w-20 rounded-full bg-[#f0f0f0] animate-pulse" />
            </div>
            <div className="space-y-2.5">
                <div className="h-3 w-full rounded bg-[#f0f0f0] animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-[#f0f0f0] animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-[#f0f0f0] animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-[#f0f0f0] animate-pulse" />
            </div>
            <div className="mt-1 border-t border-[#f0f0f0] pt-3">
                <div className="h-3 w-1/3 rounded bg-[#f0f0f0] animate-pulse" />
            </div>
        </div>
    )
}

interface SkeletonGridProps {
    count?: number
}

export function SkeletonGrid({ count = 6 }: SkeletonGridProps) {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    )
}