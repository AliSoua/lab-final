// src/components/infrastructure/VMActions.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Play, Square, RotateCcw, Trash2 } from "lucide-react"
import type { VirtualMachine } from "@/types/infrastructure"

interface VMActionsProps {
    vm: VirtualMachine
    onView: (vm: VirtualMachine) => void
    onStart?: (vm: VirtualMachine) => void
    onStop?: (vm: VirtualMachine) => void
    onRestart?: (vm: VirtualMachine) => void
    onDelete?: (vm: VirtualMachine) => void
}

export function VMActions({
    vm,
    onView,
    onStart,
    onStop,
    onRestart,
    onDelete,
}: VMActionsProps) {
    const [open, setOpen] = useState(false)

    const canStart = vm.status === "stopped" || vm.status === "suspended"
    const canStop = vm.status === "running"
    const canRestart = vm.status === "running"

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
                        onView(vm)
                        setOpen(false)
                    }}
                    className="text-[13px] cursor-pointer"
                >
                    <Eye className="h-4 w-4 mr-2 text-[#727373]" />
                    View Details
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {canStart && onStart && (
                    <DropdownMenuItem
                        onClick={() => {
                            onStart(vm)
                            setOpen(false)
                        }}
                        className="text-[13px] cursor-pointer text-emerald-600 focus:text-emerald-600"
                    >
                        <Play className="h-4 w-4 mr-2" />
                        Start VM
                    </DropdownMenuItem>
                )}

                {canStop && onStop && (
                    <DropdownMenuItem
                        onClick={() => {
                            onStop(vm)
                            setOpen(false)
                        }}
                        className="text-[13px] cursor-pointer text-amber-600 focus:text-amber-600"
                    >
                        <Square className="h-4 w-4 mr-2" />
                        Stop VM
                    </DropdownMenuItem>
                )}

                {canRestart && onRestart && (
                    <DropdownMenuItem
                        onClick={() => {
                            onRestart(vm)
                            setOpen(false)
                        }}
                        className="text-[13px] cursor-pointer text-[#1ca9b1] focus:text-[#1ca9b1]"
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restart VM
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {onDelete && (
                    <DropdownMenuItem
                        onClick={() => {
                            onDelete(vm)
                            setOpen(false)
                        }}
                        className="text-[13px] cursor-pointer text-red-600 focus:text-red-600"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete VM
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}