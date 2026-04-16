// src/components/LabDefinition/ListLabDefinitions/LabDefinitionTable.tsx
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
    Layers,
    Clock,
    Tag,
    Signal,
    AlertCircle,
    Users,
    Calendar,
    type LucideIcon,
} from "lucide-react"
import type { LabDefinition } from "@/types/LabDefinition/ListLabs"
import { LabStatus, LabDifficulty } from "@/types/LabDefinition/CreateFullLabDefinition"
import { LabDefinitionActions } from "./LabDefinitionActions"

interface LabDefinitionTableProps {
    labs: LabDefinition[]
    isLoading: boolean
    userRole?: string
    onView: (lab: LabDefinition) => void
    onEdit: (lab: LabDefinition) => void
    onDelete: (lab: LabDefinition) => void
    onPublish?: (lab: LabDefinition) => void
    onFeature?: (lab: LabDefinition) => void
    onUnfeature?: (lab: LabDefinition) => void
}

interface StatusConfig {
    color: string
    dot: string
    icon: LucideIcon
    label: string
}

const statusConfig: Record<LabStatus, StatusConfig> = {
    [LabStatus.PUBLISHED]: {
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
        icon: Signal,
        label: "Published",
    },
    [LabStatus.DRAFT]: {
        color: "bg-amber-100 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
        icon: AlertCircle,
        label: "Draft",
    },
    [LabStatus.ARCHIVED]: {
        color: "bg-slate-100 text-slate-600 border-slate-200",
        dot: "bg-slate-400",
        icon: Layers,
        label: "Archived",
    },
}

const difficultyColors: Record<LabDifficulty, string> = {
    [LabDifficulty.BEGINNER]: "bg-sky-100 text-sky-700 border-sky-200",
    [LabDifficulty.INTERMEDIATE]: "bg-violet-100 text-violet-700 border-violet-200",
    [LabDifficulty.ADVANCED]: "bg-rose-100 text-rose-700 border-rose-200",
}

function formatDate(dateString: string | null): string {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })
}

function SkeletonRow() {
    return (
        <TableRow className="animate-pulse">
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-200" />
                    <div className="space-y-1.5">
                        <div className="h-4 w-32 bg-slate-200 rounded" />
                        <div className="h-3 w-24 bg-slate-200 rounded" />
                    </div>
                </div>
            </TableCell>
            <TableCell><div className="h-6 w-20 bg-slate-200 rounded-full" /></TableCell>
            <TableCell><div className="h-4 w-16 bg-slate-200 rounded" /></TableCell>
            <TableCell><div className="h-6 w-16 bg-slate-200 rounded-full" /></TableCell>
            <TableCell><div className="h-4 w-12 bg-slate-200 rounded" /></TableCell>
            <TableCell><div className="h-4 w-20 bg-slate-200 rounded" /></TableCell>
            <TableCell><div className="h-8 w-8 bg-slate-200 rounded" /></TableCell>
        </TableRow>
    )
}

export function LabDefinitionTable({
    labs,
    isLoading,
    userRole,
    onView,
    onEdit,
    onDelete,
    onPublish,
    onFeature,
    onUnfeature,
}: LabDefinitionTableProps) {
    if (!isLoading && labs.length === 0) {
        return (
            <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <Layers className="h-6 w-6 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-900">No lab definitions found</h3>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your search or filters</p>
                </div>
            </div>
        )
    }

    return (
        <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                            <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Lab Name
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Status
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Category
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Difficulty
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Capacity
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Created
                            </TableHead>
                            <TableHead className="w-[60px] text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">
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
                            labs.map((lab, index) => {
                                const status = statusConfig[lab.status]
                                const StatusIcon = status.icon

                                return (
                                    <TableRow
                                        key={lab.id}
                                        className={cn(
                                            "transition-colors",
                                            index % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                                            "hover:bg-slate-50/80"
                                        )}
                                    >
                                        {/* Lab Name Cell */}
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors shrink-0",
                                                    status.color
                                                )}>
                                                    <StatusIcon className={cn("h-4 w-4", status.dot.replace("bg-", "text-"))} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-slate-800 text-sm truncate">
                                                        {lab.name}
                                                    </p>
                                                    {lab.track && (
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            Track: {lab.track}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Status Cell */}
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-xs font-medium border",
                                                    status.color
                                                )}
                                            >
                                                <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5 shrink-0", status.dot)} />
                                                {status.label}
                                                {lab.is_featured && (
                                                    <span className="ml-1.5 text-amber-500">★</span>
                                                )}
                                            </Badge>
                                        </TableCell>

                                        {/* Category Cell */}
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="text-sm text-slate-600 capitalize">
                                                    {lab.category}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Difficulty Cell */}
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] font-medium border capitalize",
                                                    difficultyColors[lab.difficulty]
                                                )}
                                            >
                                                {lab.difficulty}
                                            </Badge>
                                        </TableCell>

                                        {/* Capacity Cell */}
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span>{lab.max_concurrent_users}</span>
                                                {lab.duration_minutes > 0 && (
                                                    <span className="text-slate-400 text-xs">
                                                        ({lab.duration_minutes}m)
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Created At Cell */}
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span>{formatDate(lab.created_at)}</span>
                                            </div>
                                        </TableCell>

                                        {/* Actions Cell - Using the new component */}
                                        <TableCell className="text-right">
                                            <LabDefinitionActions
                                                lab={lab}
                                                userRole={userRole}
                                                onView={onView}
                                                onEdit={onEdit}
                                                onDelete={onDelete}
                                                onPublish={onPublish}
                                                onFeature={onFeature}
                                                onUnfeature={onUnfeature}
                                            />
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Table Footer */}
            <div className="bg-slate-50/50 border-t border-slate-100 px-4 py-2 flex justify-between items-center">
                <span className="text-xs text-slate-500">
                    {isLoading ? "Loading..." : `Showing ${labs.length} lab${labs.length !== 1 ? "s" : ""}`}
                </span>
            </div>
        </div>
    )
}