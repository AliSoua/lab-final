// src/components/LabDefinition/detail/LabPrerequisites.tsx
import { cn } from "@/lib/utils"

interface LabPrerequisitesProps {
    prerequisites: string[]
}

export function LabPrerequisites({ prerequisites }: LabPrerequisitesProps) {
    if (!prerequisites || prerequisites.length === 0) {
        return null
    }

    return (
        <section className="rounded-xl border border-[#e8e8e8] bg-white p-6">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                Requirements
            </p>
            <h2 className="mb-6 font-serif font-light text-xl tracking-tight text-[#1a1a1a]">
                Prerequisites
            </h2>

            <ul className="space-y-3">
                {prerequisites.map((prerequisite, index) => (
                    <li
                        key={index}
                        className="flex items-start gap-3 text-[13px] leading-[1.6] text-[#3a3a3a]"
                    >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#a0a0a0]" />
                        <span>{prerequisite}</span>
                    </li>
                ))}
            </ul>
        </section>
    )
}