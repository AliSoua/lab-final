// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/sections/ValidationsSection.tsx

import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ValidationCheck, StepExecutionState } from "@/types/LabGuide"

interface ValidationsSectionProps {
    validations: ValidationCheck[]
    validationResults: StepExecutionState["validation_results"]
}

export function ValidationsSection({ validations, validationResults }: ValidationsSectionProps) {
    if (validations.length === 0) return null

    return (
        <div className="space-y-2">
            <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[#727373]">
                Validation Checks
            </h4>
            {validations.map((v, i) => {
                const result = validationResults[i]
                const isPassed = result?.status === "passed"
                const isFailed = result?.status === "failed" || result?.status === "error"

                return (
                    <div
                        key={i}
                        className={cn(
                            "flex items-start gap-2 rounded-lg border p-3 text-[12px] transition-colors",
                            isPassed
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : isFailed
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : "border-[#e8e8e8] bg-white text-[#727373]",
                        )}
                    >
                        <CheckCircle2
                            className={cn(
                                "mt-0.5 h-3.5 w-3.5 shrink-0",
                                isPassed
                                    ? "text-emerald-500"
                                    : isFailed
                                        ? "text-red-500"
                                        : "text-[#c4c4c4]",
                            )}
                        />
                        <div className="min-w-0">
                            <span>{v.description}</span>
                            {result?.message && (
                                <p className="mt-0.5 text-[11px] opacity-80">{result.message}</p>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}