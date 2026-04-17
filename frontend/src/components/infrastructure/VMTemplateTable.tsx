// src/components/infrastructure/VMTemplateTable.tsx
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
import { Cpu, HardDrive, MemoryStick, Server, Tag, Layers } from "lucide-react"
import type { VMTemplate } from "@/types/infrastructure"
import { VMTemplateActions } from "./VMTemplateActions"

interface VMTemplateTableProps {
    templates: VMTemplate[]
    isLoading: boolean
    onView: (template: VMTemplate) => void
    onEdit: (template: VMTemplate) => void
    onDelete: (template: VMTemplate) => void
    onProvision?: (template: VMTemplate) => void
}

const typeColors: Record<string, string> = {
    esxi: "bg-orange-100 text-orange-700 border-orange-200",
    vcenter: "bg-blue-100 text-blue-700 border-blue-200",
    linux: "bg-emerald-100 text-emerald-700 border-emerald-200",
    windows: "bg-sky-100 text-sky-700 border-sky-200",
    security: "bg-purple-100 text-purple-700 border-purple-200",
    other: "bg-slate-100 text-slate-700 border-slate-200",
}

const statusColors: Record<string, string> = {
    available: "bg-emerald-100 text-emerald-700 border-emerald-200",
    in_use: "bg-blue-100 text-blue-700 border-blue-200",
    maintenance: "bg-amber-100 text-amber-700 border-amber-200",
    deprecated: "bg-slate-100 text-slate-600 border-slate-200",
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
            <TableCell><div className="h-4 w-16 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-24 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-12 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-8 w-8 bg-[#f0f0f0] rounded" /></TableCell>
        </TableRow>
    )
}

export function VMTemplateTable({
    templates,
    isLoading,
    onView,
    onEdit,
    onDelete,
    onProvision,
}: VMTemplateTableProps) {
    if (!isLoading && templates.length === 0) {
        return (
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                        <Layers className="h-6 w-6 text-[#c4c4c4]" />
                    </div>
                    <h3 className="text-sm font-medium text-[#3a3a3a]">No templates found</h3>
                    <p className="text-xs text-[#727373] mt-1">Try adjusting your search or filters</p>
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
                                Template
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Type
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Resources
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                ESXi Host
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Status
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
                            templates.map((template, index) => (
                                <TableRow
                                    key={template.id}
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
                                                typeColors[template.type] || typeColors.other
                                            )}>
                                                <Server className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-[#3a3a3a] text-sm truncate">
                                                    {template.name}
                                                </p>
                                                <p className="text-xs text-[#727373] truncate">
                                                    {template.os_family} {template.os_version}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-xs font-medium border capitalize",
                                                typeColors[template.type] || typeColors.other
                                            )}
                                        >
                                            {template.type}
                                        </Badge>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-3 text-xs text-[#727373]">
                                            <span className="flex items-center gap-1">
                                                <Cpu className="h-3 w-3" />
                                                {template.cpu_cores}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MemoryStick className="h-3 w-3" />
                                                {template.memory_mb / 1024}GB
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <HardDrive className="h-3 w-3" />
                                                {template.disk_gb}GB
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <Tag className="h-3.5 w-3.5 text-[#c4c4c4]" />
                                            <span className="text-sm text-[#3a3a3a]">
                                                {template.esxi_host_name}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-xs font-medium border capitalize",
                                                statusColors[template.status]
                                            )}
                                        >
                                            {template.status.replace("_", " ")}
                                        </Badge>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <VMTemplateActions
                                            template={template}
                                            onView={onView}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            onProvision={onProvision}
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