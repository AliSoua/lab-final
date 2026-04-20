// src/components/LabGuide/CreateGuideLab/StepEditor/MetaFields.tsx
import { cn } from "@/lib/utils"
import { Type, AlignLeft, Star } from "lucide-react"
import type { LabGuideStepCreateRequest } from "@/types/LabGuide"

interface MetaFieldsProps {
    data: LabGuideStepCreateRequest
    onChange: <K extends keyof LabGuideStepCreateRequest>(key: K, value: LabGuideStepCreateRequest[K]) => void
}

export function MetaFields({ data, onChange }: MetaFieldsProps) {
    return (
        <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-7 space-y-1.5">
                <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider flex items-center gap-1.5">
                    <Type className="h-3 w-3" />
                    Step Title *
                </label>
                <input
                    type="text"
                    value={data.title}
                    onChange={(e) => onChange("title", e.target.value)}
                    placeholder="e.g., Scan Target Network"
                    className={cn(
                        "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                        "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                        "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all"
                    )}
                />
            </div>

            <div className="col-span-6 md:col-span-3 space-y-1.5">
                <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider flex items-center gap-1.5">
                    <AlignLeft className="h-3 w-3" />
                    Description
                </label>
                <input
                    type="text"
                    value={data.description || ""}
                    onChange={(e) => onChange("description", e.target.value)}
                    placeholder="Brief context for this step"
                    className={cn(
                        "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                        "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                        "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all"
                    )}
                />
            </div>

            <div className="col-span-6 md:col-span-2 space-y-1.5">
                <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="h-3 w-3" />
                    Points
                </label>
                <input
                    type="number"
                    min={0}
                    value={data.points}
                    onChange={(e) => onChange("points", parseInt(e.target.value) || 0)}
                    className={cn(
                        "w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2",
                        "text-[13px] text-[#3a3a3a]",
                        "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all"
                    )}
                />
            </div>
        </div>
    )
}
