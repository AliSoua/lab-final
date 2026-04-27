// src/components/LabInstance/admin/ListLabInstance/InstanceTable.tsx

import { cn } from "@/lib/utils"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Monitor, Server, User, Clock } from "lucide-react"
import type { LabInstance } from "@/types/LabInstance/LabInstance"
import { StatusBadge } from "./StatusBadge"
import { InstanceActions } from "./InstanceActions"

interface InstanceTableProps {
    instances: LabInstance[]
    isLoading: boolean
    isSubmitting: boolean
    onView: (instance: LabInstance) => void
    onStop: (instance: LabInstance) => void
    onTerminate: (instance: LabInstance) => void
}

function SkeletonRow() {
    return (
        <TableRow className="animate-pulse">
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#f0f0f0]" />
                    <div className="space-y-1.5">
                        <div className="h-4 w-40 bg-[#f0f0f0] rounded" />
                        <div className="h-3 w-24 bg-[#f0f0f0] rounded" />
                    </div>
                </div>
            </TableCell>
            <TableCell><div className="h-5 w-16 bg-[#f0f0f0] rounded-full" /></TableCell>
            <TableCell><div className="h-4 w-20 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-28 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-32 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-24 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell className="text-right"><div className="h-8 w-8 bg-[#f0f0f0] rounded ml-auto" /></TableCell>
        </TableRow>
    )
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

export function InstanceTable({
    instances,
    isLoading,
    isSubmitting,
    onView,
    onStop,
    onTerminate,
}: InstanceTableProps) {
    if (!isLoading && instances.length === 0) {
        return (
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                        <Monitor className="h-6 w-6 text-[#c4c4c4]" />
                    </div>
                    <h3 className="text-sm font-medium text-[#3a3a3a]">No active instances</h3>
                    <p className="text-xs text-[#727373] mt-1">
                        Lab instances will appear here when trainees launch labs
                    </p>
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
                                Instance
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Status
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Power State
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                IP Address
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Trainee
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Created
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
                            </>
                        ) : (
                            instances.map((instance, index) => (
                                <TableRow
                                    key={instance.id}
                                    className={cn(
                                        "transition-colors",
                                        index % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]/50",
                                        "hover:bg-[#f5f5f5]"
                                    )}
                                >
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#e6f7f8] flex items-center justify-center text-[#1ca9b1] shrink-0">
                                                <Server className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-[#3a3a3a] text-sm truncate">
                                                    {instance.vm_name || instance.id.slice(0, 8)}
                                                </p>
                                                <p className="text-[11px] text-[#727373] truncate">
                                                    {instance.vcenter_host || "No vCenter"}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <StatusBadge status={instance.status} />
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className={cn(
                                                    "h-2 w-2 rounded-full",
                                                    instance.power_state === "poweredOn"
                                                        ? "bg-emerald-500"
                                                        : instance.power_state === "poweredOff"
                                                            ? "bg-gray-400"
                                                            : "bg-amber-500"
                                                )}
                                            />
                                            <span className="text-sm text-[#3a3a3a] capitalize">
                                                {instance.power_state || "Unknown"}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {instance.ip_address ? (
                                            <span className="text-sm text-[#3a3a3a] font-mono">
                                                {instance.ip_address}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-[#c4c4c4]">—</span>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5 text-[#c4c4c4]" />
                                            <span className="text-sm text-[#3a3a3a] truncate max-w-[120px]">
                                                {instance.trainee_id.slice(0, 8)}...
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5 text-[#c4c4c4]" />
                                            <span className="text-[13px] text-[#727373]">
                                                {formatDate(instance.created_at)}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <InstanceActions
                                            instance={instance}
                                            onView={onView}
                                            onStop={onStop}
                                            onTerminate={onTerminate}
                                            isSubmitting={isSubmitting}
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