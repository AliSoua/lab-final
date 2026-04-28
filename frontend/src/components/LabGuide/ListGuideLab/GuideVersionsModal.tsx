// src/components/LabGuide/ListGuideLab/GuideVersionsModal.tsx
import { useState, useEffect, useMemo } from "react"
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
    Loader2,
    Terminal,
    ShieldCheck,
    ListChecks,
    HelpCircle,
    Trophy,
    ArrowRight,
} from "lucide-react"
import { useGuideVersions } from "@/hooks/LabGuide/useGuideVersions"
import type { LabGuideListItem } from "@/types/LabGuide"

interface GuideVersionsModalProps {
    guide: LabGuideListItem | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onAssignVersion: (guideId: string, versionId: string) => void
    onCurrentVersionChanged?: () => void
}

export function GuideVersionsModal({
    guide,
    open,
    onOpenChange,
    onAssignVersion,
    onCurrentVersionChanged,
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
    const [localCurrentVersionId, setLocalCurrentVersionId] = useState<string | null>(null)

    const [publishingId, setPublishingId] = useState<string | null>(null)
    const [settingCurrentId, setSettingCurrentId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        if (!open) {
            setSelectedVersionId(null)
            setLocalCurrentVersionId(null)
            return
        }

        if (guide) {
            setLocalCurrentVersionId(guide.current_version_id)
            fetchVersions(guide.id)

            if (guide.current_version_id) {
                setSelectedVersionId(guide.current_version_id)
                fetchVersion(guide.id, guide.current_version_id)
            } else {
                setSelectedVersionId(null)
            }
        }
    }, [guide, open, fetchVersions, fetchVersion])

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
            setLocalCurrentVersionId(versionId)
            await fetchVersions(guide.id)
            onCurrentVersionChanged?.()
            if (selectedVersionId === versionId) {
                await fetchVersion(guide.id, versionId)
            }
        } finally {
            setPublishingId(null)
        }
    }

    const handleSetCurrent = async (versionId: string) => {
        if (!guide) return
        setSettingCurrentId(versionId)
        try {
            await setCurrentVersion(guide.id, versionId)
            setLocalCurrentVersionId(versionId)
            await fetchVersions(guide.id)
            onCurrentVersionChanged?.()
            if (selectedVersionId === versionId) {
                await fetchVersion(guide.id, versionId)
            }
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
            onCurrentVersionChanged?.()
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

    const formatRelative = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime()
        const days = Math.floor(diff / 86400000)
        if (days === 0) return "Today"
        if (days === 1) return "Yesterday"
        if (days < 7) return `${days}d ago`
        if (days < 30) return `${Math.floor(days / 7)}w ago`
        return `${Math.floor(days / 30)}mo ago`
    }

    const stepTotals = useMemo(() => {
        if (!version?.steps) return null
        const steps = version.steps
        return {
            steps: steps.length,
            commands: steps.reduce((s, x) => s + (x.commands?.length || 0), 0),
            tasks: steps.reduce((s, x) => s + (x.tasks?.length || 0), 0),
            validations: steps.reduce((s, x) => s + (x.validations?.length || 0), 0),
            quizzes: steps.filter((x) => x.quiz).length,
            points: steps.reduce((s, x) => s + (x.points || 0), 0),
        }
    }, [version])

    if (!guide) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                aria-describedby={undefined}
                className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0"
            >
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
                                    {versions.length} version{versions.length !== 1 ? "s" : ""} • Version history & management
                                </p>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex">
                    {/* Sidebar */}
                    <div className="w-64 border-r border-[#e8e8e8] overflow-y-auto bg-[#f9f9f9]">
                        <div className="p-3">
                            <p className="text-[10px] font-semibold text-[#c4c4c4] uppercase tracking-wider px-2 mb-2">
                                Versions
                            </p>

                            {isLoading && versions.length === 0 ? (
                                <div className="space-y-2 px-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-14 bg-[#f0f0f0] rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : versions.length === 0 ? (
                                <div className="px-2 py-6 text-center">
                                    <GitBranch className="h-6 w-6 text-[#e8e8e8] mx-auto mb-2" />
                                    <p className="text-xs text-[#c4c4c4]">No versions yet</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {versions.map((v) => {
                                        const isCurrent = localCurrentVersionId === v.id
                                        const isSelected = selectedVersionId === v.id

                                        return (
                                            <button
                                                key={v.id}
                                                onClick={() => handleViewVersion(v.id)}
                                                className={cn(
                                                    "w-full text-left rounded-lg transition-all duration-150 border",
                                                    isSelected
                                                        ? "bg-white border-[#e8e8e8] shadow-sm"
                                                        : "border-transparent hover:bg-[#f0f0f0]",
                                                    isCurrent && !isSelected && "ring-1 ring-[#1ca9b1]/20"
                                                )}
                                            >
                                                <div className={cn(
                                                    "px-3 py-2.5",
                                                    isCurrent && "border-l-2 border-l-[#1ca9b1]"
                                                )}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-semibold text-[#3a3a3a]">
                                                            v{v.version_number}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            {isCurrent && (
                                                                <span className="text-[10px] font-semibold text-[#1ca9b1] bg-[#e6f7f8] px-1.5 py-0.5 rounded">
                                                                    CURRENT
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
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
                                                        <span className="text-[10px] text-[#c4c4c4]">
                                                            {formatRelative(v.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detail */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white">
                        {!selectedVersionId ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-14 h-14 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-3">
                                    <GitBranch className="h-7 w-7 text-[#c4c4c4]" />
                                </div>
                                <p className="text-sm font-medium text-[#3a3a3a]">Select a version</p>
                                <p className="text-xs text-[#727373] mt-0.5 max-w-[200px]">
                                    Choose a version from the sidebar to view details, publish, or manage it.
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
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <h3 className="text-lg font-semibold text-[#3a3a3a]">
                                                Version {version.version_number}
                                            </h3>
                                            {localCurrentVersionId === version.id && (
                                                <Badge className="bg-[#e6f7f8] text-[#1ca9b1] hover:bg-[#e6f7f8] text-[10px] font-semibold">
                                                    <Star className="h-3 w-3 mr-1 fill-[#1ca9b1]" />
                                                    Current
                                                </Badge>
                                            )}
                                            {version.is_published ? (
                                                <Badge className="bg-green-50 text-green-600 hover:bg-green-50 text-[10px] font-semibold">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Published
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px] font-semibold">
                                                    Draft
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-[#727373] flex items-center gap-1.5">
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
                                        {version.is_published && localCurrentVersionId !== version.id && (
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

                                {/* Stats Bar */}
                                {stepTotals && (
                                    <div className="grid grid-cols-6 gap-2">
                                        <div className="bg-[#f9f9f9] border border-[#e8e8e8] rounded-lg p-2.5 text-center">
                                            <Layers className="h-3.5 w-3.5 text-[#1ca9b1] mx-auto mb-1" />
                                            <p className="text-sm font-semibold text-[#3a3a3a]">{stepTotals.steps}</p>
                                            <p className="text-[10px] text-[#727373]">Steps</p>
                                        </div>
                                        <div className="bg-[#f9f9f9] border border-[#e8e8e8] rounded-lg p-2.5 text-center">
                                            <Terminal className="h-3.5 w-3.5 text-[#1ca9b1] mx-auto mb-1" />
                                            <p className="text-sm font-semibold text-[#3a3a3a]">{stepTotals.commands}</p>
                                            <p className="text-[10px] text-[#727373]">Commands</p>
                                        </div>
                                        <div className="bg-[#f9f9f9] border border-[#e8e8e8] rounded-lg p-2.5 text-center">
                                            <ListChecks className="h-3.5 w-3.5 text-amber-500 mx-auto mb-1" />
                                            <p className="text-sm font-semibold text-[#3a3a3a]">{stepTotals.tasks}</p>
                                            <p className="text-[10px] text-[#727373]">Tasks</p>
                                        </div>
                                        <div className="bg-[#f9f9f9] border border-[#e8e8e8] rounded-lg p-2.5 text-center">
                                            <ShieldCheck className="h-3.5 w-3.5 text-green-600 mx-auto mb-1" />
                                            <p className="text-sm font-semibold text-[#3a3a3a]">{stepTotals.validations}</p>
                                            <p className="text-[10px] text-[#727373]">Checks</p>
                                        </div>
                                        <div className="bg-[#f9f9f9] border border-[#e8e8e8] rounded-lg p-2.5 text-center">
                                            <HelpCircle className="h-3.5 w-3.5 text-purple-500 mx-auto mb-1" />
                                            <p className="text-sm font-semibold text-[#3a3a3a]">{stepTotals.quizzes}</p>
                                            <p className="text-[10px] text-[#727373]">Quizzes</p>
                                        </div>
                                        <div className="bg-[#f9f9f9] border border-[#e8e8e8] rounded-lg p-2.5 text-center">
                                            <Trophy className="h-3.5 w-3.5 text-[#1ca9b1] mx-auto mb-1" />
                                            <p className="text-sm font-semibold text-[#3a3a3a]">{stepTotals.points}</p>
                                            <p className="text-[10px] text-[#727373]">Points</p>
                                        </div>
                                    </div>
                                )}

                                {/* Steps */}
                                <div>
                                    <h4 className="text-sm font-semibold text-[#3a3a3a] mb-3 flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-[#1ca9b1]" />
                                        Steps
                                    </h4>

                                    {version.steps && version.steps.length > 0 ? (
                                        <div className="space-y-2.5">
                                            {version.steps.map((step: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="group p-3.5 bg-[#f9f9f9] rounded-xl border border-[#e8e8e8] hover:border-[#1ca9b1]/30 transition-colors"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#e6f7f8] text-[#1ca9b1] text-xs font-bold">
                                                            {step.order ?? idx + 1}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-sm font-medium text-[#3a3a3a]">
                                                                    {step.title}
                                                                </span>
                                                                <span className="text-[10px] text-[#c4c4c4] font-medium ml-auto">
                                                                    {step.points || 0} pts
                                                                </span>
                                                            </div>
                                                            {step.description && (
                                                                <p className="text-xs text-[#727373] line-clamp-2 mb-2">
                                                                    {step.description}
                                                                </p>
                                                            )}

                                                            {/* Content chips */}
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {step.theory_content && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#e8e8e8] text-[#727373]">
                                                                        Theory
                                                                    </span>
                                                                )}
                                                                {step.commands?.length > 0 && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e6f7f8] text-[#1ca9b1] font-medium">
                                                                        {step.commands.length} Cmd
                                                                    </span>
                                                                )}
                                                                {step.tasks?.length > 0 && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-medium">
                                                                        {step.tasks.length} Task
                                                                    </span>
                                                                )}
                                                                {step.validations?.length > 0 && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">
                                                                        {step.validations.length} Check
                                                                    </span>
                                                                )}
                                                                {step.quiz && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium">
                                                                        Quiz
                                                                    </span>
                                                                )}
                                                                {step.hints?.length > 0 && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#e8e8e8] text-[#c4c4c4]">
                                                                        {step.hints.length} Hint
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-[#f9f9f9] rounded-xl border border-dashed border-[#e8e8e8]">
                                            <Layers className="h-6 w-6 text-[#e8e8e8] mx-auto mb-2" />
                                            <p className="text-sm text-[#c4c4c4]">No steps in this version</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Actions */}
                                <div className="pt-4 border-t border-[#e8e8e8] flex items-center justify-between">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onAssignVersion(guide.id, version.id)}
                                        className="text-xs h-8"
                                    >
                                        Assign to Lab
                                        <ArrowRight className="h-3 w-3 ml-1.5" />
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