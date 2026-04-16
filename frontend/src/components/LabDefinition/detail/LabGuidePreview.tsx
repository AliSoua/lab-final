// src/components/LabDefinition/detail/LabGuidePreview.tsx
import { BookOpen, FileText, Code, Terminal, Image, AlertTriangle, CheckSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LabGuideBlock } from "@/types/LabDefinition/LabDetail"

interface LabGuidePreviewProps {
    guideBlocks: LabGuideBlock[]
}

const blockIcons = {
    text: FileText,
    code: Code,
    command: Terminal,
    image: Image,
    alert: AlertTriangle,
    checklist: CheckSquare,
}

const blockColors = {
    text: "bg-blue-50 text-blue-600 border-blue-100",
    code: "bg-purple-50 text-purple-600 border-purple-100",
    command: "bg-slate-50 text-slate-600 border-slate-100",
    image: "bg-emerald-50 text-emerald-600 border-emerald-100",
    alert: "bg-amber-50 text-amber-600 border-amber-100",
    checklist: "bg-cyan-50 text-cyan-600 border-cyan-100",
}

export function LabGuidePreview({ guideBlocks }: LabGuidePreviewProps) {
    if (!guideBlocks || guideBlocks.length === 0) {
        return null
    }

    const previewBlocks = guideBlocks.slice(0, 3)
    const remainingCount = guideBlocks.length - 3

    return (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1ca9b1]/10">
                    <BookOpen className="h-5 w-5 text-[#1ca9b1]" />
                </div>
                <div className="flex-1">
                    <h2 className="text-[16px] font-semibold text-[#3a3a3a]">
                        Lab Guide Preview
                    </h2>
                    <p className="text-[12px] text-[#727373]">
                        {guideBlocks.length} steps in this lab
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {previewBlocks.map((block, index) => {
                    const Icon = blockIcons[block.type] || FileText
                    const colors = blockColors[block.type] || blockColors.text

                    return (
                        <div
                            key={block.id}
                            className={cn(
                                "flex items-start gap-3 rounded-lg border border-[#f0f0f0] bg-white p-4",
                                "transition-all duration-200 hover:shadow-sm"
                            )}
                        >
                            <div className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                                colors
                            )}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#727373]">
                                        Step {block.order}
                                    </span>
                                    <span className={cn(
                                        "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                                        colors
                                    )}>
                                        {block.type}
                                    </span>
                                </div>
                                {block.title && (
                                    <h4 className="text-[13px] font-medium text-[#3a3a3a] mb-1">
                                        {block.title}
                                    </h4>
                                )}
                                <p className="text-[12px] text-[#727373] line-clamp-2">
                                    {block.content}
                                </p>
                            </div>
                        </div>
                    )
                })}

                {remainingCount > 0 && (
                    <div className="flex items-center justify-center py-3 border-t border-[#f0f0f0]">
                        <span className="text-[12px] text-[#727373]">
                            +{remainingCount} more steps
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}