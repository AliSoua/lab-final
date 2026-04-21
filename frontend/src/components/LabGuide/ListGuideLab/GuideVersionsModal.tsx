// src/components/LabGuide/ListGuideLab/GuideVersionsModal.tsx
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    GitBranch,
    Calendar,
    Layers,
    Play,
    CheckCircle2,
    Star,
    Trash2,
    X,
    Loader2,
} from "lucide-react"
import { useGuideVersions } from "@/hooks/LabGuide/useGuideVersions"
import type { LabGuideListItem, GuideVersionListItem } from "@/types/LabGuide"
import { toast } from "sonner"

interface GuideVersionsModalProps {
    guide: LabGuideListItem | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onAssignVersion: (guideId: string, versionId: string) => void
}

export function GuideVersionsModal({
    guide,
    open,
    onOpenChange,
    onAssignVersion,
}: GuideVersionsModalProps) {
    const {
        versions,
        version,
        isLoading,
        isSubmitting,
        fetchVersions,
        fetchVersion,
        publishVersion,
        setCurrentVersion,
        deleteVersion,
    } = useGuideVersions()

    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
    const [publishingId, setPublishingId] = useState<string | null>(null)
    const [settingCurrentId, setSettingCurrentId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        if (guide && open) {
            fetchVersions(guide.id)
            setSelectedVersionId(null)
        }
    }, [guide, open, fetchVersions])

    const handleViewVersion = async (versionId: string) => {
        if (!guide) return
        setSelectedVersionId(versionId)
        await fetchVersion(guide.id, versionId)
    }

    const handlePublish = async (versionId: string) => {
        if (!guide) return
        setPublishingId(versionId)
        try {
            await publishVersion(guide.id, versionId)
        } finally {
            setPublishingId(null)
        }
    }

    const handleSetCurrent = async (versionId: string) => {
        if (!guide) return
        setSettingCurrentId(versionId)
        try {
            await setCurrentVersion(guide.id, versionId)
            await fetchVersions(guide.id)
        } finally {
            setSettingCurrentId(null)
        }
    }

    const handleDelete = async (versionId: string) => {
        if (!guide) return
        if (!confirm("Delete this version? Labs using it will be affected.")) return

        setDeletingId(versionId)
        try {
            await deleteVersion(guide.id, versionId)
            if (selectedVersionId === versionId) {
                setSelectedVersionId(null)
            }
        } finally {
            setDeletingId(null)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    if (!guide) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b border-[#e8e8e8] shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#e6f7f8] flex items-center justify-center text-[#1ca9b1]">
                                <GitBranch className="h-4 w-4" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-semibold text-[#3a3a3a]">
                                    {guide.title}
                                </DialogTitle>
                                <p className="text-xs text-[#727373] mt-0.5">
                                    Version History & Management
                                </p>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex">
                    {/* Version List Sidebar */}
                    <div className="w-64 border-r border-[#e8e8e8] overflow-y-auto bg-[#f9f9f9]">
                        <div className="p-3">
                            <p className="text-[10px] font-semibold text-[#c4c4c4] uppercase tracking-wider px-2 mb-2">
                                Versions
                            </p>
                            {isLoading && versions.length === 0 ? (
                                <div className="space-y-2 px-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-12 bg-[#f0f0f0] rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {versions.map((v) => {
                                        const isCurrent = guide.current_version_id === v.id
                                        const isSelected = selectedVersionId === v.id

                                        return (
                                            <button
                                                key={v.id}
                                                onClick={() => handleViewVersion(v.id)}
                                                className={cn(
                                                    "w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150",
                                                    isSelected
                                                        ? "bg-white shadow-sm border border-[#e8e8e8]"
                                                        : "hover:bg-[#f0f0f0]",
                                                    isCurrent && "ring-1 ring-[#1ca9b1]/30"
                                                )}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-semibold text-[#3a3a3a]">
                                                        v{v.version_number}
                                                    </span>
                                                    {isCurrent && (
                                                        <Star className="h-3.5 w-3.5 text-[#1ca9b1] fill-[#1ca9b1]" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {v.is_published ? (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">
                                                            Published
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f5f5f5] text-[#727373] font-medium">
                                                            Draft
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-[#c4c4c4] flex items-center gap-0.5">
                                                        <Layers className="h-3 w-3" />
                                                        {v.step_count}
                                                    </span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Version Detail */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {!selectedVersionId ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <GitBranch className="h-10 w-10 text-[#e8e8e8] mb-3" />
                                <p className="text-sm text-[#727373]">
                                    Select a version to view details
                                </p>
                            </div>
                        ) : isLoading && !version ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="h-6 w-32 bg-[#f0f0f0] rounded" />
                                <div className="h-4 w-full bg-[#f0f0f0] rounded" />
                                <div className="h-4 w-3/4 bg-[#f0f0f0] rounded" />
                            </div>
                        ) : version ? (
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-semibold text-[#3a3a3a]">
                                                Version {version.version_number}
                                            </h3>
                                            {guide.current_version_id === version.id && (
                                                <Badge className="bg-[#e6f7f8] text-[#1ca9b1] hover:bg-[#e6f7f8] text-[10px]">
                                                    <Star className="h-3 w-3 mr-1 fill-[#1ca9b1]" />
                                                    Current
                                                </Badge>
                                            )}
                                            {version.is_published ? (
                                                <Badge className="bg-green-50 text-green-600 hover:bg-green-50 text-[10px]">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Published
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    Draft
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-[#727373] flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Created {formatDate(version.created_at)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {!version.is_published && (
                                            <Button
                                                size="sm"
                                                onClick={() => handlePublish(version.id)}
                                                disabled={isSubmitting && publishingId === version.id}
                                                className="bg-[#1ca9b1] hover:bg-[#17959c] text-white text-xs h-8"
                                            >
                                                {publishingId === version.id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                                ) : (
                                                    <Play className="h-3.5 w-3.5 mr-1" />
                                                )}
                                                Publish
                                            </Button>
                                        )}
                                        {version.is_published && guide.current_version_id !== version.id && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleSetCurrent(version.id)}
                                                disabled={isSubmitting && settingCurrentId === version.id}
                                                className="text-xs h-8 border-[#1ca9b1] text-[#1ca9b1] hover:bg-[#e6f7f8]"
                                            >
                                                {settingCurrentId === version.id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                                ) : (
                                                    <Star className="h-3.5 w-3.5 mr-1" />
                                                )}
                                                Set Current
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDelete(version.id)}
                                            disabled={isSubmitting && deletingId === version.id}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8"
                                        >
                                            {deletingId === version.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Steps Preview */}
                                <div>
                                    <h4 className="text-sm font-semibold text-[#3a3a3a] mb-3 flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-[#1ca9b1]" />
                                        Steps ({version.step_count})
                                    </h4>
                                    {version.steps && version.steps.length > 0 ? (
                                        <div className="space-y-2">
                                            {version.steps.map((step: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="p-3 bg-[#f9f9f9] rounded-lg border border-[#e8e8e8]"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-semibold text-[#1ca9b1] bg-[#e6f7f8] px-1.5 py-0.5 rounded">
                                                            #{step.order ?? idx + 1}
                                                        </span>
                                                        <span className="text-sm font-medium text-[#3a3a3a]">
                                                            {step.title}
                                                        </span>
                                                        <span className="text-[10px] text-[#c4c4c4] ml-auto">
                                                            {step.points} pts
                                                        </span>
                                                    </div>
                                                    {step.description && (
                                                        <p className="text-xs text-[#727373] line-clamp-2">
                                                            {step.description}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[#c4c4c4] italic">No steps in this version</p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="pt-4 border-t border-[#e8e8e8]">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onAssignVersion(guide.id, version.id)}
                                        className="text-xs h-8"
                                    >
                                        Assign to Lab
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}