// src/components/LabDefinition/detail/LabPrerequisites.tsx
import { AlertCircle, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface LabPrerequisitesProps {
    prerequisites: string[]
}

export function LabPrerequisites({ prerequisites }: LabPrerequisitesProps) {
    if (!prerequisites || prerequisites.length === 0) {
        return null
    }

    return (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                    <h2 className="text-[16px] font-semibold text-[#3a3a3a]">
                        Prerequisites
                    </h2>
                    <p className="text-[12px] text-[#727373]">
                        Before you begin
                    </p>
                </div>
            </div>

            <ul className="space-y-3">
                {prerequisites.map((prerequisite, index) => (
                    <li
                        key={index}
                        className={cn(
                            "flex items-start gap-3 text-[13px] leading-[1.6] text-[#3a3a3a]",
                            "group"
                        )}
                    >
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#1ca9b1] transition-transform group-hover:translate-x-1" />
                        <span className="flex-1">{prerequisite}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}