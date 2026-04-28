// src/components/LabInstance/list/SkeletonGrid.tsx
import { cn } from "@/lib/utils"

function SkeletonCard() {
    return (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-5">
            <div className="animate-pulse">
                {/* Mono eyebrow */}
                <div className="mb-2 h-3 w-16 rounded bg-[#f0f0f0]" />
                {/* Title */}
                <div className="mb-3 h-5 w-3/4 rounded bg-[#f0f0f0]" />
                {/* Meta pills */}
                <div className="mb-4 flex gap-2">
                    <div className="h-5 w-16 rounded-sm bg-[#f0f0f0]" />
                    <div className="h-5 w-14 rounded-sm bg-[#f0f0f0]" />
                </div>
                {/* Progress bar */}
                <div className="mb-4">
                    <div className="mb-2 flex justify-between">
                        <div className="h-3 w-12 rounded bg-[#f0f0f0]" />
                        <div className="h-3 w-10 rounded bg-[#f0f0f0]" />
                    </div>
                    <div className="h-1 w-full rounded-full bg-[#f0f0f0]">
                        <div className="h-full w-1/3 rounded-full bg-[#e8e8e8]" />
                    </div>
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between border-t border-[#f0f0f0] pt-4">
                    <div className="h-3 w-20 rounded bg-[#f0f0f0]" />
                    <div className="h-3 w-16 rounded bg-[#f0f0f0]" />
                </div>
            </div>
        </div>
    )
}

interface SkeletonGridProps {
    count?: number
}

export function SkeletonGrid({ count = 6 }: SkeletonGridProps) {
    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    )
}