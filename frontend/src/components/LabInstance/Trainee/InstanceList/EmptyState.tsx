// src/components/LabInstance/list/EmptyState.tsx
import { cn } from "@/lib/utils"

interface EmptyStateProps {
    onBrowseLabs?: () => void
}

export function EmptyState({ onBrowseLabs }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-[#e8e8e8] bg-white py-16 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                Empty
            </p>
            <h2 className="font-serif font-light text-2xl text-[#1a1a1a]">
                No active instances
            </h2>
            <p className="max-w-md text-[13px] text-[#727373]">
                You haven&apos;t launched any labs yet. Browse the catalogue to get started.
            </p>
            {onBrowseLabs && (
                <button
                    onClick={onBrowseLabs}
                    className={cn(
                        "mt-2 flex h-10 items-center gap-2 rounded-lg bg-[#1ca9b1] px-6",
                        "text-[13px] font-medium text-white",
                        "hover:bg-[#17959c]",
                        "transition-colors duration-200"
                    )}
                >
                    Browse Labs
                </button>
            )}
        </div>
    )
}