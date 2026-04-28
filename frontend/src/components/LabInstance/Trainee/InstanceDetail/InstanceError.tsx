// src/components/LabInstance/Trainee/InstanceDetail/InstanceError.tsx
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface InstanceErrorProps {
    error?: string | null
    onRetry?: () => void
}

export function InstanceError({ error, onRetry }: InstanceErrorProps) {
    return (
        <div className="min-h-screen bg-[#fafafa]">
            <div className="mx-auto max-w-7xl px-6 py-16 lg:px-14">
                <div className="flex flex-col items-center gap-4 rounded-xl border border-[#e8e8e8] bg-white py-16 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                        Error
                    </p>
                    <h2 className="font-serif font-light text-2xl text-[#1a1a1a]">
                        Failed to Load Instance
                    </h2>
                    <p className="max-w-md text-[13px] text-[#727373]">
                        {error || "Something went wrong while loading this lab instance."}
                    </p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className={cn(
                                "mt-2 flex h-10 items-center gap-2 rounded-lg border border-[#e8e8e8] px-5",
                                "text-[13px] font-medium text-[#727373]",
                                "hover:border-[#c4c4c4] hover:text-[#1a1a1a]",
                                "transition-all duration-200"
                            )}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}