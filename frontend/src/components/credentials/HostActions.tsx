// src/components/credentials/HostActions.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2, Server } from "lucide-react"
import type { HostInfo } from "@/types/credentials"

interface HostActionsProps {
    host: HostInfo
    onEdit: (host: HostInfo) => void
    onDelete: (host: HostInfo) => void
}

export function HostActions({ host, onEdit, onDelete }: HostActionsProps) {
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
                        onEdit(host)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer"
                >
                    <Pencil className="h-4 w-4 mr-2 text-[#727373]" />
                    Edit Credentials
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