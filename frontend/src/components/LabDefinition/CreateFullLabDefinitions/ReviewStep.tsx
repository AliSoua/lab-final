// src/components/LabDefinition/CreateFullLabDefinitions/ReviewStep.tsx
import { cn } from "@/lib/utils"
import { useFormContext } from "react-hook-form"
import type { CreateFullLabDefinitionFormData } from "@/types/LabDefinition/CreateFullLabDefinition"
import { FileText, Server, BookOpen, Clock, Tag, GraduationCap, Check, Sparkles } from "lucide-react"

export function ReviewStep() {
    const { watch } = useFormContext<CreateFullLabDefinitionFormData>()

    const data = watch()

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

            {/* NEW: Content Summary (Objectives, Prerequisites, Tags) */}
            <div className="bg-white rounded-xl border border-[#e8e8e8] p-6 shadow-sm">
                <h3 className="text-[13px] font-semibold text-[#3a3a3a] mb-4 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#1ca9b1]" />
                    Lab Content
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <span className="text-[#727373] block text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
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

            {/* Guide Summary */}
            <div className="bg-white rounded-xl border border-[#e8e8e8] p-6 shadow-sm">
                <h3 className="text-[13px] font-semibold text-[#3a3a3a] mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#1ca9b1]" />
                    Guide Blocks ({data.guide_blocks?.length || 0})
                </h3>
                <div className="space-y-2">
                    {data.guide_blocks?.map((block, index) => (
                        <div key={index} className="flex items-center gap-3 py-2 border-b border-[#f0f0f0] last:border-0">
                            <span className={cn(
                                "px-2 py-1 rounded text-[10px] font-medium uppercase",
                                block.block_type === "text" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                            )}>
                                {block.block_type}
                            </span>
                            <span className="text-[13px] text-[#3a3a3a] truncate">
                                {block.title || block.content || "Empty block"}
                            </span>
                        </div>
                    ))}
                    {(!data.guide_blocks || data.guide_blocks.length === 0) && (
                        <p className="text-[13px] text-[#c4c4c4] italic">No guide blocks added</p>
                    )}
                </div>
            </div>
        </div>
    )
}