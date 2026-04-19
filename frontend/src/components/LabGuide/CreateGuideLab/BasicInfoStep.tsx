// src/components/LabGuide/CreateGuideLab/BasicInfoStep.tsx
import { cn } from "@/lib/utils"
import { Tag, Clock, BarChart3, FolderOpen, Type, AlignLeft } from "lucide-react"
import type { LabGuideCreateRequest } from "@/types/LabGuide"
import { useState } from "react"

interface BasicInfoStepProps {
    data: LabGuideCreateRequest
    onChange: (partial: Partial<LabGuideCreateRequest>) => void
}

export function BasicInfoStep({ data, onChange }: BasicInfoStepProps) {
    const [tagInput, setTagInput] = useState("")

    const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && tagInput.trim()) {
            e.preventDefault()
            if (!data.tags.includes(tagInput.trim())) {
                onChange({ tags: [...data.tags, tagInput.trim()] })
            }
            setTagInput("")
        }
    }

    const removeTag = (tag: string) => {
        onChange({ tags: data.tags.filter((t) => t !== tag) })
    }

    return (
        <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e8e8e8]">
                <h2 className="text-[15px] font-semibold text-[#3a3a3a]">Basic Information</h2>
                <p className="text-xs text-[#727373] mt-0.5">Define the guide metadata and classification</p>
            </div>

            <div className="p-6 space-y-5">
                {/* Title */}
                <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
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
                                "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-3 py-2",
                                "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                "outline-none focus:border-[#1ca9b1] transition-colors"
                            )}
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                        Description
                    </label>
                    <div className="relative">
                        <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-[#c4c4c4]" />
                        <textarea
                            value={data.description || ""}
                            onChange={(e) => onChange({ description: e.target.value })}
                            placeholder="Brief overview of what this guide covers..."
                            rows={3}
                            className={cn(
                                "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-3 py-2",
                                "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                "outline-none focus:border-[#1ca9b1] transition-colors resize-none"
                            )}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Category */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                            Category
                        </label>
                        <div className="relative">
                            <FolderOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                            <input
                                type="text"
                                value={data.category || ""}
                                onChange={(e) => onChange({ category: e.target.value })}
                                placeholder="e.g., security"
                                className={cn(
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-3 py-2",
                                    "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                    "outline-none focus:border-[#1ca9b1] transition-colors"
                                )}
                            />
                        </div>
                    </div>

                    {/* Difficulty */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                            Difficulty
                        </label>
                        <div className="relative">
                            <BarChart3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                            <select
                                value={data.difficulty}
                                onChange={(e) => onChange({ difficulty: e.target.value })}
                                className={cn(
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-3 py-2",
                                    "text-[13px] text-[#3a3a3a]",
                                    "outline-none focus:border-[#1ca9b1] transition-colors appearance-none"
                                )}
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                            Est. Duration (min)
                        </label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                            <input
                                type="number"
                                min={1}
                                value={data.estimated_duration_minutes}
                                onChange={(e) => onChange({ estimated_duration_minutes: parseInt(e.target.value) || 1 })}
                                className={cn(
                                    "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-3 py-2",
                                    "text-[13px] text-[#3a3a3a]",
                                    "outline-none focus:border-[#1ca9b1] transition-colors"
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#727373] uppercase tracking-wider">
                        Tags
                    </label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={addTag}
                            placeholder="Type tag and press Enter..."
                            className={cn(
                                "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-3 py-2",
                                "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                                "outline-none focus:border-[#1ca9b1] transition-colors"
                            )}
                        />
                    </div>
                    {data.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {data.tags.map((tag) => (
                                <span
                                    key={tag}
                                    onClick={() => removeTag(tag)}
                                    className={cn(
                                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-md",
                                        "bg-[#e6f7f8] text-[#1ca9b1] text-xs font-medium",
                                        "cursor-pointer hover:bg-red-50 hover:text-red-500 transition-colors"
                                    )}
                                >
                                    {tag}
                                    <span className="text-[10px] opacity-60">×</span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

