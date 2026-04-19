// src/components/credentials/admin/CredentialsTable.tsx
import { cn } from "@/lib/utils"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Server, User, Shield, Layers } from "lucide-react"
import type { VCenterInfo } from "@/types/credentials/admin"
import { VCenterActions } from "./VCenterActions"

interface CredentialsTableProps {
    VCenters: VCenterInfo[]
    isLoading: boolean
    onEdit: (vcenter: VCenterInfo) => void
    onDelete: (vcenter: VCenterInfo) => void
}

function SkeletonRow() {
    return (
        <TableRow className="animate-pulse">
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#f0f0f0]" />
                    <div className="space-y-1.5">
                        <div className="h-4 w-40 bg-[#f0f0f0] rounded" />
                    </div>
                </div>
            </TableCell>
            <TableCell><div className="h-4 w-24 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-8 w-8 bg-[#f0f0f0] rounded" /></TableCell>
        </TableRow>
    )
}

export function CredentialsTable({
    VCenters,
    isLoading,
    onEdit,
    onDelete,
}: CredentialsTableProps) {
    if (!isLoading && VCenters.length === 0) {
        return (
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-6 w-6 text-[#c4c4c4]" />
                    </div>
                    <h3 className="text-sm font-medium text-[#3a3a3a]">No stored credentials</h3>
                    <p className="text-xs text-[#727373] mt-1">Add a vCenter Server to store credentials securely in Vault</p>
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
                                vCenter Host
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-[#727373] uppercase tracking-wider">
                                Username
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
                            VCenters.map((vcenter, index) => (
                                <TableRow
                                    key={vcenter.vcenter_host}
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
                                                    {vcenter.vcenter_host}
                                                </p>
                                                <p className="text-[11px] text-[#727373]">
                                                    Stored in Vault
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5 text-[#c4c4c4]" />
                                            <span className="text-sm text-[#3a3a3a] font-mono">
                                                {vcenter.username}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <VCenterActions
                                            vcenter={vcenter}
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