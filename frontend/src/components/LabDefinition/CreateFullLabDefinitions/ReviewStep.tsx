// src/components/LabDefinition/CreateFullLabDefinitions/ReviewStep.tsx
import { cn } from "@/lib/utils"
import { useFormContext } from "react-hook-form"
import type { CreateFullLabDefinitionFormData } from "@/types/LabDefinition/CreateFullLabDefinition"
import {
    FileText,
    Server,
    BookOpen,
    Clock,
    Tag,
    GraduationCap,
    Check,
    Layers,
    AlertCircle,
    GitBranch,
    Star,
    Lock,
} from "lucide-react"
import { useLabGuides } from "@/hooks/LabGuide/useLabGuides"
import { useGuideVersions } from "@/hooks/LabGuide/useGuideVersions"
import { useEffect, useState } from "react"
import type { GuideVersion } from "@/types/LabGuide"

export function ReviewStep() {
    const { watch } = useFormContext<CreateFullLabDefinitionFormData>()
    const { guides } = useLabGuides()
    const { fetchVersion } = useGuideVersions()

    const data = watch()
    const [selectedVersion, setSelectedVersion] = useState<GuideVersion | null>(null)
    const [isLoadingVersion, setIsLoadingVersion] = useState(false)

    // Find the guide that owns the selected version
    const selectedGuide = guides.find((g) => g.id === data.guide_version_id)

    // Fetch version details if we have a version ID
    useEffect(() => {
        const loadVersion = async () => {
            if (!data.guide_version_id) {
                setSelectedVersion(null)
                return
            }

            // Try to find which guide has this version
            for (const guide of guides) {
                if (guide.current_version_id === data.guide_version_id) {
                    setIsLoadingVersion(true)
                    try {
                        const version = await fetchVersion(guide.id, data.guide_version_id)
                        if (version) setSelectedVersion(version)
                    } catch {
                        setSelectedVersion(null)
                    } finally {
                        setIsLoadingVersion(false)
                    }
                    return
                }
            }
        }

        loadVersion()
    }, [data.guide_version_id, guides, fetchVersion])

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-[#e8e8e8]">
                <Check className="h-4 w-4 text-[#1ca9b1]" />
                <h2 className="text-[14px] font-semibold text-[#3a3a3a] uppercase tracking-wider">
                    Review & Confirm
                </h2>
            </div>

            {/* Basic Info Summary */}
            <div className="bg-white rounded-xl border border-[#e8e8e8] p-6 shadow-sm">
                <h3 className="text-[13px] font-semibold text-[#3a3a3a] mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#1ca9b1]" />
                    Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                    <div>
                        <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-1">
                            Name
                        </span>
                        <span className="text-[#3a3a3a] font-medium">
                            {data.name || "Not set"}
                        </span>
                    </div>
                    <div>
                        <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-1">
                            Slug
                        </span>
                        <span className="text-[#3a3a3a] font-medium">
                            {data.slug || "Not set"}
                        </span>
                    </div>
                    <div>
                        <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-1">
                            Category
                        </span>
                        <span className="text-[#3a3a3a] font-medium capitalize">
                            {data.category || "Not set"}
                        </span>
                    </div>
                    <div>
                        <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-1">
                            Difficulty
                        </span>
                        <span className="text-[#3a3a3a] font-medium capitalize">
                            {data.difficulty || "Not set"}
                        </span>
                    </div>
                    <div className="col-span-2">
                        <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-1">
                            Duration
                        </span>
                        <span className="text-[#3a3a3a] font-medium flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {data.duration_minutes} minutes
                        </span>
                    </div>
                    {data.track && (
                        <div className="col-span-2">
                            <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-1">
                                Track
                            </span>
                            <span className="text-[#3a3a3a] font-medium">
                                {data.track}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Summary */}
            <div className="bg-white rounded-xl border border-[#e8e8e8] p-6 shadow-sm">
                <h3 className="text-[13px] font-semibold text-[#3a3a3a] mb-4 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-[#1ca9b1]" />
                    Lab Content
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Objectives ({data.objectives?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {data.objectives?.map((obj, i) => (
                                <span
                                    key={i}
                                    className="text-[11px] bg-[#e6f7f8] text-[#1ca9b1] px-2 py-1 rounded"
                                >
                                    {obj.value}
                                </span>
                            ))}
                            {(!data.objectives || data.objectives.length === 0) && (
                                <span className="text-[12px] text-[#c4c4c4] italic">
                                    None
                                </span>
                            )}
                        </div>
                    </div>

                    <div>
                        <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Prerequisites ({data.prerequisites?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {data.prerequisites?.map((pre, i) => (
                                <span
                                    key={i}
                                    className="text-[11px] bg-[#f5f5f5] text-[#727373] px-2 py-1 rounded"
                                >
                                    {pre.value}
                                </span>
                            ))}
                            {(!data.prerequisites ||
                                data.prerequisites.length === 0) && (
                                    <span className="text-[12px] text-[#c4c4c4] italic">
                                        None
                                    </span>
                                )}
                        </div>
                    </div>

                    <div>
                        <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            Tags ({data.tags?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {data.tags?.map((tag, i) => (
                                <span
                                    key={i}
                                    className="text-[11px] bg-[#1ca9b1]/10 text-[#1ca9b1] px-2 py-1 rounded"
                                >
                                    #{tag.value}
                                </span>
                            ))}
                            {(!data.tags || data.tags.length === 0) && (
                                <span className="text-[12px] text-[#c4c4c4] italic">
                                    None
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* VMs Summary */}
            <div className="bg-white rounded-xl border border-[#e8e8e8] p-6 shadow-sm">
                <h3 className="text-[13px] font-semibold text-[#3a3a3a] mb-4 flex items-center gap-2">
                    <Server className="h-4 w-4 text-[#1ca9b1]" />
                    Virtual Machines ({data.vms?.length || 0})
                </h3>
                <div className="space-y-3">
                    {data.vms?.map((vm, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between py-2 border-b border-[#f0f0f0] last:border-0"
                        >
                            <div>
                                <span className="text-[13px] font-medium text-[#3a3a3a]">
                                    {vm.name || `VM ${index + 1}`}
                                </span>
                                <p className="text-[11px] text-[#727373]">
                                    {vm.description || "No description"}
                                </p>
                            </div>
                            <div className="text-[11px] text-[#727373] bg-[#f5f5f5] px-3 py-1 rounded-full">
                                {vm.cpu_cores} vCPU · {vm.memory_mb / 1024}GB RAM ·{" "}
                                {vm.disk_gb}GB
                            </div>
                        </div>
                    ))}
                    {(!data.vms || data.vms.length === 0) && (
                        <p className="text-[13px] text-[#c4c4c4] italic">
                            No VMs configured
                        </p>
                    )}
                </div>
            </div>

            {/* Guide Version Summary */}
            <div className="bg-white rounded-xl border border-[#e8e8e8] p-6 shadow-sm">
                <h3 className="text-[13px] font-semibold text-[#3a3a3a] mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#1ca9b1]" />
                    Lab Guide Version
                </h3>

                {isLoadingVersion ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="h-5 w-5 border-2 border-[#1ca9b1]/30 border-t-[#1ca9b1] rounded-full animate-spin" />
                    </div>
                ) : selectedVersion ? (
                    <div className="space-y-4">
                        {/* Version Card */}
                        <div className="flex items-center gap-3 bg-[#e6f7f8] rounded-xl p-4 border border-[#1ca9b1]/20">
                            <div className="w-10 h-10 rounded-lg bg-[#1ca9b1]/10 flex items-center justify-center text-[#1ca9b1] shrink-0">
                                <GitBranch className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium text-[#3a3a3a] truncate">
                                        {selectedGuide?.title || "Guide"}
                                    </p>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1ca9b1] text-white font-semibold shrink-0">
                                        v{selectedVersion.version_number}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium shrink-0 flex items-center gap-0.5">
                                        <Check className="h-3 w-3" />
                                        Published
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                    <span className="flex items-center gap-1 text-[11px] text-[#727373]">
                                        <Layers className="h-3 w-3" />
                                        {selectedVersion.step_count} steps
                                    </span>
                                    <span className="text-[11px] text-[#727373] flex items-center gap-1">
                                        <Star className="h-3 w-3" />
                                        Immutable
                                    </span>
                                </div>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-[#1ca9b1] flex items-center justify-center text-white shrink-0">
                                <Check className="h-4 w-4" />
                            </div>
                        </div>

                        {/* Steps Preview */}
                        {selectedVersion.steps && selectedVersion.steps.length > 0 && (
                            <div>
                                <h4 className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider mb-2">
                                    Steps Preview
                                </h4>
                                <div className="space-y-2">
                                    {selectedVersion.steps.slice(0, 5).map((step: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-2 p-2.5 bg-[#f9f9f9] rounded-lg border border-[#e8e8e8]"
                                        >
                                            <span className="text-[10px] font-bold text-[#1ca9b1] bg-white px-1.5 py-0.5 rounded border border-[#e8e8e8]">
                                                #{step.order ?? idx + 1}
                                            </span>
                                            <span className="text-[12px] text-[#3a3a3a] truncate">
                                                {step.title || "Untitled"}
                                            </span>
                                            <span className="text-[10px] text-[#c4c4c4] ml-auto">
                                                {step.points || 0} pts
                                            </span>
                                        </div>
                                    ))}
                                    {selectedVersion.steps.length > 5 && (
                                        <p className="text-[11px] text-[#727373] text-center py-1">
                                            +{selectedVersion.steps.length - 5} more steps
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : data.guide_version_id ? (
                    /* Has ID but version not found (edge case) */
                    <div className="flex items-center gap-3 py-4 border border-dashed border-amber-300 rounded-xl bg-amber-50">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 ml-4">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[13px] text-amber-800 font-medium">
                                Version not loaded
                            </p>
                            <p className="text-[11px] text-amber-600">
                                Selected version ID: {data.guide_version_id}
                            </p>
                        </div>
                    </div>
                ) : (
                    /* No version selected */
                    <div className="flex items-center gap-3 py-4 border border-dashed border-[#d4d4d4] rounded-xl bg-[#f9f9f9]">
                        <div className="w-10 h-10 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-[#c4c4c4] ml-4">
                            <Lock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[13px] text-[#727373] font-medium">
                                No guide version selected
                            </p>
                            <p className="text-[11px] text-[#c4c4c4]">
                                Go back to the Guide step to select a published version
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}