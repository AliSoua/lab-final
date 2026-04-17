// src/components/infrastructure/ESXiHostTable.tsx
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
import { Server, Cpu, HardDrive, MemoryStick, Activity, Clock } from "lucide-react"
import type { ESXiHost } from "@/types/infrastructure"
import { ESXiHostActions } from "./ESXiHostActions"

interface ESXiHostTableProps {
    hosts: ESXiHost[]
    isLoading: boolean
    onView: (host: ESXiHost) => void
    onEdit: (host: ESXiHost) => void
    onSync: (host: ESXiHost) => void
    onDelete: (host: ESXiHost) => void
}

const statusColors: Record<string, string> = {
    online: "bg-emerald-100 text-emerald-700 border-emerald-200",
    offline: "bg-red-100 text-red-700 border-red-200",
    maintenance: "bg-amber-100 text-amber-700 border-amber-200",
    error: "bg-rose-100 text-rose-700 border-rose-200",
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
            <TableCell><div className="h-4 w-32 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-20 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-8 w-8 bg-[#f0f0f0] rounded" /></TableCell>
        </TableRow>
    )
}

export function ESXiHostTable({
    hosts,
    isLoading,
    onView,
    onEdit,
    onSync,
    onDelete,
}: ESXiHostTableProps) {
    if (!isLoading && hosts.length === 0) {
        return (
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                        <Server className="h-6 w-6 text-[#c4c4c4]" />
                    </div>
                    <h3 className="text-sm font-medium text-[#3a3a3a]">No ESXi hosts found</h3>
                    <p className="text-xs text-[#727373] mt-1">Add an ESXi host to get started</p>
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
                                Host
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Status
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Resources
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                VMs / Templates
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Last Synced
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
                            hosts.map((host, index) => (
                                <TableRow
                                    key={host.id}
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
                                                statusColors[host.status]
                                            )}>
                                                <Server className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-[#3a3a3a] text-sm truncate">
                                                    {host.name}
                                                </p>
                                                <p className="text-xs text-[#727373] truncate">
                                                    {host.hostname}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-xs font-medium border capitalize",
                                                statusColors[host.status]
                                            )}
                                        >
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full mr-1.5",
                                                host.status === "online" ? "bg-emerald-500" :
                                                    host.status === "offline" ? "bg-red-500" :
                                                        host.status === "maintenance" ? "bg-amber-500" : "bg-rose-500"
                                            )} />
                                            {host.status}
                                        </Badge>
                                    </TableCell>

                                    <TableCell>
                                        <div className="space-y-1 text-xs text-[#727373]">
                                            <div className="flex items-center gap-2">
                                                <Cpu className="h-3 w-3" />
                                                <span>{host.cpu_used}/{host.cpu_total} vCPU</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MemoryStick className="h-3 w-3" />
                                                <span>{host.memory_used_gb}/{host.memory_total_gb} GB</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="h-3 w-3" />
                                                <span>{host.storage_used_gb}/{host.storage_total_gb} GB</span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-3 text-sm text-[#3a3a3a]">
                                            <span className="flex items-center gap-1">
                                                <Activity className="h-3.5 w-3.5 text-[#1ca9b1]" />
                                                {host.vm_count} VMs
                                            </span>
                                            <span className="text-[#c4c4c4]">|</span>
                                            <span className="flex items-center gap-1">
                                                <Server className="h-3.5 w-3.5 text-[#727373]" />
                                                {host.template_count} Templates
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-sm text-[#727373]">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>
                                                {new Date(host.last_synced_at).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <ESXiHostActions
                                            host={host}
                                            onView={onView}
                                            onEdit={onEdit}
                                            onSync={onSync}
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