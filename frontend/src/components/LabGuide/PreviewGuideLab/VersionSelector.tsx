// src/components/LabGuide/PreviewGuideLab/VersionSelector.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GitBranch, Check, Loader2 } from "lucide-react"
import { useGuideVersions } from "@/hooks/LabGuide/useGuideVersions"

interface VersionSelectorProps {
    guideId: string
    currentVersionId: string
    currentVersionNumber: number
    isPublished: boolean
    totalVersions: number
    onVersionChange: (versionId: string) => void
}

export function VersionSelector({
    guideId,
    currentVersionId,
    currentVersionNumber,
    isPublished,
    totalVersions,
    onVersionChange,
}: VersionSelectorProps) {
    const [open, setOpen] = useState(false)
    const { versions, isLoading, fetchVersions } = useGuideVersions()

    const handleOpen = (isOpen: boolean) => {
        setOpen(isOpen)
        if (isOpen && versions.length === 0) {
            fetchVersions(guideId)
        }
    }

    return (
        <DropdownMenu open={open} onOpenChange={handleOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium",
                        "border border-[#e8e8e8] bg-white hover:bg-[#f9f9f9]",
                        "transition-colors duration-200"
                    )}
                >
                    <GitBranch className="h-3.5 w-3.5 text-[#1ca9b1]" />
                    <span>v{currentVersionNumber}</span>
                    <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isPublished ? "bg-green-500" : "bg-amber-500"
                    )} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 border-b border-[#e8e8e8]">
                    <p className="text-[10px] font-semibold text-[#c4c4c4] uppercase tracking-wider">
                        Select Version ({totalVersions} total)
                    </p>
                </div>

                {isLoading && versions.length === 0 ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-[#c4c4c4]" />
                    </div>
                ) : (
                    versions.map((v) => (
                        <DropdownMenuItem
                            key={v.id}
                            onClick={() => {
                                onVersionChange(v.id)
                                setOpen(false)
                            }}
                            className="text-[13px] cursor-pointer flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-medium">v{v.version_number}</span>
                                {v.is_published ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">
                                        Published
                                    </span>
                                ) : (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f5f5f5] text-[#727373] font-medium">
                                        Draft
                                    </span>
                                )}
                            </div>
                            {v.id === currentVersionId && (
                                <Check className="h-3.5 w-3.5 text-[#1ca9b1]" />
                            )}
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}