// src/components/infrastructure/VMTemplateActions.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Pencil, Trash2, Play, Server } from "lucide-react"
import type { VMTemplate } from "@/types/infrastructure"

interface VMTemplateActionsProps {
    template: VMTemplate
    onView: (template: VMTemplate) => void
    onEdit: (template: VMTemplate) => void
    onDelete: (template: VMTemplate) => void
    onProvision?: (template: VMTemplate) => void
}

export function VMTemplateActions({
    template,
    onView,
    onEdit,
    onDelete,
    onProvision,
}: VMTemplateActionsProps) {
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
                        onView(template)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer"
                >
                    <Eye className="h-4 w-4 mr-2 text-[#727373]" />
                    View Details
                </DropdownMenuItem>

                {onProvision && template.status === "available" && (
                    <DropdownMenuItem
                        onClick={() => {
                            onProvision(template)
                            setOpen(false)
                        }}
                        className="text-[13px] cursor-pointer text-[#1ca9b1] focus:text-[#1ca9b1]"
                    >
                        <Play className="h-4 w-4 mr-2" />
                        Provision VM
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => {
                        onEdit(template)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer"
                >
                    <Pencil className="h-4 w-4 mr-2 text-[#727373]" />
                    Edit Template
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => {
                        onDelete(template)
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