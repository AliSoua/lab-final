// src/components/LabDefinition/LabConnection/LabConnectionTable.tsx
import { cn } from "@/lib/utils"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Plug, Shield } from "lucide-react"
import type { LabConnectionListItem } from "@/types/LabDefinition/LabConnection"
import { LabConnectionActions } from "./LabConnectionActions"

interface LabConnectionTableProps {
    connections: LabConnectionListItem[]
    isLoading: boolean
    onEdit: (connection: LabConnectionListItem) => void
    onDelete: (connection: LabConnectionListItem) => void
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
            <TableCell><div className="h-4 w-16 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-12 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-8 w-8 bg-[#f0f0f0] rounded" /></TableCell>
        </TableRow>
    )
}

export function LabConnectionTable({
    connections,
    isLoading,
    onEdit,
    onDelete,
}: LabConnectionTableProps) {
    if (!isLoading && connections.length === 0) {
        return (
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                        <Plug className="h-6 w-6 text-[#c4c4c4]" />
                    </div>
                    <h3 className="text-sm font-medium text-[#3a3a3a]">No connections</h3>
                    <p className="text-xs text-[#727373] mt-1">
                        Add a transport connection to store credentials securely in Vault
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
                                Connection
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Protocol
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Port
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
                            connections.map((connection, index) => (
                                <TableRow
                                    key={connection.id}
                                    className={cn(
                                        "transition-colors",
                                        index % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]/50",
                                        "hover:bg-[#f5f5f5]"
                                    )}
                                >
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#e6f7f8] flex items-center justify-center text-[#1ca9b1] shrink-0">
                                                <Plug className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-[#3a3a3a] text-sm truncate">
                                                    {connection.slug}
                                                </p>
                                                <p className="text-[11px] text-[#727373] truncate">
                                                    {connection.title}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wide",
                                            connection.protocol === "ssh" && "bg-emerald-50 text-emerald-700",
                                            connection.protocol === "rdp" && "bg-blue-50 text-blue-700",
                                            connection.protocol === "vnc" && "bg-purple-50 text-purple-700",
                                        )}>
                                            {connection.protocol}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <span className="text-sm text-[#3a3a3a] font-mono">
                                            {connection.port}
                                        </span>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <LabConnectionActions
                                            connection={connection}
                                            onEdit={onEdit}
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