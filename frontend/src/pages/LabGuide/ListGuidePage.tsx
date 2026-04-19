import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { BookOpen, Plus, Shield } from "lucide-react"
import { useLabGuides } from "@/hooks/LabGuide/useLabGuides"
import { GuidesTable } from "@/components/LabGuide/ListGuideLab/GuidesTable"
import type { LabGuideListItem } from "@/types/LabGuide"
import { toast } from "sonner"

export default function ListGuidePage() {
    const navigate = useNavigate()
    const { guides, isLoading, refetch, deleteGuide } = useLabGuides()
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const handleAdd = () => {
        navigate("/admin/lab-guides/create")
    }

    const handlePreview = (guide: LabGuideListItem) => {
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
                            Manage interactive step-by-step lab guides
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
                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-4 bg-[#e6f7f8] border border-[#1ca9b1]/20 rounded-lg">
                        <Shield className="h-5 w-5 text-[#1ca9b1] shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-[#3a3a3a]">Standalone Guides</p>
                            <p className="text-xs text-[#727373] mt-0.5">
                                Guides are created independently and assigned to lab definitions. Changes here affect all linked labs.
                            </p>
                        </div>
                    </div>

                    <GuidesTable
                        guides={guides}
                        isLoading={isLoading}
                        onPreview={handlePreview}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
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
                                    This will permanently delete the guide and all its steps. Labs using this guide will lose their content.
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
        </div>
    )
}