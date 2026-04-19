// src/components/LabGuide/CreateGuideLab/ReviewStep.tsx
import { cn } from "@/lib/utils"
import { BookOpen, Clock, BarChart3, Tag, ListOrdered, Terminal, CheckCircle, Shield, HelpCircle } from "lucide-react"
import type { LabGuideCreateRequest } from "@/types/LabGuide"

interface ReviewStepProps {
    data: LabGuideCreateRequest
}

export function ReviewStep({ data }: ReviewStepProps) {
    return (
        <div className="space-y-6">
            {/* Basic Info Summary */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e8e8e8]">
                    <h2 className="text-[15px] font-semibold text-[#3a3a3a]">Guide Summary</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-medium text-[#c4c4c4] uppercase tracking-wider">Title</p>
                            <p className="text-sm font-medium text-[#3a3a3a] mt-0.5">{data.title}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-medium text-[#c4c4c4] uppercase tracking-wider">Category</p>
                            <p className="text-sm text-[#3a3a3a] mt-0.5">{data.category || "—"}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-medium text-[#c4c4c4] uppercase tracking-wider">Difficulty</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <BarChart3 className="h-3.5 w-3.5 text-[#1ca9b1]" />
                                <span className="text-sm text-[#3a3a3a] capitalize">{data.difficulty}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-medium text-[#c4c4c4] uppercase tracking-wider">Duration</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Clock className="h-3.5 w-3.5 text-[#1ca9b1]" />
                                <span className="text-sm text-[#3a3a3a]">{data.estimated_duration_minutes} min</span>
                            </div>
                        </div>
                    </div>

                    {data.description && (
                        <div>
                            <p className="text-[10px] font-medium text-[#c4c4c4] uppercase tracking-wider">Description</p>
                            <p className="text-sm text-[#727373] mt-0.5">{data.description}</p>
                        </div>
                    )}

                    {data.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {data.tags.map((t) => (
                                <span key={t} className="px-2 py-0.5 rounded bg-[#e6f7f8] text-[#1ca9b1] text-[11px] font-medium">
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Steps Summary */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e8e8e8] flex items-center justify-between">
                    <h2 className="text-[15px] font-semibold text-[#3a3a3a]">Steps Overview</h2>
                    <span className="text-xs text-[#727373]">{data.steps.length} total</span>
                </div>
                <div className="divide-y divide-[#f5f5f5]">
                    {data.steps.map((step, idx) => (
                        <div key={idx} className="px-6 py-4 flex items-start gap-4">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#e6f7f8] text-[#1ca9b1] text-xs font-bold">
                                {idx + 1}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-[#3a3a3a]">{step.title}</h3>
                                {step.description && (
                                    <p className="text-xs text-[#727373] mt-0.5">{step.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2">
                                    {step.theory_content && (
                                        <span className="flex items-center gap-1 text-[10px] text-[#727373]">
                                            <BookOpen className="h-3 w-3" />
                                            Theory
                                        </span>
                                    )}
                                    {step.commands.length > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] text-[#1ca9b1]">
                                            <Terminal className="h-3 w-3" />
                                            {step.commands.length} Cmd
                                        </span>
                                    )}
                                    {step.tasks.length > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] text-amber-600">
                                            <CheckCircle className="h-3 w-3" />
                                            {step.tasks.length} Tasks
                                        </span>
                                    )}
                                    {step.validations.length > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] text-green-600">
                                            <Shield className="h-3 w-3" />
                                            {step.validations.length} Checks
                                        </span>
                                    )}
                                    {step.quiz && (
                                        <span className="flex items-center gap-1 text-[10px] text-purple-600">
                                            <HelpCircle className="h-3 w-3" />
                                            Quiz
                                        </span>
                                    )}
                                    <span className="text-[10px] text-[#c4c4c4] ml-auto">{step.points || 0} pts</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}