// src/components/LabDefinition/ListLabDefinitions/LabDefinitionActions.tsx
import {
    MoreHorizontal,
    Eye,
    Edit,
    Trash2,
    Upload,
    Star,
    StarOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { LabDefinition } from "@/types/LabDefinition/ListLabs"
import { LabStatus } from "@/types/LabDefinition/CreateFullLabDefinition"

interface LabDefinitionActionsProps {
    lab: LabDefinition
    userRole?: string
    onView: (lab: LabDefinition) => void
    onEdit: (lab: LabDefinition) => void
    onDelete: (lab: LabDefinition) => void
    onPublish?: (lab: LabDefinition) => void
    onFeature?: (lab: LabDefinition) => void
    onUnfeature?: (lab: LabDefinition) => void
}

export function LabDefinitionActions({
    lab,
    userRole = "trainee",
    onView,
    onEdit,
    onDelete,
    onPublish,
    onFeature,
    onUnfeature,
}: LabDefinitionActionsProps) {
    const isAdmin = userRole === "admin"
    const canPublish = lab.status === LabStatus.DRAFT && onPublish
    const isFeatured = lab.is_featured

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 border-slate-200">
                {/* View Action - Available to all */}
                <DropdownMenuItem
                    onClick={() => onView(lab)}
                    className="text-sm text-slate-700 focus:bg-sky-50 focus:text-sky-700 cursor-pointer"
                >
                    <Eye className="h-4 w-4 mr-2 text-sky-600" />
                    View Details
                </DropdownMenuItem>

                {/* Publish Action - Only for drafts */}
                {canPublish && (
                    <DropdownMenuItem
                        onClick={() => onPublish(lab)}
                        className="text-sm text-slate-700 focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer"
                    >
                        <Upload className="h-4 w-4 mr-2 text-emerald-600" />
                        Publish
                    </DropdownMenuItem>
                )}

                {/* Feature/Unfeature Actions - Admin only */}
                {isAdmin && lab.status === LabStatus.PUBLISHED && (
                    <>
                        {isFeatured ? (
                            <DropdownMenuItem
                                onClick={() => onUnfeature?.(lab)}
                                className="text-sm text-slate-700 focus:bg-amber-50 focus:text-amber-700 cursor-pointer"
                            >
                                <StarOff className="h-4 w-4 mr-2 text-amber-600" />
                                Unfeature
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem
                                onClick={() => onFeature?.(lab)}
                                className="text-sm text-slate-700 focus:bg-amber-50 focus:text-amber-700 cursor-pointer"
                            >
                                <Star className="h-4 w-4 mr-2 text-amber-600" />
                                Feature
                            </DropdownMenuItem>
                        )}
                    </>
                )}

                <DropdownMenuItem
                    onClick={() => onEdit(lab)}
                    className="text-sm text-slate-700 focus:bg-slate-50 focus:text-slate-900 cursor-pointer"
                >
                    <Edit className="h-4 w-4 mr-2 text-slate-600" />
                    Edit
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-slate-100" />

                {/* Delete Action */}
                <DropdownMenuItem
                    onClick={() => onDelete(lab)}
                    className="text-sm text-rose-600 focus:bg-rose-50 focus:text-rose-700 cursor-pointer"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}