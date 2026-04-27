// src/components/LabInstance/admin/ListLabInstance/InstanceActions.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Square, Trash2 } from "lucide-react"
import type { LabInstance } from "@/types/LabInstance/LabInstance"

interface InstanceActionsProps {
    instance: LabInstance
    onView: (instance: LabInstance) => void
    onStop: (instance: LabInstance) => void
    onTerminate: (instance: LabInstance) => void
    isSubmitting: boolean
}

export function InstanceActions({
    instance,
    onView,
    onStop,
    onTerminate,
    isSubmitting,
}: InstanceActionsProps) {
    const [open, setOpen] = useState(false)

    const canStop = instance.status === "running" || instance.status === "provisioning"
    const canTerminate = instance.status !== "terminated"

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    disabled={isSubmitting}
                    className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        "text-[#727373] hover:bg-[#f5f5f5] hover:text-[#3a3a3a]",
                        "transition-colors duration-200 disabled:opacity-50"
                    )}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                    onClick={() => {
                        onView(instance)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer"
                >
                    <Eye className="h-4 w-4 mr-2 text-[#727373]" />
                    View Details
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => {
                        onStop(instance)
                        setOpen(false)
                    }}
                    disabled={!canStop || isSubmitting}
                    className={cn(
                        "text-[13px] cursor-pointer",
                        !canStop && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <Square className="h-4 w-4 mr-2 text-amber-600" />
                    Stop Instance
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => {
                        onTerminate(instance)
                        setOpen(false)
                    }}
                    disabled={!canTerminate || isSubmitting}
                    className={cn(
                        "text-[13px] cursor-pointer text-red-600 focus:text-red-600",
                        !canTerminate && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Terminate
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}