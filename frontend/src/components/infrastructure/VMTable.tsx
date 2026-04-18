// src/components/infrastructure/VMTable.tsx
import { cn } from "@/lib/utils"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    Monitor,
    Cpu,
    MemoryStick,
    Power,
    Circle,
    Tag,
    CheckCircle2,
    AlertCircle,
    Clock
} from "lucide-react"
import type { VirtualMachine } from "@/types/infrastructure"
import { VMActions } from "./VMActions"

interface VMTableProps {
    vms: VirtualMachine[]
    isLoading: boolean
    onView: (vm: VirtualMachine) => void
    onStart?: (vm: VirtualMachine) => void
    onStop?: (vm: VirtualMachine) => void
    onRestart?: (vm: VirtualMachine) => void
    onDelete?: (vm: VirtualMachine) => void
}

const powerStateColors: Record<string, string> = {
    poweredOn: "bg-emerald-100 text-emerald-700 border-emerald-200",
    poweredOff: "bg-slate-100 text-slate-600 border-slate-200",
    suspended: "bg-amber-100 text-amber-700 border-amber-200",
}

const powerStateDot = (state: string) => {
    switch (state) {
        case "poweredOn": return "bg-emerald-500"
        case "poweredOff": return "bg-slate-400"
        case "suspended": return "bg-amber-500"
        default: return "bg-gray-400"
    }
}

const toolsStatusIcon = (status: string) => {
    if (status === "toolsOk" || status === "toolsOld") {
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    }
    return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
}

function SkeletonRow() {
    return (
        <TableRow className="animate-pulse">
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#f0f0f0]" />
                    <div className="space-y-1.5">
                        <div className="h-4 w-32 bg-[#f0f0f0] rounded" />
                        <div className="h-3 w-24 bg-[#f0f0f0] rounded" />
                    </div>
                </div>
            </TableCell>
            <TableCell><div className="h-6 w-20 bg-[#f0f0f0] rounded-full" /></TableCell>
            <TableCell><div className="h-4 w-24 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-20 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-24 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-8 w-8 bg-[#f0f0f0] rounded" /></TableCell>
        </TableRow>
    )
}

export function VMTable({
    vms,
    isLoading,
    onView,
    onStart,
    onStop,
    onRestart,
    onDelete,
}: VMTableProps) {
    if (!isLoading && vms.length === 0) {
        return (
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                        <Monitor className="h-6 w-6 text-[#c4c4c4]" />
                    </div>
                    <h3 className="text-sm font-medium text-[#3a3a3a]">No virtual machines found</h3>
                    <p className="text-xs text-[#727373] mt-1">Provision a VM from a template to get started</p>
                </div>
            </div>
        )
    }

    return (
        <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-[#f9f9f9] hover:bg-[#f9f9f9]">
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                VM
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Power State
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Resources
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Network
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                ESXi Host
                            </TableHead>
                            <TableHead className="w-[60px] text-xs font-semibold text-[#727373] uppercase tracking-wider text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <>
                                <SkeletonRow />
                                <SkeletonRow />
                                <SkeletonRow />
                                <SkeletonRow />
                                <SkeletonRow />
                            </>
                        ) : (
                            vms.map((vm, index) => (
                                <TableRow
                                    key={vm.uuid || vm.id}
                                    className={cn(
                                        "transition-colors",
                                        index % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]/50",
                                        "hover:bg-[#f5f5f5]"
                                    )}
                                >
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center border shrink-0",
                                                vm.power_state === "poweredOn"
                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                                    : "bg-slate-50 border-slate-200 text-slate-500"
                                            )}>
                                                <Monitor className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-[#3a3a3a] text-sm truncate">
                                                    {vm.name}
                                                </p>
                                                <p className="text-xs text-[#727373] truncate">
                                                    {vm.guest_os || "Unknown OS"}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex flex-col gap-1.5">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-xs font-medium border capitalize w-fit",
                                                    powerStateColors[vm.power_state] || "bg-gray-100 text-gray-700 border-gray-200"
                                                )}
                                            >
                                                <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", powerStateDot(vm.power_state))} />
                                                {vm.power_state.replace("powered", "")}
                                            </Badge>

                                            {vm.tools_status && (
                                                <div className="flex items-center gap-1 text-xs text-[#727373]">
                                                    {toolsStatusIcon(vm.tools_status)}
                                                    <span className="capitalize">
                                                        {vm.tools_status.replace("tools", "").toLowerCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-3 text-xs text-[#727373]">
                                            <span className="flex items-center gap-1">
                                                <Cpu className="h-3 w-3" />
                                                {vm.cpu_count}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MemoryStick className="h-3 w-3" />
                                                {vm.memory_mb / 1024}GB
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex flex-col gap-1 text-xs">
                                            {vm.ip_address ? (
                                                <span className="text-[#3a3a3a] font-medium">
                                                    {vm.ip_address}
                                                </span>
                                            ) : (
                                                <span className="text-[#727373] italic">
                                                    No IP address
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <Tag className="h-3.5 w-3.5 text-[#c4c4c4]" />
                                            <span className="text-sm text-[#3a3a3a]">
                                                {vm.esxi_host_name}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <VMActions
                                            vm={vm}
                                            onView={onView}
                                            onStart={onStart}
                                            onStop={onStop}
                                            onRestart={onRestart}
                                            onDelete={onDelete}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
