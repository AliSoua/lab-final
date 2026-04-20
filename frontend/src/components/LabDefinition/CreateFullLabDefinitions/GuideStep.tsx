// src/components/LabDefinition/CreateFullLabDefinitions/GuideStep.tsx
import { cn } from "@/lib/utils"
import { useFormContext } from "react-hook-form"
import type { CreateFullLabDefinitionFormData } from "@/types/LabDefinition/CreateFullLabDefinition"
import { useLabGuides } from "@/hooks/LabGuide/useLabGuides"
import { BookOpen, Check, Layers, Search, X } from "lucide-react"
import { useState } from "react"

export function GuideStep() {
    const { setValue, watch, formState: { errors } } = useFormContext<CreateFullLabDefinitionFormData>()
    const { guides, isLoading } = useLabGuides()
    const [searchTerm, setSearchTerm] = useState("")
    const selectedGuideId = watch("guide_id")

    const filteredGuides = searchTerm
        ? guides.filter(g =>
            g.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : guides

    const selectedGuide = guides.find(g => g.id === selectedGuideId)

    const handleSelect = (guideId: string) => {
        setValue("guide_id", guideId, { shouldValidate: true })
    }

    const handleClear = () => {
        setValue("guide_id", undefined, { shouldValidate: true })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#e8e8e8]">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#1ca9b1]" />
                    <h2 className="text-[14px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                        Select Lab Guide
                    </h2>
                </div>
                {selectedGuide && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="flex items-center gap-1.5 text-[12px] text-[#727373] hover:text-red-500 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear selection
                    </button>
                )}
            </div>

            {/* Selected Guide Banner */}
            {selectedGuide && (
                <div className="bg-[#e6f7f8] border border-[#1ca9b1]/20 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1ca9b1]/10 flex items-center justify-center text-[#1ca9b1]">
                        <Check className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-[#3a3a3a]">{selectedGuide.title}</p>
                        <p className="text-[11px] text-[#727373] mt-0.5">
                            {selectedGuide.step_count} steps • {selectedGuide.is_published ? "Published" : "Draft"}
                        </p>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded bg-[#1ca9b1] text-white font-medium">
                        Selected
                    </span>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c4c4]" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search guides by title..."
                    className={cn(
                        "w-full rounded-lg border border-[#d4d4d4] bg-white pl-10 pr-3 py-2.5",
                        "text-[13px] text-[#3a3a3a] placeholder:text-[#c4c4c4]",
                        "outline-none focus:border-[#1ca9b1] focus:ring-1 focus:ring-[#1ca9b1]/20 transition-all"
                    )}
                />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c4c4c4] hover:text-[#727373]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Guides List */}
            <div className="space-y-2">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-xl border border-[#e8e8e8] p-4 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-[#f0f0f0]" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 w-48 bg-[#f0f0f0] rounded" />
                                        <div className="h-3 w-24 bg-[#f0f0f0] rounded" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredGuides.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-[#d4d4d4]">
                        <BookOpen className="h-12 w-12 text-[#c4c4c4] mx-auto mb-4" />
                        <p className="text-[13px] text-[#727373]">
                            {searchTerm ? "No guides match your search" : "No guides available"}
                        </p>
                    </div>
                ) : (
                    filteredGuides.map((guide) => {
                        const isSelected = guide.id === selectedGuideId

                        return (
                            <button
                                key={guide.id}
                                type="button"
                                onClick={() => handleSelect(guide.id)}
                                className={cn(
                                    "w-full text-left bg-white rounded-xl border p-4 transition-all duration-200",
                                    "hover:shadow-sm",
                                    isSelected
                                        ? "border-[#1ca9b1] ring-1 ring-[#1ca9b1]/20"
                                        : "border-[#e8e8e8] hover:border-[#1ca9b1]/50"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                        isSelected ? "bg-[#e6f7f8] text-[#1ca9b1]" : "bg-[#f5f5f5] text-[#c4c4c4]"
                                    )}>
                                        {isSelected ? (
                                            <Check className="h-5 w-5" />
                                        ) : (
                                            <BookOpen className="h-5 w-5" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-[#3a3a3a] truncate">
                                                {guide.title}
                                            </p>
                                            {guide.is_published ? (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium shrink-0">
                                                    Published
                                                </span>
                                            ) : (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f5f5f5] text-[#727373] font-medium shrink-0">
                                                    Draft
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="flex items-center gap-1 text-[11px] text-[#727373]">
                                                <Layers className="h-3 w-3" />
                                                {guide.step_count} steps
                                            </span>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div className="w-6 h-6 rounded-full bg-[#1ca9b1] flex items-center justify-center text-white shrink-0">
                                            <Check className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                            </button>
                        )
                    })
                )}
            </div>

            {/* Validation Error */}
            {errors.guide_id && (
                <p className="text-[12px] text-red-500 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {errors.guide_id.message || "Please select a guide"}
                </p>
            )}
        </div>
    )
}