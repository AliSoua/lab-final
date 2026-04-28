// src/pages/LabInstance/Trainee/LabInstanceDetailPage.tsx
import { useEffect, useCallback, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, RefreshCw, Loader2, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTraineeLabInstance } from "@/hooks/LabInstance/Trainee/useTraineeLabInstance"
import type { MyLabInstance, MyLabInstanceListResponse, } from "@/types/LabInstance/Trainee/LabInstance"
import { StatusBadge } from "@/components/LabInstance/Trainee/InstanceDetail/StatusBadge"
import { InstanceSkeleton } from "@/components/LabInstance/Trainee/InstanceDetail/InstanceSkeleton"
import { InstanceError } from "@/components/LabInstance/Trainee/InstanceDetail/InstanceError"
import { InstanceNotFound } from "@/components/LabInstance/Trainee/InstanceDetail/InstanceNotFound"

export default function LabInstanceDetailPage() {
    const { instanceId } = useParams<{ instanceId: string }>()
    const navigate = useNavigate()

    const { getMyInstance, isLoading, error, resetError } = useTraineeLabInstance()

    const [instance, setInstance] = useState<MyLabInstance | null>(null)
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

    const fetchInstance = useCallback(async () => {
        if (!instanceId) return
        try {
            const data = await getMyInstance(instanceId)
            setInstance(data)
            setLastRefreshed(new Date())
        } catch {
            // Error handled by hook
        }
    }, [instanceId, getMyInstance])

    useEffect(() => {
        fetchInstance()
    }, [fetchInstance])

    // Auto-refresh every 30s while active
    useEffect(() => {
        if (!instance) return
        if (["terminated", "stopped", "failed"].includes(instance.status)) return

        const interval = setInterval(() => {
            fetchInstance()
        }, 30000)

        return () => clearInterval(interval)
    }, [instance, fetchInstance])

    const handleRefresh = async () => {
        await fetchInstance()
    }

    const handleEnterLab = () => {
        if (instanceId) {
            navigate(`/lab-instances/${instanceId}/run`)
        }
    }

    if (isLoading && !instance) {
        return <InstanceSkeleton />
    }

    if (error?.includes("not found") || error?.includes("Instance not found")) {
        return <InstanceNotFound />
    }

    if (error || !instance) {
        return <InstanceError error={error} onRetry={fetchInstance} />
    }

    const isRunning = instance.status === "running"
    const isProvisioning = instance.status === "provisioning"

    return (
        <div className="min-h-screen bg-[#fafafa]">
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-14">
                {/* Header */}
                <div className="mb-10">
                    <button
                        onClick={() => navigate("/my-labs")}
                        className={cn(
                            "mb-4 flex items-center gap-1.5 text-[13px] font-medium text-[#a0a0a0]",
                            "transition-colors duration-200 hover:text-[#1a1a1a]"
                        )}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to My Labs
                    </button>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                                {instance.lab_definition.category?.replace("_", " ") ?? "Lab Instance"}
                            </p>
                            <h1 className="font-serif font-light text-2xl tracking-tight text-[#1a1a1a] lg:text-3xl">
                                {instance.lab_definition.name}
                            </h1>
                            <div className="mt-3 flex items-center gap-3">
                                <StatusBadge status={instance.status} />
                                <span className="text-[12px] text-[#a0a0a0]">
                                    ID: {instance.id.slice(0, 8)}...
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {lastRefreshed && (
                                <span className="text-[11px] text-[#a0a0a0]">
                                    Updated {lastRefreshed.toLocaleTimeString()}
                                </span>
                            )}
                            <button
                                onClick={handleRefresh}
                                disabled={isLoading}
                                className={cn(
                                    "flex h-9 items-center gap-2 rounded-lg border border-[#e8e8e8] bg-white px-3",
                                    "text-[12px] font-medium text-[#727373]",
                                    "hover:border-[#c4c4c4] hover:text-[#1a1a1a]",
                                    "transition-all duration-200 disabled:opacity-50"
                                )}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-3.5 w-3.5" />
                                )}
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Left: Details */}
                    <div className="space-y-8 lg:col-span-2">
                        {/* Progress Section */}
                        <section className="rounded-xl border border-[#e8e8e8] bg-white p-6">
                            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                                Progress
                            </p>
                            <h2 className="mb-4 font-serif font-light text-xl tracking-tight text-[#1a1a1a]">
                                Current Step
                            </h2>
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-[13px] text-[#727373]">
                                    Step {instance.current_step_index + 1} of 10
                                </span>
                                <span className="text-[13px] font-medium text-[#1a1a1a]">
                                    {Math.min((instance.current_step_index / 10) * 100, 100)}%
                                </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-[#f0f0f0]">
                                <div
                                    className="h-full rounded-full bg-[#1ca9b1] transition-all duration-500"
                                    style={{ width: `${Math.min((instance.current_step_index / 10) * 100, 100)}%` }}
                                />
                            </div>
                        </section>

                        {/* Timing Section */}
                        <section className="rounded-xl border border-[#e8e8e8] bg-white p-6">
                            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                                Session
                            </p>
                            <h2 className="mb-6 font-serif font-light text-xl tracking-tight text-[#1a1a1a]">
                                Timing Information
                            </h2>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                                <InfoItem
                                    label="Created"
                                    value={instance.created_at
                                        ? new Date(instance.created_at).toLocaleDateString()
                                        : "—"}
                                />
                                <InfoItem
                                    label="Started"
                                    value={instance.started_at
                                        ? new Date(instance.started_at).toLocaleDateString()
                                        : "—"}
                                />
                                <InfoItem
                                    label="Expires"
                                    value={instance.expires_at
                                        ? new Date(instance.expires_at).toLocaleDateString()
                                        : "—"}
                                />
                            </div>
                            {instance.time_remaining_minutes && (
                                <div className="mt-6 border-t border-[#f0f0f0] pt-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[13px] text-[#727373]">Time Remaining</span>
                                        <span className={cn(
                                            "text-[15px] font-semibold",
                                            instance.time_remaining_minutes < 10 ? "text-rose-600" : "text-[#1a1a1a]"
                                        )}>
                                            {instance.time_remaining_minutes} minutes
                                        </span>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Lab Definition Info */}
                        <section className="rounded-xl border border-[#e8e8e8] bg-white p-6">
                            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                                Lab Details
                            </p>
                            <h2 className="mb-6 font-serif font-light text-xl tracking-tight text-[#1a1a1a]">
                                Definition Summary
                            </h2>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <InfoItem
                                    label="Difficulty"
                                    value={instance.lab_definition.difficulty ?? "N/A"}
                                />
                                <InfoItem
                                    label="Category"
                                    value={instance.lab_definition.category?.replace("_", " ") ?? "N/A"}
                                />
                                <InfoItem
                                    label="Track"
                                    value={instance.lab_definition.track ?? "N/A"}
                                />
                                <InfoItem
                                    label="Duration"
                                    value={instance.duration_minutes
                                        ? `${instance.duration_minutes} min`
                                        : "N/A"}
                                />
                            </div>
                        </section>
                    </div>

                    {/* Right: Actions */}
                    <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
                        {/* Primary CTA */}
                        <div className="rounded-xl border border-[#e8e8e8] bg-white p-6">
                            {isRunning ? (
                                <button
                                    onClick={handleEnterLab}
                                    className={cn(
                                        "flex h-11 w-full items-center justify-center gap-2 rounded-lg",
                                        "bg-[#1ca9b1] text-[13px] font-semibold text-white",
                                        "transition-colors duration-200 hover:bg-[#17959c]"
                                    )}
                                >
                                    <Play className="h-4 w-4 fill-current" />
                                    Enter Lab
                                </button>
                            ) : isProvisioning ? (
                                <div className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#f0f0f0] text-[13px] font-medium text-[#a0a0a0]">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Provisioning...
                                </div>
                            ) : (
                                <div className="flex h-11 w-full items-center justify-center rounded-lg border border-[#e8e8e8] text-[13px] font-medium text-[#a0a0a0]">
                                    Instance {instance.status}
                                </div>
                            )}

                            <p className="mt-3 text-center text-[11px] text-[#a0a0a0]">
                                {isRunning
                                    ? "Your lab is ready. Click above to start."
                                    : isProvisioning
                                        ? "Your lab is being prepared. Please wait."
                                        : "This instance is not currently active."}
                            </p>
                        </div>

                        {/* Quick Stats */}
                        <div className="rounded-xl border border-[#e8e8e8] bg-white p-6">
                            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.15em] text-[#a0a0a0]">
                                Quick Stats
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[13px] text-[#727373]">Status</span>
                                    <StatusBadge status={instance.status} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[13px] text-[#727373]">Step</span>
                                    <span className="text-[13px] font-medium text-[#1a1a1a]">
                                        {instance.current_step_index + 1}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[13px] text-[#727373]">Power</span>
                                    <span className="text-[13px] font-medium text-[#1a1a1a]">
                                        {instance.power_state ?? "Unknown"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="mb-1 text-[12px] text-[#a0a0a0]">{label}</p>
            <p className="text-[14px] font-medium text-[#1a1a1a]">{value}</p>
        </div>
    )
}