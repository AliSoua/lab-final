// src/pages/LabInstance/Trainee/LabInstanceListPage.tsx
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTraineeLabInstance } from "@/hooks/LabInstance/Trainee/useTraineeLabInstance"
import type { MyLabInstance } from "@/types/LabInstance/Trainee/LabInstance"
import { StatusBadge } from "@/components/LabInstance/Trainee/InstanceList/StatusBadge"
import { EmptyState } from "@/components/LabInstance/Trainee/InstanceList/EmptyState"
import { SkeletonGrid } from "@/components/LabInstance/Trainee/InstanceList/SkeletonGrid"

export default function LabInstanceListPage() {
    const navigate = useNavigate()
    const { listMyInstances, isLoading, error, resetError } = useTraineeLabInstance()

    const [instances, setInstances] = useState<MyLabInstance[]>([])
    const [total, setTotal] = useState(0)

    const loadInstances = useCallback(async () => {
        resetError()
        try {
            const data = await listMyInstances(0, 100)
            setInstances(data.items)
            setTotal(data.total)
        } catch {
            // Error already toasted by the hook
        }
    }, [listMyInstances, resetError])

    useEffect(() => {
        loadInstances()
    }, [loadInstances])

    return (
        <div className="min-h-screen bg-[#fafafa]">
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-14">
                {/* Header */}
                <div className="mb-10">
                    <button
                        onClick={() => navigate("/")}
                        className={cn(
                            "mb-4 flex items-center gap-1.5 text-[13px] font-medium text-[#a0a0a0]",
                            "transition-colors duration-200 hover:text-[#1a1a1a]"
                        )}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Catalogue
                    </button>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                                Trainee Workspace
                            </p>
                            <h1 className="font-serif font-light text-2xl tracking-tight text-[#1a1a1a] lg:text-3xl">
                                My Lab Instances
                            </h1>
                        </div>

                        <button
                            onClick={loadInstances}
                            disabled={isLoading}
                            className={cn(
                                "flex h-10 items-center gap-2 rounded-lg border border-[#e8e8e8] bg-white px-4",
                                "text-[12px] font-medium text-[#727373]",
                                "hover:border-[#c4c4c4] hover:text-[#1a1a1a]",
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

                    <p className="mt-2 text-[13px] text-[#a0a0a0]">
                        <span className="font-semibold text-[#1a1a1a]">{total}</span>{" "}
                        {total === 1 ? "instance" : "instances"} total
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex flex-col items-center gap-4 rounded-xl border border-[#e8e8e8] bg-white py-16 text-center">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                            Error
                        </p>
                        <h2 className="font-serif font-light text-2xl text-[#1a1a1a]">
                            Failed to load instances
                        </h2>
                        <p className="max-w-md text-[13px] text-[#727373]">{error}</p>
                        <button
                            onClick={loadInstances}
                            className={cn(
                                "mt-2 flex h-10 items-center gap-2 rounded-lg border border-[#e8e8e8] px-5",
                                "text-[13px] font-medium text-[#727373]",
                                "hover:border-[#c4c4c4] hover:text-[#1a1a1a]",
                                "transition-all duration-200"
                            )}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try again
                        </button>
                    </div>
                )}

                {/* Loading */}
                {isLoading && !error && <SkeletonGrid count={6} />}

                {/* Empty */}
                {!isLoading && !error && instances.length === 0 && (
                    <EmptyState onBrowseLabs={() => navigate("/labs")} />
                )}

                {/* Grid */}
                {!isLoading && !error && instances.length > 0 && (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {instances.map((instance) => (
                            <button
                                key={instance.id}
                                onClick={() => navigate(`/lab-instances/${instance.id}/run`)}
                                className={cn(
                                    "group rounded-xl border border-[#e8e8e8] bg-white p-5 text-left",
                                    "transition-all duration-200 hover:border-[#c4c4c4]"
                                )}
                            >
                                {/* Header */}
                                <div className="mb-3">
                                    <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[#1ca9b1]">
                                        {instance.lab_definition.category?.replace("_", " ") ?? "Lab"}
                                    </p>
                                    <h3 className="text-[15px] font-semibold leading-snug text-[#1a1a1a] transition-colors duration-200 group-hover:text-[#1ca9b1]">
                                        {instance.lab_definition.name}
                                    </h3>
                                </div>

                                {/* Meta */}
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                    <span className="rounded-sm bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium text-[#a0a0a0]">
                                        {instance.lab_definition.difficulty ?? "N/A"}
                                    </span>
                                    <StatusBadge status={instance.status} />
                                </div>

                                {/* Progress */}
                                <div className="mb-4">
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <span className="text-[11px] text-[#a0a0a0]">Progress</span>
                                        <span className="text-[11px] font-medium text-[#1a1a1a]">
                                            Step {instance.current_step_index + 1}
                                        </span>
                                    </div>
                                    <div className="h-1 w-full rounded-full bg-[#f0f0f0]">
                                        <div
                                            className="h-full rounded-full bg-[#1ca9b1] transition-all duration-500"
                                            style={{ width: `${Math.min((instance.current_step_index / 10) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between border-t border-[#f0f0f0] pt-4">
                                    <span className="text-[11px] text-[#a0a0a0]">
                                        {instance.time_remaining_minutes
                                            ? `${instance.time_remaining_minutes} min left`
                                            : instance.duration_minutes
                                                ? `${instance.duration_minutes} min total`
                                                : "No limit"}
                                    </span>
                                    <span className="text-[11px] text-[#a0a0a0]">
                                        {instance.created_at
                                            ? new Date(instance.created_at).toLocaleDateString()
                                            : "—"}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}