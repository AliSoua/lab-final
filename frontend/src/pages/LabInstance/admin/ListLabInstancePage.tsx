// src/pages/LabInstance/admin/ListLabInstancePage.tsx
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Monitor, RefreshCw, AlertTriangle } from "lucide-react"
import { useAdminLabInstance } from "@/hooks/LabInstance/useAdminLabInstance"
import { useLabInstance } from "@/hooks/LabInstance/useLabInstance"
import { useInstanceTerminate } from "@/hooks/LabInstance/admin/useInstanceTerminate"
import { InstanceTable } from "@/components/LabInstance/admin/ListLabInstance/InstanceTable"
import type { LabInstance } from "@/types/LabInstance/LabInstance"

export default function ListLabInstancePage() {
    const navigate = useNavigate()

    // ── Admin list (no trainee filter) ────────────────────────────────────
    const { listAllInstances, isLoading, error } = useAdminLabInstance()

    // ── Mutations ─────────────────────────────────────────────────────────
    const { stopInstance, isLoading: isStopping } = useLabInstance()
    const { terminateInstance, isLoading: isTerminating } = useInstanceTerminate()

    const [instances, setInstances] = useState<LabInstance[]>([])
    const [total, setTotal] = useState(0)

    const [terminateConfirm, setTerminateConfirm] = useState<LabInstance | null>(null)
    const [stopConfirm, setStopConfirm] = useState<LabInstance | null>(null)

    const fetchInstances = useCallback(
        async (skip = 0, limit = 100) => {
            const result = await listAllInstances(skip, limit)
            setInstances(result.items)
            setTotal(result.total)
            return result
        },
        [listAllInstances]
    )

    useEffect(() => {
        fetchInstances(0, 100)
    }, [fetchInstances])

    const handleRefresh = useCallback(() => {
        fetchInstances(0, 100)
    }, [fetchInstances])

    const handleView = useCallback(
        (instance: LabInstance) => {
            navigate(`/admin/lab-instances/${instance.id}`)
        },
        [navigate]
    )

    const handleStop = useCallback((instance: LabInstance) => {
        setStopConfirm(instance)
    }, [])

    const confirmStop = useCallback(
        async (instance: LabInstance) => {
            try {
                await stopInstance(instance.id)
                setStopConfirm(null)
                fetchInstances(0, 100)
            } catch {
                // Error toast handled by mutation hook
            }
        },
        [stopInstance, fetchInstances]
    )

    const handleTerminate = useCallback((instance: LabInstance) => {
        setTerminateConfirm(instance)
    }, [])

    const confirmTerminate = useCallback(
        async (instance: LabInstance) => {
            try {
                await terminateInstance(instance.id)
                setTerminateConfirm(null)
                fetchInstances(0, 100)
            } catch {
                // Error toast handled by mutation hook
            }
        },
        [terminateInstance, fetchInstances]
    )

    return (
        <div className="flex flex-col h-full bg-[#f9f9f9]">
            {/* Header */}
            <div className="bg-white border-b border-[#e8e8e8] px-6 py-5 shrink-0">
                <div className="flex items-center justify-between w-full px-4">
                    <div>
                        <h1 className="text-xl font-semibold text-[#3a3a3a]">
                            Lab Instances
                        </h1>
                        <p className="text-sm text-[#727373] mt-0.5">
                            Monitor and manage active lab environments across all trainees
                        </p>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className={cn(
                            "flex items-center gap-2 rounded-lg px-4 py-2",
                            "border border-[#e8e8e8] bg-white text-[#3a3a3a] text-sm font-medium",
                            "hover:bg-[#f5f5f5] hover:border-[#d4d4d4]",
                            "transition-all duration-200 disabled:opacity-50"
                        )}
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="w-full px-4 space-y-4">
                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-4 bg-[#e6f7f8] border border-[#1ca9b1]/20 rounded-lg">
                        <Monitor className="h-5 w-5 text-[#1ca9b1] shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-[#3a3a3a]">
                                {total} instance{total !== 1 ? "s" : ""} found
                            </p>
                            <p className="text-xs text-[#727373] mt-0.5">
                                Instances are created automatically when trainees launch labs. Use the actions menu to stop or terminate environments.
                            </p>
                        </div>
                    </div>

                    {/* Error state */}
                    {error && !isLoading && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-800">
                                    Failed to load instances
                                </p>
                                <p className="text-xs text-red-600 mt-0.5">{error}</p>
                            </div>
                        </div>
                    )}

                    <InstanceTable
                        instances={instances}
                        isLoading={isLoading}
                        isSubmitting={isStopping || isTerminating}
                        onView={handleView}
                        onStop={handleStop}
                        onTerminate={handleTerminate}
                    />
                </div>
            </div>

            {/* Stop confirmation modal */}
            {stopConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setStopConfirm(null)}
                    />
                    <div className="relative bg-white rounded-xl border border-[#e8e8e8] shadow-xl p-6 w-full max-w-sm mx-4">
                        <h3 className="text-[15px] font-semibold text-[#3a3a3a] mb-2">
                            Stop Instance?
                        </h3>
                        <p className="text-sm text-[#727373] mb-6">
                            This will power off{" "}
                            <span className="font-medium text-[#3a3a3a]">
                                {stopConfirm.vm_name || stopConfirm.id.slice(0, 8)}
                            </span>
                            . The trainee can start it again later.
                        </p>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => setStopConfirm(null)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-[#727373] hover:bg-[#f5f5f5]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => confirmStop(stopConfirm)}
                                disabled={isStopping}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium",
                                    "bg-amber-500 text-white hover:bg-amber-600",
                                    "transition-colors disabled:opacity-60"
                                )}
                            >
                                {isStopping ? "Stopping..." : "Stop Instance"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Terminate confirmation modal */}
            {terminateConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setTerminateConfirm(null)}
                    />
                    <div className="relative bg-white rounded-xl border border-[#e8e8e8] shadow-xl p-6 w-full max-w-sm mx-4">
                        <h3 className="text-[15px] font-semibold text-[#3a3a3a] mb-2">
                            Terminate Instance?
                        </h3>
                        <p className="text-sm text-[#727373] mb-6">
                            This will permanently destroy{" "}
                            <span className="font-medium text-[#3a3a3a]">
                                {terminateConfirm.vm_name || terminateConfirm.id.slice(0, 8)}
                            </span>
                            . All VM data will be lost and the trainee will need to relaunch the lab.
                        </p>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => setTerminateConfirm(null)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-[#727373] hover:bg-[#f5f5f5]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => confirmTerminate(terminateConfirm)}
                                disabled={isTerminating}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium",
                                    "bg-red-500 text-white hover:bg-red-600",
                                    "transition-colors disabled:opacity-60"
                                )}
                            >
                                {isTerminating ? "Terminating..." : "Terminate"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}