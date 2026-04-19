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
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react"
import type { LabGuideListItem } from "@/types/LabGuide"

interface GuideActionsProps {
    guide: LabGuideListItem
    onPreview: (guide: LabGuideListItem) => void
    onEdit: (guide: LabGuideListItem) => void
    onDelete: (guide: LabGuideListItem) => void
}

export function GuideActions({ guide, onPreview, onEdit, onDelete }: GuideActionsProps) {
    const [open, setOpen] = useState(false)

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
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                    onClick={() => {
                        onPreview(guide)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer"
                >
                    <Eye className="h-4 w-4 mr-2 text-[#727373]" />
                    Preview
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => {
                        onEdit(guide)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer"
                >
                    <Pencil className="h-4 w-4 mr-2 text-[#727373]" />
                    Edit
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
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}