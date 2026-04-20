// src/components/LabGuide/CreateGuideLab/StepEditor/ChecksTab.tsx

import { cn } from "@/lib/utils"
import { Plus, Lightbulb, Shield } from "lucide-react"
import type { LabGuideStepCreateRequest, GuideHint, ValidationCheck } from "@/types/LabGuide"
import { ValidationEditor } from "./ValidationEditor"

interface ChecksTabProps {
    data: LabGuideStepCreateRequest
    onChange: <K extends keyof LabGuideStepCreateRequest>(key: K, value: LabGuideStepCreateRequest[K]) => void
}

export function ChecksTab({ data, onChange }: ChecksTabProps) {
    const updateHints = (hints: GuideHint[]) => onChange("hints", hints)
    const updateValidations = (validations: ValidationCheck[]) => onChange("validations", validations)

    const updateHint = (level: number, content: string) => {
        const next = [...data.hints]
        const idx = next.findIndex((h) => h.level === level)
        if (idx >= 0) {
            next[idx] = { ...next[idx], content }
        } else {
            next.push({ level, content })
        }
        updateHints(next.sort((a, b) => a.level - b.level))
    }

    const getHint = (level: number) => data.hints.find((h) => h.level === level)?.content || ""

    const addValidation = () => {
        updateValidations([
            ...data.validations,
            { type: "port_open", description: "", is_blocking: false, points: 0, timeout: 30 },
        ])
    }

    const updateValidation = (i: number, patch: Partial<ValidationCheck>) => {
        const next = data.validations.map((v, idx) => (idx === i ? { ...v, ...patch } : v))
        updateValidations(next)
    }

    const removeValidation = (i: number) => {
        updateValidations(data.validations.filter((_, idx) => idx !== i))
    }

    return (
        <div className="p-6 space-y-8">
            {/* Hints */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <h3 className="text-[13px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                        Progressive Hints
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((level) => (
                        <div key={level} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#727373] uppercase tracking-wider">
                                    Level {level}
                                </span>
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                    level === 1 ? "bg-green-50 text-green-600" :
                                        level === 2 ? "bg-amber-50 text-amber-600" :
                                            "bg-red-50 text-red-600"
                                )}>
                                    {level === 1 ? "Vague" : level === 2 ? "Specific" : "Solution"}
                                </span>
                            </div>
                            <textarea
                                value={getHint(level)}
                                onChange={(e) => updateHint(level, e.target.value)}
                                placeholder={
                                    level === 1 ? "Give a gentle nudge..." :
                                        level === 2 ? "Point to the right tool..." :
                                            "Almost give the answer..."
                                }
                                rows={4}
                                className={cn(
                                    "w-full rounded-xl border border-[#d4d4d4] bg-white px-3 py-2",
                                    "text-[12px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                    "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all resize-none"
                                )}
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* Validations */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        <h3 className="text-[13px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                            Validation Checks
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={addValidation}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#1ca9b1] hover:text-[#17959c] bg-[#e6f7f8] hover:bg-[#d4f0f2] px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Check
                    </button>
                </div>

                {data.validations.length === 0 ? (
                    <div className="border border-dashed border-[#e8e8e8] rounded-xl p-8 text-center bg-[#fafafa]">
                        <Shield className="h-6 w-6 text-[#c4c4c4] mx-auto mb-2" />
                        <p className="text-xs text-[#727373]">No automated checks configured.</p>
                        <p className="text-[11px] text-[#c4c4c4] mt-1">Validations verify learner progress automatically.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {data.validations.map((val, i) => (
                            <ValidationEditor
                                key={i}
                                index={i}
                                validation={val}
                                onChange={(patch) => updateValidation(i, patch)}
                                onRemove={() => removeValidation(i)}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}