// src/components/LabDefinition/CreateFullLabDefinitions/GuideStep.tsx
import { cn } from "@/lib/utils"
import { useFormContext } from "react-hook-form"
import type { CreateFullLabDefinitionFormData } from "@/types/LabDefinition/CreateFullLabDefinition"
import { useLabGuides } from "@/hooks/LabGuide/useLabGuides"
import { useGuideVersions } from "@/hooks/LabGuide/useGuideVersions"
import {
    BookOpen,
    Check,
    Layers,
    Search,
    X,
    GitBranch,
    Star,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Loader2,
} from "lucide-react"
import { useState, useCallback } from "react"

interface GuideWithVersions {
    guideId: string
    guideTitle: string
    versions: Array<{
        id: string
        version_number: number
        is_published: boolean
        step_count: number
    }>
}

export function GuideStep() {
    const { setValue, watch, formState: { errors } } = useFormContext<CreateFullLabDefinitionFormData>()
    const { guides, isLoading: guidesLoading } = useLabGuides()
    const { fetchVersions, isLoading: versionsLoading } = useGuideVersions()

    const [searchTerm, setSearchTerm] = useState("")
    const [expandedGuideId, setExpandedGuideId] = useState<string | null>(null)
    const [guideVersionsMap, setGuideVersionsMap] = useState<Record<string, GuideWithVersions["versions"]>>({})

    const selectedGuideVersionId = watch("guide_version_id")

    // Fetch versions when expanding a guide
    const handleExpandGuide = useCallback(async (guideId: string) => {
        if (expandedGuideId === guideId) {
            setExpandedGuideId(null)
            return
        }

        setExpandedGuideId(guideId)

        // Only fetch if we haven't cached them
        if (!guideVersionsMap[guideId]) {
            const versions = await fetchVersions(guideId)
            // Filter to only published versions (only these can be assigned to labs)
            const publishedVersions = versions.filter((v) => v.is_published)
            setGuideVersionsMap((prev) => ({
                ...prev,
                [guideId]: publishedVersions,
            }))
        }
    }, [expandedGuideId, guideVersionsMap, fetchVersions])

    // Find selected version info for display
    const selectedVersionInfo = (() => {
        for (const [guideId, versions] of Object.entries(guideVersionsMap)) {
            const version = versions.find((v) => v.id === selectedGuideVersionId)
            if (version) {
                const guide = guides.find((g) => g.id === guideId)
                return { guide, version }
            }
        }
        return null
    })()

    const filteredGuides = searchTerm
        ? guides.filter((g) =>
            g.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : guides

    const handleSelectVersion = (versionId: string) => {
        setValue("guide_version_id", versionId, { shouldValidate: true })
    }

    const handleClear = () => {
        setValue("guide_version_id", undefined, { shouldValidate: true })
        setExpandedGuideId(null)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#e8e8e8]">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#1ca9b1]" />
                    <h2 className="text-[14px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                        Select Guide Version
                    </h2>
                </div>
                {selectedVersionInfo && (
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

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-[#e6f7f8] border border-[#1ca9b1]/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-[#1ca9b1] shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-[#3a3a3a]">Published Versions Only</p>
                    <p className="text-xs text-[#727373] mt-0.5">
                        Only <strong>published guide versions</strong> can be assigned to lab definitions.
                        Expand a guide to see its available published versions.
                    </p>
                </div>
            </div>

            {/* Selected Version Banner */}
            {selectedVersionInfo && (
                <div className="bg-[#e6f7f8] border border-[#1ca9b1]/20 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1ca9b1]/10 flex items-center justify-center text-[#1ca9b1]">
                        <Check className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-[#3a3a3a]">
                            {selectedVersionInfo.guide?.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-[#727373] flex items-center gap-1">
                                <GitBranch className="h-3 w-3" />
                                v{selectedVersionInfo.version.version_number}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">
                                Published
                            </span>
                            <span className="text-[11px] text-[#727373] flex items-center gap-1">
                                <Layers className="h-3 w-3" />
                                {selectedVersionInfo.version.step_count} steps
                            </span>
                        </div>
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

            {/* Guides List with Expandable Versions */}
            <div className="space-y-2">
                {guidesLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="bg-white rounded-xl border border-[#e8e8e8] p-4 animate-pulse"
                            >
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
                            {searchTerm
                                ? "No guides match your search"
                                : "No guides available"}
                        </p>
                    </div>
                ) : (
                    filteredGuides.map((guide) => {
                        const isExpanded = expandedGuideId === guide.id
                        const hasPublishedVersion =
                            guide.current_version_published === true
                        const versions = guideVersionsMap[guide.id] || []

                        return (
                            <div
                                key={guide.id}
                                className={cn(
                                    "bg-white rounded-xl border transition-all duration-200 overflow-hidden",
                                    isExpanded
                                        ? "border-[#1ca9b1]/40 shadow-sm"
                                        : "border-[#e8e8e8] hover:border-[#1ca9b1]/30"
                                )}
                            >
                                {/* Guide Header — Click to expand */}
                                <button
                                    type="button"
                                    onClick={() => handleExpandGuide(guide.id)}
                                    className="w-full text-left p-4 flex items-center gap-3"
                                >
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                            hasPublishedVersion
                                                ? "bg-[#e6f7f8] text-[#1ca9b1]"
                                                : "bg-[#f5f5f5] text-[#c4c4c4]"
                                        )}
                                    >
                                        <BookOpen className="h-5 w-5" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-[#3a3a3a] truncate">
                                                {guide.title}
                                            </p>
                                            {guide.current_version_published ? (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium shrink-0">
                                                    Has Published
                                                </span>
                                            ) : (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f5f5f5] text-[#727373] font-medium shrink-0">
                                                    No Published
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[11px] text-[#727373] flex items-center gap-1">
                                                <Layers className="h-3 w-3" />
                                                {guide.step_count} steps
                                            </span>
                                            <span className="text-[11px] text-[#727373] flex items-center gap-1">
                                                <GitBranch className="h-3 w-3" />
                                                v
                                                {guide.current_version_number ??
                                                    "—"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-[#727373]" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-[#c4c4c4]" />
                                        )}
                                    </div>
                                </button>

                                {/* Expanded: Version List */}
                                {isExpanded && (
                                    <div className="border-t border-[#e8e8e8] bg-[#f9f9f9]">
                                        {versionsLoading && versions.length === 0 ? (
                                            <div className="p-4 flex items-center justify-center">
                                                <Loader2 className="h-4 w-4 animate-spin text-[#c4c4c4]" />
                                            </div>
                                        ) : versions.length === 0 ? (
                                            <div className="p-4 text-center">
                                                <p className="text-[12px] text-[#727373]">
                                                    {hasPublishedVersion
                                                        ? "Loading versions..."
                                                        : "No published versions available"}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="p-2 space-y-1">
                                                {versions.map((version) => {
                                                    const isSelected =
                                                        version.id ===
                                                        selectedGuideVersionId

                                                    return (
                                                        <button
                                                            key={version.id}
                                                            type="button"
                                                            onClick={() =>
                                                                handleSelectVersion(
                                                                    version.id
                                                                )
                                                            }
                                                            className={cn(
                                                                "w-full text-left rounded-lg p-3 transition-all duration-150 flex items-center gap-3",
                                                                isSelected
                                                                    ? "bg-white border border-[#1ca9b1] ring-1 ring-[#1ca9b1]/20 shadow-sm"
                                                                    : "hover:bg-white hover:shadow-sm border border-transparent"
                                                            )}
                                                        >
                                                            <div
                                                                className={cn(
                                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                                    isSelected
                                                                        ? "bg-[#e6f7f8] text-[#1ca9b1]"
                                                                        : "bg-white text-[#c4c4c4] border border-[#e8e8e8]"
                                                                )}
                                                            >
                                                                {isSelected ? (
                                                                    <Check className="h-4 w-4" />
                                                                ) : (
                                                                    <GitBranch className="h-4 w-4" />
                                                                )}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium text-[#3a3a3a]">
                                                                        v
                                                                        {
                                                                            version.version_number
                                                                        }
                                                                    </span>
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">
                                                                        Published
                                                                    </span>
                                                                </div>
                                                                <span className="text-[11px] text-[#727373] flex items-center gap-1 mt-0.5">
                                                                    <Layers className="h-3 w-3" />
                                                                    {
                                                                        version.step_count
                                                                    }{" "}
                                                                    steps
                                                                </span>
                                                            </div>

                                                            {isSelected && (
                                                                <div className="w-6 h-6 rounded-full bg-[#1ca9b1] flex items-center justify-center text-white shrink-0">
                                                                    <Check className="h-4 w-4" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* Validation Error */}
            {errors.guide_version_id && (
                <p className="text-[12px] text-red-500 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {errors.guide_version_id.message ||
                        "Please select a published guide version"}
                </p>
            )}
        </div>
    )
}