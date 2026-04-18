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
import {
    Server,
    Cpu,
    MemoryStick,
    Activity,
    Power,
    AlertTriangle,
    CheckCircle2,
    Wrench,
    Clock
} from "lucide-react"
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

const connectionStateColors: Record<string, string> = {
    connected: "bg-emerald-100 text-emerald-700 border-emerald-200",
    disconnected: "bg-red-100 text-red-700 border-red-200",
    notResponding: "bg-amber-100 text-amber-700 border-amber-200",
}

const statusDotColor = (state: string) => {
    switch (state) {
        case "connected": return "bg-emerald-500"
        case "disconnected": return "bg-red-500"
        case "notResponding": return "bg-amber-500"
        default: return "bg-gray-400"
    }
}

const overallStatusIcon = (status: string) => {
    switch (status) {
        case "green": return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        case "yellow": return <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        case "red": return <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
        default: return <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
    }
}

function SkeletonRow() {
    return (
        <TableRow className="animate-pulse">
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#f0f0f0]" />
                    <div className="space-y-1.5">
                        <div className="h-4 w-32 bg-[#f0f0f0] rounded" />
                        <div className="h-3 w-48 bg-[#f0f0f0] rounded" />
                    </div>
                </div>
            </TableCell>
            <TableCell><div className="h-6 w-24 bg-[#f0f0f0] rounded-full" /></TableCell>
            <TableCell><div className="h-4 w-32 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-24 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-16 bg-[#f0f0f0] rounded" /></TableCell>
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
                                Hardware
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                System
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Inventory
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
                                    key={host.name}
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
                                                host.connection_state === "connected"
                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                                    : "bg-red-50 border-red-200 text-red-600"
                                            )}>
                                                <Server className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-[#3a3a3a] text-sm truncate">
                                                    {host.name}
                                                </p>
                                                <p className="text-xs text-[#727373] truncate">
                                                    {host.model || "Unknown model"}
                                                </p>
                                                {host.vendor && (
                                                    <p className="text-[10px] text-[#999] truncate">
                                                        {host.vendor}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex flex-col gap-1.5">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-xs font-medium border capitalize w-fit",
                                                    connectionStateColors[host.connection_state] || "bg-gray-100 text-gray-700 border-gray-200"
                                                )}
                                            >
                                                <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusDotColor(host.connection_state))} />
                                                {host.connection_state}
                                            </Badge>

                                            <div className="flex items-center gap-1 text-xs text-[#727373]">
                                                <Power className="h-3 w-3" />
                                                <span className={cn(
                                                    host.power_state === "poweredOn" ? "text-emerald-600" : "text-red-600"
                                                )}>
                                                    {host.power_state}
                                                </span>
                                            </div>

                                            {host.in_maintenance_mode && (
                                                <div className="flex items-center gap-1 text-amber-600 text-xs">
                                                    <Wrench className="h-3 w-3" />
                                                    <span className="font-medium">Maintenance</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="space-y-1.5 text-xs text-[#727373]">
                                            <div className="flex items-center gap-2">
                                                <Cpu className="h-3 w-3 text-[#1ca9b1]" />
                                                <span className="text-[#3a3a3a] font-medium">
                                                    {host.cpu_cores} cores
                                                </span>
                                                <span className="text-[#c4c4c4]">/</span>
                                                <span>{host.cpu_threads} thr</span>
                                            </div>
                                            {host.cpu_mhz > 0 && (
                                                <div className="text-[10px] text-[#999]">
                                                    @ {host.cpu_mhz} MHz
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <MemoryStick className="h-3 w-3 text-[#1ca9b1]" />
                                                <span className="text-[#3a3a3a] font-medium">
                                                    {host.memory_gb} GB
                                                </span>
                                            </div>
                                            {host.cpu_model && (
                                                <p className="text-[10px] text-[#999] truncate max-w-[220px]" title={host.cpu_model}>
                                                    {host.cpu_model}
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex items-center gap-2 text-[#727373]">
                                                <span className="font-medium text-[#3a3a3a]">ESXi:</span>
                                                <span>{host.esxi_version || "Unknown"}</span>
                                            </div>
                                            {host.esxi_build && (
                                                <div className="text-[10px] text-[#999]">
                                                    Build {host.esxi_build}
                                                </div>
                                            )}
                                            {host.license_name && (
                                                <div className="text-[10px] text-[#999] truncate max-w-[180px]">
                                                    {host.license_name}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                                {overallStatusIcon(host.overall_status)}
                                                <span className={cn(
                                                    "text-xs font-medium",
                                                    host.overall_status === "green" ? "text-emerald-600" :
                                                        host.overall_status === "yellow" ? "text-amber-600" :
                                                            host.overall_status === "red" ? "text-red-600" : "text-gray-500"
                                                )}>
                                                    {host.overall_status === "green" ? "Healthy" :
                                                        host.overall_status === "yellow" ? "Warning" :
                                                            host.overall_status === "red" ? "Critical" : "Unknown"}
                                                </span>
                                            </div>
                                            {host.boot_time && (
                                                <p className="text-[10px] text-[#999] flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Booted {" "}
                                                    {new Date(host.boot_time).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm text-[#3a3a3a]">
                                            <Activity className="h-3.5 w-3.5 text-[#1ca9b1]" />
                                            <span className="font-medium">{host.vm_count}</span>
                                            <span className="text-[#727373] text-xs">VMs</span>
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