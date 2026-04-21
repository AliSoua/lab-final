// src/pages/LabGuide/ListGuidePage.tsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { BookOpen, Plus, Shield, GitBranch } from "lucide-react"
import { useLabGuides } from "@/hooks/LabGuide/useLabGuides"
import { useGuideVersions } from "@/hooks/LabGuide/useGuideVersions"
import { GuidesTable } from "@/components/LabGuide/ListGuideLab/GuidesTable"
import { GuideVersionsModal } from "@/components/LabGuide/ListGuideLab/GuideVersionsModal"
import { CreateVersionModal } from "@/components/LabGuide/ListGuideLab/CreateVersionModal"
import type { LabGuideListItem } from "@/types/LabGuide"
import { toast } from "sonner"

export default function ListGuidePage() {
    const navigate = useNavigate()
    const { guides, isLoading, refetch, deleteGuide, assignGuideVersion } = useLabGuides()
    const { createVersion } = useGuideVersions()

    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [versionsModalGuide, setVersionsModalGuide] = useState<LabGuideListItem | null>(null)
    const [createVersionGuide, setCreateVersionGuide] = useState<LabGuideListItem | null>(null)
    const [isCreatingVersion, setIsCreatingVersion] = useState(false)

    const handleAdd = () => {
        navigate("/admin/lab-guides/create")
    }

    const handlePreview = (guide: LabGuideListItem) => {
        if (!guide.current_version_id) {
            toast.error("No version available to preview")
            return
        }
        navigate(`/admin/lab-guides/${guide.id}/preview`)
    }

    const handleEdit = (guide: LabGuideListItem) => {
        navigate(`/admin/lab-guides/${guide.id}/edit`)
    }

    const handleDelete = (guide: LabGuideListItem) => {
        setDeleteConfirm(guide.id)
    }

    const confirmDelete = async (guideId: string) => {
        try {
            await deleteGuide(guideId)
            setDeleteConfirm(null)
        } catch {
            // Error handled by hook
        }
    }

    const handleViewVersions = (guide: LabGuideListItem) => {
        setVersionsModalGuide(guide)
    }

    const handleCreateVersion = (guide: LabGuideListItem) => {
        setCreateVersionGuide(guide)
    }

    const handleCreateVersionSubmit = async (
        guideId: string,
        data: { steps: any[]; is_published: boolean }
    ) => {
        setIsCreatingVersion(true)
        try {
            await createVersion(guideId, data)
            toast.success("Version created successfully")
            refetch()
        } catch (err) {
            // Error handled by hook
        } finally {
            setIsCreatingVersion(false)
        }
    }

    const handleAssignVersion = (guideId: string, versionId: string) => {
        // You'd typically navigate to a lab selection or open another modal
        toast.info(`Ready to assign version ${versionId} to a lab`)
    }

    const publishedCount = guides.filter((g) => g.current_version_published).length
    const draftCount = guides.filter((g) => g.current_version_id && !g.current_version_published).length
    const noVersionCount = guides.filter((g) => !g.current_version_id).length

    return (
        <div className="flex flex-col h-full bg-[#f9f9f9]">
            {/* Header */}
            <div className="bg-white border-b border-[#e8e8e8] px-6 py-5 shrink-0">
                <div className="flex items-center justify-between w-full px-4">
                    <div>
                        <h1 className="text-xl font-semibold text-[#3a3a3a]">
                            Lab Guides
                        </h1>
                        <p className="text-sm text-[#727373] mt-0.5">
                            Manage versioned interactive lab guides
                        </p>
                    </div>

                    <button
                        onClick={handleAdd}
                        className={cn(
                            "flex items-center gap-2 rounded-lg px-4 py-2",
                            "bg-[#1ca9b1] text-white text-sm font-medium",
                            "hover:bg-[#17959c] hover:shadow-md",
                            "transition-all duration-200"
                        )}
                    >
                        <Plus className="h-4 w-4" />
                        <span>Create Guide</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="w-full px-4 space-y-4">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white border border-[#e8e8e8] rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded bg-green-50 flex items-center justify-center">
                                    <GitBranch className="h-3.5 w-3.5 text-green-600" />
                                </div>
                                <span className="text-xs text-[#727373]">Published</span>
                            </div>
                            <p className="text-xl font-semibold text-[#3a3a3a]">{publishedCount}</p>
                        </div>
                        <div className="bg-white border border-[#e8e8e8] rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded bg-[#f5f5f5] flex items-center justify-center">
                                    <GitBranch className="h-3.5 w-3.5 text-[#727373]" />
                                </div>
                                <span className="text-xs text-[#727373]">Draft Versions</span>
                            </div>
                            <p className="text-xl font-semibold text-[#3a3a3a]">{draftCount}</p>
                        </div>
                        <div className="bg-white border border-[#e8e8e8] rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded bg-amber-50 flex items-center justify-center">
                                    <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                                </div>
                                <span className="text-xs text-[#727373]">No Version</span>
                            </div>
                            <p className="text-xl font-semibold text-[#3a3a3a]">{noVersionCount}</p>
                        </div>
                    </div>

                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-4 bg-[#e6f7f8] border border-[#1ca9b1]/20 rounded-lg">
                        <Shield className="h-5 w-5 text-[#1ca9b1] shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-[#3a3a3a]">Versioned Guides</p>
                            <p className="text-xs text-[#727373] mt-0.5">
                                Guides now use immutable versions. Create a guide, then add versions with steps.
                                Publish a version to make it assignable to labs. Only published versions can be linked to lab definitions.
                            </p>
                        </div>
                    </div>

                    <GuidesTable
                        guides={guides}
                        isLoading={isLoading}
                        onPreview={handlePreview}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onViewVersions={handleViewVersions}
                        onCreateVersion={handleCreateVersion}
                    />

                    {/* Delete confirmation inline */}
                    {deleteConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <div
                                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                onClick={() => setDeleteConfirm(null)}
                            />
                            <div className="relative bg-white rounded-xl border border-[#e8e8e8] shadow-xl p-6 w-full max-w-sm mx-4">
                                <h3 className="text-[15px] font-semibold text-[#3a3a3a] mb-2">
                                    Delete Guide?
                                </h3>
                                <p className="text-sm text-[#727373] mb-6">
                                    This will permanently delete the guide and <strong>all its versions</strong>.
                                    Labs using any version of this guide will lose their content.
                                </p>
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-[#727373] hover:bg-[#f5f5f5]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => confirmDelete(deleteConfirm)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <GuideVersionsModal
                guide={versionsModalGuide}
                open={!!versionsModalGuide}
                onOpenChange={(open) => !open && setVersionsModalGuide(null)}
                onAssignVersion={handleAssignVersion}
            />

            <CreateVersionModal
                guide={createVersionGuide}
                open={!!createVersionGuide}
                onOpenChange={(open) => !open && setCreateVersionGuide(null)}
                onCreateVersion={handleCreateVersionSubmit}
                isSubmitting={isCreatingVersion}
            />
        </div>
    )
}