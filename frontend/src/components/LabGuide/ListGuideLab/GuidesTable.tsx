// src/components/LabGuide/ListGuideLab/GuidesTable.tsx
import { cn } from "@/lib/utils"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { BookOpen, Layers, GitBranch, AlertCircle, Calendar } from "lucide-react"
import type { LabGuideListItem } from "@/types/LabGuide"
import { GuideActions } from "./GuideActions"

interface GuidesTableProps {
    guides: LabGuideListItem[]
    isLoading: boolean
    onPreview: (guide: LabGuideListItem) => void
    onDelete: (guide: LabGuideListItem) => void
    onViewVersions: (guide: LabGuideListItem) => void
    onCreateVersion: (guide: LabGuideListItem) => void
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
            <TableCell><div className="h-5 w-20 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-16 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-12 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-4 w-20 bg-[#f0f0f0] rounded" /></TableCell>
            <TableCell><div className="h-8 w-8 bg-[#f0f0f0] rounded" /></TableCell>
        </TableRow>
    )
}

function StatusBadge({ guide }: { guide: LabGuideListItem }) {
    const hasVersion = guide.current_version_id !== null
    const isPublished = guide.current_version_published === true

    if (!hasVersion) {
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md bg-amber-50 text-amber-700 font-semibold border border-amber-100">
                <AlertCircle className="h-3 w-3" />
                No Version
            </span>
        )
    }

    if (isPublished) {
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md bg-green-50 text-green-700 font-semibold border border-green-100">
                <GitBranch className="h-3 w-3" />
                Published
            </span>
        )
    }

    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md bg-[#f5f5f5] text-[#727373] font-semibold border border-[#e8e8e8]">
            <GitBranch className="h-3 w-3" />
            Draft
        </span>
    )
}

function VersionBadge({ guide }: { guide: LabGuideListItem }) {
    const hasVersion = guide.current_version_id !== null

    if (!hasVersion) {
        return <span className="text-sm text-[#c4c4c4]">—</span>
    }

    return (
        <div className="flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5 text-[#1ca9b1]" />
            <span className="text-sm font-medium text-[#3a3a3a]">
                v{guide.current_version_number}
            </span>
        </div>
    )
}

export function GuidesTable({
    guides,
    isLoading,
    onPreview,
    onDelete,
    onViewVersions,
    onCreateVersion,
}: GuidesTableProps) {
    if (!isLoading && guides.length === 0) {
        return (
            <div className="border border-[#e8e8e8] rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="h-6 w-6 text-[#c4c4c4]" />
                    </div>
                    <h3 className="text-sm font-medium text-[#3a3a3a]">No guides created</h3>
                    <p className="text-xs text-[#727373] mt-1">
                        Create your first interactive lab guide
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
                            <TableHead className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                                Guide
                            </TableHead>
                            <TableHead className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                                Status
                            </TableHead>
                            <TableHead className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                                Current Version
                            </TableHead>
                            <TableHead className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                                Steps
                            </TableHead>
                            <TableHead className="text-[11px] font-semibold text-[#727373] uppercase tracking-wider">
                                Created
                            </TableHead>
                            <TableHead className="w-[60px] text-[11px] font-semibold text-[#727373] uppercase tracking-wider text-right">
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
                            guides.map((guide, index) => (
                                <TableRow
                                    key={guide.id}
                                    className={cn(
                                        "transition-colors",
                                        index % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]/50",
                                        "hover:bg-[#f5f5f5]"
                                    )}
                                >
                                    {/* Title */}
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                guide.current_version_id
                                                    ? "bg-[#e6f7f8] text-[#1ca9b1]"
                                                    : "bg-[#f5f5f5] text-[#c4c4c4]"
                                            )}>
                                                <BookOpen className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-[#3a3a3a] text-sm truncate">
                                                    {guide.title}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <StatusBadge guide={guide} />
                                    </TableCell>

                                    {/* Current Version */}
                                    <TableCell>
                                        <VersionBadge guide={guide} />
                                    </TableCell>

                                    {/* Steps */}
                                    <TableCell>
                                        {guide.current_version_id ? (
                                            <div className="flex items-center gap-1.5">
                                                <Layers className="h-3.5 w-3.5 text-[#c4c4c4]" />
                                                <span className="text-sm text-[#3a3a3a]">
                                                    {guide.step_count}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-[#c4c4c4]">—</span>
                                        )}
                                    </TableCell>

                                    {/* Created */}
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-sm text-[#727373]">
                                            <Calendar className="h-3.5 w-3.5 text-[#c4c4c4]" />
                                            <span>
                                                {new Date(guide.created_at).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="text-right">
                                        <GuideActions
                                            guide={guide}
                                            onPreview={onPreview}
                                            onDelete={onDelete}
                                            onViewVersions={onViewVersions}
                                            onCreateVersion={onCreateVersion}
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