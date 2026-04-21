// src/components/LabGuide/CreateGuideLab/BasicInfoStep.tsx
import { cn } from "@/lib/utils"
import { Type, Info } from "lucide-react"
import type { LabGuideCreateRequest } from "@/types/LabGuide"

interface BasicInfoStepProps {
    data: LabGuideCreateRequest
    onChange: (partial: Partial<LabGuideCreateRequest>) => void
}

export function BasicInfoStep({ data, onChange }: BasicInfoStepProps) {
    return (
        <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e8e8e8]">
                <h2 className="text-[15px] font-semibold text-[#3a3a3a]">Basic Information</h2>
                <p className="text-xs text-[#727373] mt-0.5">
                    Create the logical guide container. Steps will be added as an immutable version.
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* Title */}
                <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                        Guide Title *
                    </label>
                    <div className="relative">
                        <Type className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                        <input
                            type="text"
                            value={data.title}
                            onChange={(e) => onChange({ title: e.target.value })}
                            placeholder="e.g., Network Reconnaissance Basics"
                            className={cn(
                                "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-3 py-2.5",
                                "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all"
                            )}
                        />
                    </div>
                </div>

                {/* Version Info Banner */}
                <div className="flex items-start gap-3 p-4 bg-[#e6f7f8] border border-[#1ca9b1]/20 rounded-lg">
                    <Info className="h-5 w-5 text-[#1ca9b1] shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-[#3a3a3a]">Versioning Enabled</p>
                        <p className="text-xs text-[#727373] mt-0.5">
                            This creates the guide container. In the next step, you'll build <strong>Version 1</strong>
                            as an immutable snapshot. You can publish it immediately or keep it as draft and publish later.
                        </p>
                    </div>
                </div>

                {/* Publish toggle for v1 */}
                <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                        Version 1 Status
                    </label>
                    <div className="flex items-center gap-3 p-3 border border-[#e8e8e8] rounded-lg">
                        <input
                            type="checkbox"
                            id="publish-v1"
                            checked={data.is_published || false}
                            onChange={(e) => onChange({ is_published: e.target.checked })}
                            className="h-4 w-4 rounded border-[#d4d4d4] text-[#1ca9b1] focus:ring-[#1ca9b1]/20"
                        />
                        <label htmlFor="publish-v1" className="text-[13px] text-[#3a3a3a] cursor-pointer select-none">
                            Publish Version 1 immediately
                        </label>
                    </div>
                    <p className="text-[11px] text-[#727373]">
                        {data.is_published
                            ? "Version 1 will be published and set as current. It can be assigned to labs right away."
                            : "Version 1 will be saved as draft. You can publish it later from the guide management page."
                        }
                    </p>
                </div>
            </div>
        </div>
    )
}