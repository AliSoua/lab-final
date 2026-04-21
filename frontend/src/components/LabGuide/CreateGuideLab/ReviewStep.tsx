// src/components/LabGuide/CreateGuideLab/ReviewStep.tsx
import { cn } from "@/lib/utils"
import { BookOpen, GitBranch, Layers, CheckCircle2, AlertCircle, Lock } from "lucide-react"
import type { LabGuideCreateRequest } from "@/types/LabGuide"

interface ReviewStepProps {
    data: LabGuideCreateRequest
}

export function ReviewStep({ data }: ReviewStepProps) {
    const totalPoints = (data.initial_steps || []).reduce((sum, s) => sum + (s.points || 0), 0)
    const hasSteps = (data.initial_steps || []).length > 0
    const isPublished = data.is_published || false

    return (
        <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e8e8e8]">
                    <h2 className="text-[15px] font-semibold text-[#3a3a3a]">Review & Confirm</h2>
                    <p className="text-xs text-[#727373] mt-0.5">
                        Verify the guide and its first immutable version before creation
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Guide Info */}
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[#e6f7f8] flex items-center justify-center text-[#1ca9b1] shrink-0">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-[#3a3a3a]">{data.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] px-2 py-0.5 rounded bg-[#f5f5f5] text-[#727373] font-medium">
                                    Logical Guide
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Version 1 Info */}
                    <div className="flex items-start gap-4 p-4 bg-[#f9f9f9] rounded-lg border border-[#e8e8e8]">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                            <Lock className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-sm font-semibold text-[#3a3a3a]">Version 1</h3>
                                {isPublished ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-600 font-medium flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Will be Published
                                    </span>
                                ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#f5f5f5] text-[#727373] font-medium flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Saved as Draft
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-[#727373]">
                                {hasSteps
                                    ? `${data.initial_steps?.length} steps • ${totalPoints} points`
                                    : "No steps — you can add a version later"
                                }
                            </p>
                            <p className="text-[11px] text-amber-700 mt-2">
                                <GitBranch className="h-3 w-3 inline mr-1" />
                                This version will be immutable. To edit later, you must create Version 2.
                            </p>
                        </div>
                    </div>

                    {/* Steps Preview */}
                    {hasSteps && (
                        <div>
                            <h4 className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider mb-3">
                                Steps Preview
                            </h4>
                            <div className="space-y-2">
                                {data.initial_steps?.map((step, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-3 p-3 bg-white border border-[#e8e8e8] rounded-lg"
                                    >
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#e6f7f8] text-[#1ca9b1] text-xs font-bold">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[#3a3a3a] truncate">
                                                {step.title || "Untitled Step"}
                                            </p>
                                            <p className="text-[11px] text-[#727373]">
                                                {step.points || 0} pts
                                                {step.commands.length > 0 && ` • ${step.commands.length} commands`}
                                                {step.validations.length > 0 && ` • ${step.validations.length} checks`}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!hasSteps && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-amber-800">No Steps Added</p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    You're creating a guide with no initial version. You can add Version 1 later from the guide management page.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}