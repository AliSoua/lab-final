// src/components/LabDefinition/detail/LabObjectives.tsx
import { CheckCircle2, Lightbulb, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"

interface LabObjectivesProps {
    objectives: string[]
}

export function LabObjectives({ objectives }: LabObjectivesProps) {
    if (!objectives || objectives.length === 0) {
        return null
    }

    return (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1ca9b1]/10">
                    <GraduationCap className="h-5 w-5 text-[#1ca9b1]" />
                </div>
                <div>
                    <h2 className="text-[16px] font-semibold text-[#3a3a3a]">
                        Learning Objectives
                    </h2>
                    <p className="text-[12px] text-[#727373]">
                        What you&apos;ll accomplish in this lab
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {objectives.map((objective, index) => (
                    <div
                        key={index}
                        className={cn(
                            "flex items-start gap-4 rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-4",
                            "transition-colors duration-200 hover:border-[#1ca9b1]/20 hover:bg-[#1ca9b1]/[0.02]"
                        )}
                    >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1ca9b1]/10">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#1ca9b1]" />
                        </div>
                        <p className="text-[13.5px] leading-[1.6] text-[#3a3a3a]">
                            {objective}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}