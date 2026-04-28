// src/components/LabGuide/ListGuideLab/GuideActions.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    MoreHorizontal,
    Eye,
    Trash2,
    GitBranch,
    History,
} from "lucide-react"
import type { LabGuideListItem } from "@/types/LabGuide"

interface GuideActionsProps {
    guide: LabGuideListItem
    onPreview: (guide: LabGuideListItem) => void
    onDelete: (guide: LabGuideListItem) => void
    onViewVersions: (guide: LabGuideListItem) => void
    onCreateVersion: (guide: LabGuideListItem) => void
}

export function GuideActions({
    guide,
    onPreview,
    onDelete,
    onViewVersions,
    onCreateVersion,
}: GuideActionsProps) {
    const [open, setOpen] = useState(false)

    const hasAnyVersion = guide.current_version_id !== null

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        "text-[#727373] hover:bg-[#f5f5f5] hover:text-[#3a3a3a]",
                        "transition-colors duration-200"
                    )}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                {/* Preview — only if there's a current version */}
                <DropdownMenuItem
                    onClick={() => {
                        onPreview(guide)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer"
                    disabled={!hasAnyVersion}
                >
                    <Eye className="h-4 w-4 mr-2 text-[#727373]" />
                    Preview Current Version
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Version Management */}
                <div className="px-2 py-1.5">
                    <p className="text-[10px] font-semibold text-[#c4c4c4] uppercase tracking-wider">
                        Versions
                    </p>
                </div>

                <DropdownMenuItem
                    onClick={() => {
                        onViewVersions(guide)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer"
                >
                    <History className="h-4 w-4 mr-2 text-[#727373]" />
                    View All Versions
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => {
                        onCreateVersion(guide)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer"
                >
                    <GitBranch className="h-4 w-4 mr-2 text-[#1ca9b1]" />
                    <span className="text-[#1ca9b1]">Create New Version</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => {
                        onDelete(guide)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer text-red-600 focus:text-red-600"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Guide
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}