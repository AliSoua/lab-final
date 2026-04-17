// src/pages/LabDefinition/ListLabDefinitionsPage.tsx
import { useState, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Layers, Zap } from "lucide-react"
import { useListLabs, usePublishLab, useFeatureLab } from "@/hooks/LabDefinition"
import { useAuth } from "@/hooks/useAuth"
import type { LabDefinition, LabDefinitionFilters } from "@/types/LabDefinition/ListLabs"
import { LabDefinitionFilters as FilterComponent, LabDefinitionTable, Pagination } from "@/components/LabDefinition/ListLabDefinitions"

import { toast } from "sonner"

const ITEMS_PER_PAGE = 10

const DEFAULT_FILTERS: LabDefinitionFilters = {
    category: "all",
    difficulty: "all",
    status: "all",
    searchQuery: "",
}

export default function ListLabDefinitionsPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [currentPage, setCurrentPage] = useState(1)
    const [filters, setFilters] = useState<LabDefinitionFilters>(DEFAULT_FILTERS)

    const apiParams = useMemo(() => ({
        skip: (currentPage - 1) * ITEMS_PER_PAGE,
        limit: ITEMS_PER_PAGE,
        category: filters.category === "all" ? undefined : filters.category,
        difficulty: filters.difficulty === "all" ? undefined : filters.difficulty,
        status: filters.status === "all" ? undefined : filters.status,
        search: filters.searchQuery || undefined,
    }), [currentPage, filters])

    const { labs, isLoading, error, refetch, totalCount = 0 } = useListLabs(apiParams)

    // Ensure we have valid numbers for pagination
    const validTotalCount = typeof totalCount === 'number' ? totalCount : 0
    const totalPages = Math.max(1, Math.ceil(validTotalCount / ITEMS_PER_PAGE))

    const handleFiltersChange = useCallback((newFilters: LabDefinitionFilters) => {
        setFilters(newFilters)
        setCurrentPage(1)
    }, [])

    const { publishLab, isLoading: isPublishing } = usePublishLab()
    const { featureLab, unfeatureLab, isLoading: isFeaturing } = useFeatureLab()

    const handlePublish = async (lab: LabDefinition) => {
        try {
            await publishLab(lab.id)
            toast.success(`"${lab.name}" has been published successfully`)
            refetch()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to publish lab")
        }
    }

    const handleFeature = async (lab: LabDefinition) => {
        try {
            await featureLab(lab.id, 0)
            toast.success(`"${lab.name}" is now featured`)
            refetch()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to feature lab")
        }
    }

    const handleUnfeature = async (lab: LabDefinition) => {
        try {
            await unfeatureLab(lab.id)
            toast.success(`"${lab.name}" is no longer featured`)
            refetch()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to unfeature lab")
        }
    }

    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page)
        window.scrollTo({ top: 0, behavior: "smooth" })
    }, [])

    const handleCreateSimple = () => navigate("/admin/lab-definitions/create-simple")
    const handleCreateFull = () => navigate("/admin/lab-definitions/create-full")
    const handleView = (lab: LabDefinition) => navigate(`/admin/lab-definitions/${lab.id}`)
    const handleEdit = (lab: LabDefinition) => navigate(`/admin/lab-definitions/${lab.id}/edit`)
    const handleDelete = async (lab: LabDefinition) => console.log("Delete lab:", lab.id)

    return (
        <div className="flex flex-col h-full bg-[#f9f9f9]">
            {/* Header Section */}
            <div className="bg-white border-b border-[#e8e8e8] px-6 py-5 shrink-0">
                <div className="flex items-center justify-between w-full px-4">
                    <div>
                        <h1 className="text-xl font-semibold text-[#3a3a3a]">
                            Lab Definitions
                        </h1>
                        <p className="text-sm text-[#727373] mt-0.5">
                            Manage and publish lab environments for trainees
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCreateFull}
                            disabled={isLoading}
                            className={cn(
                                "flex items-center gap-2 rounded-lg px-4 py-2",
                                "border border-[#d4d4d4] bg-white text-[#3a3a3a]",
                                "text-sm font-medium",
                                "hover:bg-[#f5f5f5] hover:border-[#c4c4c4]",
                                "transition-all duration-200",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            <Layers className="h-4 w-4 text-[#727373]" />
                            <span>Create Full Lab</span>
                        </button>

                        <button
                            onClick={handleCreateSimple}
                            disabled={isLoading}
                            className={cn(
                                "flex items-center gap-2 rounded-lg px-4 py-2",
                                "bg-[#1ca9b1] text-white text-sm font-medium",
                                "hover:bg-[#17959c] hover:shadow-md",
                                "transition-all duration-200",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            <Zap className="h-4 w-4" />
                            <span>Create Simple</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="bg-white border-b border-[#e8e8e8] px-6 py-4 shrink-0">
                <div className="w-full px-4">
                    <FilterComponent
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                        isLoading={isLoading}
                    />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="w-full px-4 space-y-4">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">{error}</p>
                            <button
                                onClick={() => refetch()}
                                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    <LabDefinitionTable
                        labs={labs}
                        isLoading={isLoading}
                        userRole={user?.role}
                        onView={handleView}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onPublish={handlePublish}
                        onFeature={handleFeature}
                        onUnfeature={handleUnfeature}
                    />

                    {/* Pagination - Always show if we have items */}
                    {!isLoading && validTotalCount > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={validTotalCount}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={handlePageChange}
                            isLoading={isLoading}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}