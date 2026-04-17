// src/components/infrastructure/ESXiHostActions.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Pencil, Trash2, RefreshCw, Server } from "lucide-react"
import type { ESXiHost } from "@/types/infrastructure"

interface ESXiHostActionsProps {
    host: ESXiHost
    onView: (host: ESXiHost) => void
    onEdit: (host: ESXiHost) => void
    onSync: (host: ESXiHost) => void
    onDelete: (host: ESXiHost) => void
}

export function ESXiHostActions({
    host,
    onView,
    onEdit,
    onSync,
    onDelete,
}: ESXiHostActionsProps) {
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
                        onView(host)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer"
                >
                    <Eye className="h-4 w-4 mr-2 text-[#727373]" />
                    View Details
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => {
                        onSync(host)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer text-[#1ca9b1] focus:text-[#1ca9b1]"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Templates
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => {
                        onEdit(host)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer"
                >
                    <Pencil className="h-4 w-4 mr-2 text-[#727373]" />
                    Edit Host
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => {
                        onDelete(host)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer text-red-600 focus:text-red-600"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Host
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}