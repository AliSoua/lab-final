// src/components/LabGuide/CreateGuideLab/BasicInfoStep.tsx
import { cn } from "@/lib/utils"
import { Type, Globe } from "lucide-react"
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
                    Give your guide a title and set its visibility
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

                {/* Publish toggle */}
                <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                        Visibility
                    </label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                        <select
                            value={data.is_published ? "published" : "draft"}
                            onChange={(e) => onChange({ is_published: e.target.value === "published" })}
                            className={cn(
                                "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-8 py-2.5",
                                "text-[13px] text-[#3a3a3a]",
                                "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all appearance-none"
                            )}
                        >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="h-4 w-4 text-[#c4c4c4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}