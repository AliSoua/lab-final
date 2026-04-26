import { useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
    ArrowLeft,
    FlaskConical,
    RefreshCw,
    AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useListLabInstances } from "@/hooks/LabInstance/useListLabInstances"
import {
    LabInstanceCard,
    SkeletonGrid,
    EmptyState,
} from "@/components/LabInstance/list"

export default function LabInstanceListPage() {
    const navigate = useNavigate()
    const { instances, isLoading, error, fetchInstances } = useListLabInstances()

    const loadInstances = useCallback(() => {
        fetchInstances(0, 100)
    }, [fetchInstances])

    useEffect(() => {
        loadInstances()
    }, [loadInstances])

    return (
        <div className="min-h-screen bg-[#fafafa]">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <button
                            onClick={() => navigate("/")}
                            className={cn(
                                "mb-3 flex items-center gap-1.5 text-[13px] font-medium text-[#727373]",
                                "hover:text-[#1ca9b1] transition-colors"
                            )}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Catalogue
                        </button>
                        <div className="flex items-center gap-3">
                            <FlaskConical className="h-6 w-6 text-[#1ca9b1]" />
                            <h1 className="text-[22px] font-bold text-[#3a3a3a]">
                                My Lab Instances
                            </h1>
                        </div>
                        <p className="mt-1 text-[13px] text-[#727373]">
                            {instances.length}{" "}
                            {instances.length === 1 ? "instance" : "instances"} total
                        </p>
                    </div>

                    <button
                        onClick={loadInstances}
                        disabled={isLoading}
                        className={cn(
                            "flex items-center gap-2 rounded-lg border border-[#e8e8e8] bg-white px-4 py-2",
                            "text-[13px] font-medium text-[#3a3a3a]",
                            "hover:border-[#1ca9b1] hover:text-[#1ca9b1]",
                            "transition-all duration-200 disabled:opacity-50"
                        )}
                    >
                        {isLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        Refresh
                    </button>
                </div>

                {/* Error State */}
                {error && (
                    <div className="mb-6 flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-[16px] font-semibold text-red-900">
                                Failed to load instances
                            </h3>
                            <p className="mt-1 text-[13px] text-red-700">{error}</p>
                        </div>
                        <button
                            onClick={loadInstances}
                            className={cn(
                                "flex items-center gap-2 rounded-lg bg-white px-4 py-2",
                                "text-[13px] font-medium text-red-700",
                                "border border-red-200 hover:bg-red-100",
                                "transition-all duration-200"
                            )}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try again
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && !error && <SkeletonGrid count={6} />}

                {/* Empty State */}
                {!isLoading && !error && instances.length === 0 && (
                    <EmptyState onBrowseLabs={() => navigate("/labs")} />
                )}

                {/* Instances Grid */}
                {!isLoading && !error && instances.length > 0 && (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {instances.map((instance) => (
                            <LabInstanceCard key={instance.id} instance={instance} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}