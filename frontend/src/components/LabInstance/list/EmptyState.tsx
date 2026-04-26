// src/components/LabInstance/list/EmptyState.tsx
import { FlaskConical } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
    onBrowseLabs?: () => void
}

export function EmptyState({ onBrowseLabs }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#e8e8e8] bg-white p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f8f8f8]">
                <FlaskConical className="h-8 w-8 text-[#c4c4c4]" />
            </div>
            <div>
                <h3 className="text-[16px] font-semibold text-[#3a3a3a]">
                    No lab instances
                </h3>
                <p className="mt-1 text-[13px] text-[#727373]">
                    You haven't launched any labs yet. Browse the catalogue to get
                    started.
                </p>
            </div>
            {onBrowseLabs && (
                <button
                    onClick={onBrowseLabs}
                    className={cn(
                        "mt-2 rounded-lg bg-[#1ca9b1] px-4 py-2",
                        "text-[13px] font-medium text-white",
                        "hover:bg-[#17959c]",
                        "transition-all duration-200"
                    )}
                >
                    Browse Labs
                </button>
            )}
        </div>
    )
}