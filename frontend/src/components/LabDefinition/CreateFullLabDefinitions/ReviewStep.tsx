// src/components/LabDefinition/CreateFullLabDefinitions/ReviewStep.tsx
import { cn } from "@/lib/utils"
import { useFormContext } from "react-hook-form"
import type { CreateFullLabDefinitionFormData } from "@/types/LabDefinition/CreateFullLabDefinition"
import { FileText, Server, BookOpen, Clock, Tag, GraduationCap, Check, Layers, AlertCircle } from "lucide-react"
import { useLabGuides } from "@/hooks/LabGuide/useLabGuides"

export function ReviewStep() {
    const { watch } = useFormContext<CreateFullLabDefinitionFormData>()
    const { guides } = useLabGuides()

    const data = watch()
    const selectedGuide = guides.find(g => g.id === data.guide_id)

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
                        <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-1">Name</span>
                        <span className="text-[#3a3a3a] font-medium">{data.name || "Not set"}</span>
                    </div>
                    <div>
                        <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-1">Slug</span>
                        <span className="text-[#3a3a3a] font-medium">{data.slug || "Not set"}</span>
                    </div>
                    <div>
                        <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-1">Category</span>
                        <span className="text-[#3a3a3a] font-medium capitalize">{data.category || "Not set"}</span>
                    </div>
                    <div>
                        <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-1">Difficulty</span>
                        <span className="text-[#3a3a3a] font-medium capitalize">{data.difficulty || "Not set"}</span>
                    </div>
                    <div className="col-span-2">
                        <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-1">Duration</span>
                        <span className="text-[#3a3a3a] font-medium flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {data.duration_minutes} minutes
                        </span>
                    </div>
                    {data.track && (
                        <div className="col-span-2">
                            <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-1">Track</span>
                            <span className="text-[#3a3a3a] font-medium">{data.track}</span>
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
                                <span key={i} className="text-[11px] bg-[#e6f7f8] text-[#1ca9b1] px-2 py-1 rounded">
                                    {obj.value}
                                </span>
                            ))}
                            {(!data.objectives || data.objectives.length === 0) && (
                                <span className="text-[12px] text-[#c4c4c4] italic">None</span>
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
                                <span key={i} className="text-[11px] bg-[#f5f5f5] text-[#727373] px-2 py-1 rounded">
                                    {pre.value}
                                </span>
                            ))}
                            {(!data.prerequisites || data.prerequisites.length === 0) && (
                                <span className="text-[12px] text-[#c4c4c4] italic">None</span>
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
                                <span key={i} className="text-[11px] bg-[#1ca9b1]/10 text-[#1ca9b1] px-2 py-1 rounded">
                                    #{tag.value}
                                </span>
                            ))}
                            {(!data.tags || data.tags.length === 0) && (
                                <span className="text-[12px] text-[#c4c4c4] italic">None</span>
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
                        <div key={index} className="flex items-center justify-between py-2 border-b border-[#f0f0f0] last:border-0">
                            <div>
                                <span className="text-[13px] font-medium text-[#3a3a3a]">{vm.name || `VM ${index + 1}`}</span>
                                <p className="text-[11px] text-[#727373]">{vm.description || "No description"}</p>
                            </div>
                            <div className="text-[11px] text-[#727373] bg-[#f5f5f5] px-3 py-1 rounded-full">
                                {vm.cpu_cores} vCPU · {vm.memory_mb / 1024}GB RAM · {vm.disk_gb}GB
                            </div>
                        </div>
                    ))}
                    {(!data.vms || data.vms.length === 0) && (
                        <p className="text-[13px] text-[#c4c4c4] italic">No VMs configured</p>
                    )}
                </div>
            </div>

            {/* Guide Summary — Shows selected guide instead of blocks */}
            <div className="bg-white rounded-xl border border-[#e8e8e8] p-6 shadow-sm">
                <h3 className="text-[13px] font-semibold text-[#3a3a3a] mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#1ca9b1]" />
                    Lab Guide
                </h3>

                {selectedGuide ? (
                    <div className="flex items-center gap-3 bg-[#e6f7f8] rounded-xl p-4 border border-[#1ca9b1]/20">
                        <div className="w-10 h-10 rounded-lg bg-[#1ca9b1]/10 flex items-center justify-center text-[#1ca9b1] shrink-0">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-[#3a3a3a] truncate">
                                    {selectedGuide.title}
                                </p>
                                {selectedGuide.is_published ? (
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
                                    {selectedGuide.step_count} steps
                                </span>
                            </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#1ca9b1] flex items-center justify-center text-white shrink-0">
                            <Check className="h-4 w-4" />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 py-4 border border-dashed border-[#d4d4d4] rounded-xl bg-[#f9f9f9]">
                        <div className="w-10 h-10 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-[#c4c4c4] ml-4">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[13px] text-[#727373] font-medium">No guide selected</p>
                            <p className="text-[11px] text-[#c4c4c4]">Go back to the Guide step to select a guide</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}