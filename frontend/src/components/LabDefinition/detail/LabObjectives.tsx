// src/components/LabDefinition/detail/LabObjectives.tsx
import { cn } from "@/lib/utils"

interface LabObjectivesProps {
    objectives: string[]
}

export function LabObjectives({ objectives }: LabObjectivesProps) {
    if (!objectives || objectives.length === 0) {
        return null
    }

    return (
        <section className="rounded-xl border border-[#e8e8e8] bg-white p-6">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                Outcomes
            </p>
            <h2 className="mb-6 font-serif font-light text-xl tracking-tight text-[#1a1a1a]">
                Learning Objectives
            </h2>

            <div className="space-y-3">
                {objectives.map((objective, index) => (
                    <div
                        key={index}
                        className={cn(
                            "flex items-start gap-4 rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-4",
                            "transition-colors duration-200 hover:border-[#c4c4c4]"
                        )}
                    >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#1ca9b1]/30 text-[10px] font-semibold text-[#1ca9b1]">
                            {index + 1}
                        </span>
                        <p className="text-[13px] leading-[1.6] text-[#3a3a3a]">
                            {objective}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    )
}