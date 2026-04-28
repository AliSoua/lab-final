// src/pages/LabInstance/Trainee/LabInstanceRunPage.tsx
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
    AlertCircle,
    ArrowLeft,
    Loader2,
    Clock,
    Power,
    Monitor,
    RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTraineeLabRuntime } from "@/hooks/LabInstance/Trainee/useTraineeLabRuntime"
import { ResizableLabWorkspace } from "@/components/LabInstance/Trainee/InstanceRun/ResizableLabWorkspace"
import { LabGuidePanel } from "@/components/LabInstance/Trainee/InstanceRun/LabGuidePanel"
import { VMConsolePanel } from "@/components/LabInstance/Trainee/InstanceRun/VMConsolePanel"
import type { LabInstanceRuntimeResponse } from "@/types/LabInstance/Trainee/LabRuntime"
import type { GuideVersion } from "@/types/LabGuide"

const POLL_INTERVAL_MS = 30_000
const TERMINAL_STATUSES = new Set(["terminated", "stopped", "failed", "completed", "abandoned"])

/* ═══════════════════════════════════════════════════════════════════════════
   PRESENTATIONAL COMPONENTS (inline for now — extract to files later)
   ═══════════════════════════════════════════════════════════════════════════ */

function FullPageLoader({ message }: { message: string }) {
    return (
        <div className="flex h-full items-center justify-center bg-[#f9f9f9]">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#1ca9b1]" />
                <p className="text-[13px] text-[#727373]">{message}</p>
            </div>
        </div>
    )
}

function FullPageError({
    message,
    onBack,
}: {
    message: string
    onBack: () => void
}) {
    return (
        <div className="flex h-full items-center justify-center bg-[#f9f9f9] p-6">
            <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <AlertCircle className="h-10 w-10 text-red-600" />
                <h2 className="text-[16px] font-semibold text-red-900">
                    Unable to load lab instance
                </h2>
                <p className="text-[13px] text-red-700">{message}</p>
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 rounded-lg bg-[#1ca9b1] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#17959c] transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Labs
                </button>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const cls = useMemo(() => {
        switch (status) {
            case "running":
                return "bg-emerald-50 text-emerald-700"
            case "provisioning":
                return "bg-amber-50 text-amber-700"
            case "failed":
                return "bg-red-50 text-red-700"
            default:
                return "bg-slate-50 text-slate-700"
        }
    }, [status])

    return (
        <span
            className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                cls,
            )}
        >
            {status}
        </span>
    )
}

function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="min-w-0">
                <p className="text-[13px] font-semibold">Launch failed</p>
                <p className="mt-0.5 text-[12px] text-red-700 break-words">{message}</p>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function RunLabPage() {
    const { instanceId } = useParams<{ instanceId: string }>()
    const navigate = useNavigate()

    const {
        refreshInstance,
        getGuideVersion,
        isLoading: hookLoading,
        error: hookError,
    } = useTraineeLabRuntime()

    // ── Data State ──────────────────────────────────────────────────────
    const [runtime, setRuntime] = useState<LabInstanceRuntimeResponse | null>(null)
    const [guide, setGuide] = useState<GuideVersion | null>(null)
    const [guideError, setGuideError] = useState<string | null>(null)
    const [isBootstrapping, setIsBootstrapping] = useState(true)
    const [bootstrapError, setBootstrapError] = useState<string | null>(null)

    // ── UI State ────────────────────────────────────────────────────────
    const [activeConnectionKey, setActiveConnectionKey] = useState<string | null>(null)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)

    // ── Polling Refs (stable across renders) ────────────────────────────
    const pollTimerRef = useRef<number | null>(null)
    const inFlightRef = useRef(false)
    const isMountedRef = useRef(true)

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
            if (pollTimerRef.current !== null) {
                window.clearInterval(pollTimerRef.current)
                pollTimerRef.current = null
            }
        }
    }, [])

    // ── Connection Selection ────────────────────────────────────────────
    const connectionEntries = useMemo(() => {
        if (!runtime?.guacamole_connections) return []
        return Object.entries(runtime.guacamole_connections)
    }, [runtime?.guacamole_connections])

    useEffect(() => {
        if (connectionEntries.length === 0) {
            setActiveConnectionKey(null)
            return
        }
        const keys = connectionEntries.map(([k]) => k)
        setActiveConnectionKey(prev =>
            prev && keys.includes(prev) ? prev : keys[0],
        )
    }, [connectionEntries])

    const activeConnectionId = useMemo(() => {
        if (!activeConnectionKey || !runtime?.guacamole_connections) return null
        return runtime.guacamole_connections[activeConnectionKey] ?? null
    }, [activeConnectionKey, runtime?.guacamole_connections])

    // ── Time Display ────────────────────────────────────────────────────
    const timeDisplay = useMemo(() => {
        const mins = runtime?.time_remaining_minutes
        if (mins === undefined || mins === null) return null
        if (mins <= 0) return "Expired"
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return h > 0 ? `${h}h ${m}m` : `${m}m`
    }, [runtime?.time_remaining_minutes])

    // ── Bootstrap: Load Runtime + Guide (runs exactly once per mount) ───
    useEffect(() => {
        if (!instanceId) {
            setBootstrapError("No instance ID provided")
            setIsBootstrapping(false)
            return
        }

        let cancelled = false

        const bootstrap = async () => {
            try {
                // 1. Runtime first — gives us status, connections, step index
                const rt = await refreshInstance(instanceId)
                if (cancelled || !isMountedRef.current) return

                setRuntime(rt)
                setCurrentStepIndex(rt.current_step_index ?? 0)

                // 2. Guide version — completely independent of runtime polling
                try {
                    const gv = await getGuideVersion(instanceId)
                    if (cancelled || !isMountedRef.current) return
                    setGuide(gv)
                } catch (err) {
                    if (!cancelled && isMountedRef.current) {
                        setGuideError(
                            err instanceof Error
                                ? err.message
                                : "Failed to load lab guide",
                        )
                    }
                }
            } catch (err) {
                if (!cancelled && isMountedRef.current) {
                    setBootstrapError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load lab instance",
                    )
                }
            } finally {
                if (!cancelled && isMountedRef.current) {
                    setIsBootstrapping(false)
                }
            }
        }

        bootstrap()
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instanceId])

    // ── Polling: Runtime ONLY (no guide re-fetch) ───────────────────────
    useEffect(() => {
        if (!instanceId || isBootstrapping) return
        if (TERMINAL_STATUSES.has(runtime?.status ?? "")) return

        const tick = async () => {
            if (inFlightRef.current) return
            inFlightRef.current = true

            try {
                const fresh = await refreshInstance(instanceId)
                if (!isMountedRef.current) return

                setRuntime(prev => {
                    // Defensive: avoid no-op re-renders if nothing changed
                    if (
                        prev &&
                        prev.status === fresh.status &&
                        prev.current_step_index === fresh.current_step_index &&
                        prev.time_remaining_minutes === fresh.time_remaining_minutes &&
                        prev.power_state === fresh.power_state
                    ) {
                        return prev
                    }
                    return fresh
                })

                // Sync step index from server if it moved forward
                setCurrentStepIndex(prev =>
                    fresh.current_step_index > prev ? fresh.current_step_index : prev,
                )
            } catch {
                // Silent fail on background poll — don't spam toasts
            } finally {
                inFlightRef.current = false
            }
        }

        // Immediate tick, then interval
        tick()
        pollTimerRef.current = window.setInterval(tick, POLL_INTERVAL_MS)

        return () => {
            if (pollTimerRef.current !== null) {
                window.clearInterval(pollTimerRef.current)
                pollTimerRef.current = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instanceId, isBootstrapping])

    // Stop polling when terminal
    useEffect(() => {
        if (
            runtime?.status &&
            TERMINAL_STATUSES.has(runtime.status) &&
            pollTimerRef.current !== null
        ) {
            window.clearInterval(pollTimerRef.current)
            pollTimerRef.current = null
        }
    }, [runtime?.status])

    // ── Manual Refresh ──────────────────────────────────────────────────
    const handleManualRefresh = useCallback(async () => {
        if (!instanceId || inFlightRef.current) return
        inFlightRef.current = true
        try {
            const fresh = await refreshInstance(instanceId)
            if (isMountedRef.current) {
                setRuntime(fresh)
                setCurrentStepIndex(fresh.current_step_index ?? 0)
            }
        } catch (err) {
            // Handled by hook toast
        } finally {
            inFlightRef.current = false
        }
    }, [instanceId, refreshInstance])

    // ── Guide Interaction Handlers ──────────────────────────────────────
    const handleStepChange = useCallback((index: number) => {
        setCurrentStepIndex(index)
    }, [])

    const handleRunCommand = useCallback(
        (_stepId: string, _commandIndex: number) => {
            // TODO: wire to command execution API when ready
        },
        [],
    )

    // ── Derived ─────────────────────────────────────────────────────────
    const isProvisioning = runtime?.status === "provisioning"
    const hasConnections = connectionEntries.length > 0
    const displayError = bootstrapError || hookError

    // ════════════════════════════════════════════════════════════════════
    // RENDER STATES
    // ════════════════════════════════════════════════════════════════════

    if (isBootstrapping || hookLoading) {
        return <FullPageLoader message="Loading lab environment..." />
    }

    if (displayError || !runtime) {
        return (
            <FullPageError
                message={displayError || "Instance not found."}
                onBack={() => navigate("/labs")}
            />
        )
    }

    const headerTitle = runtime.lab_name || "Lab Instance"
    const activeEntry = activeConnectionKey
        ? connectionEntries.find(([k]) => k === activeConnectionKey)
        : undefined

    return (
        <div className="flex h-full flex-col bg-[#f9f9f9]">
            {/* ── Header ─────────────────────────────────────────────── */}
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e8e8e8] bg-white px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => navigate(`/lab-instances/${runtime.id}`)}
                        className="flex items-center gap-1.5 text-[12px] font-medium text-[#727373] hover:text-[#1ca9b1] transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Instance Details
                    </button>
                    <span className="text-[#c4c4c4]">•</span>
                    <h1 className="text-[14px] font-semibold text-[#3a3a3a] truncate">
                        {headerTitle}
                    </h1>
                    <StatusBadge status={runtime.status} />
                </div>

                <div className="flex items-center gap-4 text-[12px] text-[#727373]">
                    {/* Connection count (safe) */}
                    {hasConnections ? (
                        <div className="flex items-center gap-1.5">
                            <Monitor className="h-3.5 w-3.5" />
                            <span>
                                {connectionEntries.length} connection
                                {connectionEntries.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <Power className="h-3.5 w-3.5" />
                            <span>No connections</span>
                        </div>
                    )}

                    {/* Time remaining (from backend, no client calc) */}
                    {timeDisplay && (
                        <div className="flex items-center gap-1.5 border-l border-[#e8e8e8] pl-4">
                            <Clock className="h-3.5 w-3.5" />
                            <span
                                className={cn(
                                    timeDisplay === "Expired" &&
                                    "text-red-600 font-medium",
                                )}
                            >
                                {timeDisplay}
                            </span>
                        </div>
                    )}

                    {/* Power state */}
                    <div className="flex items-center gap-1.5 border-l border-[#e8e8e8] pl-4">
                        <Power className="h-3.5 w-3.5" />
                        <span className="capitalize">
                            {runtime.power_state ?? "unknown"}
                        </span>
                    </div>

                    {/* Manual refresh */}
                    <button
                        onClick={handleManualRefresh}
                        disabled={inFlightRef.current}
                        className="flex items-center gap-1 border-l border-[#e8e8e8] pl-4 text-[#727373] hover:text-[#1ca9b1] disabled:opacity-50 transition-colors"
                        title="Refresh status"
                    >
                        <RefreshCw
                            className={cn(
                                "h-3.5 w-3.5",
                                inFlightRef.current && "animate-spin",
                            )}
                        />
                    </button>
                </div>
            </header>

            {/* ── Error Banner ───────────────────────────────────────── */}
            {runtime.status === "failed" && runtime.error_message && (
                <ErrorBanner message={runtime.error_message} />
            )}

            {/* ── Main Workspace ─────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden">
                <ResizableLabWorkspace
                    defaultLeftWidth={42}
                    leftPanel={
                        <LabGuidePanel
                            steps={guide?.steps ?? []}
                            stepStates={{}} // TODO: hydrate from session_state when API ready
                            currentStepIndex={currentStepIndex}
                            onStepChange={handleStepChange}
                            onRunCommand={handleRunCommand}
                            isLoading={!guide && !guideError}
                            error={guideError}
                        />
                    }
                    rightPanel={
                        <VMConsolePanel
                            connectionId={activeConnectionId}
                            title={activeEntry ? activeEntry[0] : "Console"}
                            isProvisioning={isProvisioning && !hasConnections}
                            errorMessage={guideError}
                        />
                    }
                />
            </div>
        </div>
    )
}