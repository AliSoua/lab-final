// src/components/LabDefinition/catalogue/SkeletonGrid.tsx
import { cn } from "@/lib/utils"

interface SkeletonGridProps {
    count?: number
}

export function SkeletonGrid({ count = 6 }: SkeletonGridProps) {
    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "flex flex-col gap-4 rounded-xl border border-[#e8e8e8] bg-white p-5",
                        "animate-pulse"
                    )}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="h-12 w-12 rounded-xl bg-[#f0f0f0]" />
                        <div className="h-6 w-20 rounded-full bg-[#f0f0f0]" />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col gap-2">
                        <div className="h-5 w-3/4 rounded bg-[#f0f0f0]" />
                        <div className="h-4 w-full rounded bg-[#f0f0f0]" />
                        <div className="h-4 w-2/3 rounded bg-[#f0f0f0]" />
                    </div>

                    {/* Footer */}
                    <div className="mt-auto flex items-center justify-between border-t border-[#f8f8f8] pt-4">
                        <div className="flex items-center gap-4">
                            <div className="h-4 w-16 rounded bg-[#f0f0f0]" />
                            <div className="h-4 w-16 rounded bg-[#f0f0f0]" />
                        </div>
                        <div className="h-8 w-8 rounded-full bg-[#f0f0f0]" />
                    </div>
                </div>
            ))}
        </div>
    )
}