// src/components/LabInstance/Trainee/InstanceRun/LabRunPage.tsx
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useTraineeLabRuntime } from "@/hooks/LabInstance/Trainee/useTraineeLabRuntime"
import { useLabInstanceEvents } from "@/hooks/LabInstance/Trainee/useLabInstanceEvents"
import { useLabCountdown } from "./hooks/useLabCountdown"
import { useLabConnections } from "./hooks/useLabConnections"
import type { LabInstanceRuntimeResponse } from "@/types/LabInstance/Trainee/LabRuntime"
import type { GuideVersion } from "@/types/LabGuide"
import type { ProvisioningStage } from "@/components/LabInstance/Trainee/InstanceRun/GuacamoleClient"
import { FullPageLoader, FullPageError } from "./shared/FullPageStates"
import { LabHeader } from "./sections/LabHeader"
import { LabWorkspace } from "./sections/LabWorkspace"
import { ExpiryToast, ExpiredModal } from "./sections/LabModals"
import { AlertCircle } from "lucide-react"

interface LabRunPageProps {
    instanceId: string
}

export function LabRunPage({ instanceId }: LabRunPageProps) {
    const navigate = useNavigate()
    const { refreshInstance, getGuideVersion, terminateInstance, isTerminating, error: hookError } = useTraineeLabRuntime()

    // ── Bootstrap State ───────────────────────────────────────────────
    const [runtime, setRuntime] = useState<LabInstanceRuntimeResponse | null>(null)
    const [guide, setGuide] = useState<GuideVersion | null>(null)
    const [guideError, setGuideError] = useState<string | null>(null)
    const [isBootstrapping, setIsBootstrapping] = useState(true)
    const [bootstrapError, setBootstrapError] = useState<string | null>(null)

    // ── Ready State ───────────────────────────────────────────────────
    // CRITICAL: Only true after INSTANCE_RUNNING event. Gates countdown and UI.
    const [isReady, setIsReady] = useState(false)
    const [readyExpiresAt, setReadyExpiresAt] = useState<string | null>(null)

    // ── Countdown ─────────────────────────────────────────────────────
    // Only starts when isReady=true and readyExpiresAt is set
    const [countdownState, countdownActions] = useLabCountdown(readyExpiresAt, isReady)
    const { isExpired, formattedTime, minutesRemaining, showWarning } = countdownState

    // ── Connections ───────────────────────────────────────────────────
    const { entries, activeKey, activeConnectionId, hasConnections } = useLabConnections(runtime?.guacamole_connections)

    // ── SSE: Live provisioning & status events ────────────────────────
    const needsProvisioning = runtime?.status === "provisioning" || runtime?.status === "pending"
    const {
        provisioningMessage,
        provisioningStage,
        isConnected: sseConnected,
        isReady: sseReady,
        hasFailed: sseFailed,
        failureMessage: sseFailureMessage,
        close: closeSse,
    } = useLabInstanceEvents(instanceId, needsProvisioning && !isReady)

    // When SSE signals ready, fetch full state ONCE, then freeze
    useEffect(() => {
        if (!sseReady || isReady) return

        refreshInstance(instanceId)
            .then((fresh) => {
                setRuntime(fresh)
                setIsReady(true)
                // Freeze expiresAt — never update from subsequent refreshes
                if (fresh.expires_at) setReadyExpiresAt(fresh.expires_at)
            })
            .catch(() => {
                // Error handled by hook
            })
            .finally(() => {
                closeSse()
            })
    }, [sseReady, isReady, instanceId, refreshInstance, closeSse])

    // ── Bootstrap: Load once ──────────────────────────────────────────
    useEffect(() => {
        let cancelled = false

        const bootstrap = async () => {
            try {
                const rt = await refreshInstance(instanceId)
                if (cancelled) return

                setRuntime(rt)

                // If already running (page refresh after ready), set ready immediately
                if (rt.status === "running" && rt.expires_at) {
                    setIsReady(true)
                    setReadyExpiresAt(rt.expires_at)
                }

                try {
                    const gv = await getGuideVersion(instanceId)
                    if (!cancelled) setGuide(gv)
                } catch (err) {
                    if (!cancelled) setGuideError(err instanceof Error ? err.message : "Failed to load guide")
                }
            } catch (err) {
                if (!cancelled) setBootstrapError(err instanceof Error ? err.message : "Failed to load instance")
            } finally {
                if (!cancelled) setIsBootstrapping(false)
            }
        }

        bootstrap()
        return () => { cancelled = true }
    }, [instanceId, refreshInstance, getGuideVersion])

    // ── Auto-redirect on expiry ───────────────────────────────────────
    useEffect(() => {
        if (isExpired) {
            const timer = window.setTimeout(() => navigate("/labs"), 5000)
            return () => window.clearTimeout(timer)
        }
    }, [isExpired, navigate])

    // ── Handlers ──────────────────────────────────────────────────────
    const handleBack = useCallback(() => navigate(`/lab-instances/${instanceId}`), [navigate, instanceId])

    const handleManualRefresh = useCallback(async () => {
        try {
            const fresh = await refreshInstance(instanceId)
            setRuntime(fresh)
            // Never update readyExpiresAt from manual refresh — keep frozen
        } catch {
            // Error handled by hook
        }
    }, [instanceId, refreshInstance])

    const handleTerminate = useCallback(async () => {
        if (!window.confirm("Are you sure you want to terminate this lab instance? This action cannot be undone.")) return
        try {
            closeSse()
            await terminateInstance(instanceId)
            navigate("/labs")
        } catch {
            // Error handled by hook
        }
    }, [instanceId, terminateInstance, navigate, closeSse])

    const handleStepChange = useCallback((index: number) => {
        setRuntime(prev => prev ? { ...prev, current_step_index: index } : prev)
    }, [])

    const handleRunCommand = useCallback((_stepId: string, _commandIndex: number) => {
        // TODO: wire to command execution API
    }, [])

    // ── Render States ───────────────────────────────────────────────
    if (isBootstrapping) return <FullPageLoader message="Loading lab environment..." />

    const displayError = bootstrapError || hookError || (sseFailed ? sseFailureMessage : null)
    if (displayError || !runtime) {
        return <FullPageError message={displayError || "Instance not found."} onBack={() => navigate("/labs")} />
    }

    const activeEntry = entries.find(e => e.key === activeKey)
    const showProvisioningOverlay = needsProvisioning && !isReady && !sseFailed

    return (
        <div className="flex h-full flex-col bg-[#f9f9f9]">
            {/* Expiry Toast — non-blocking, inside header area */}
            {showWarning && minutesRemaining !== null && (
                <div className="shrink-0 px-4 pt-3">
                    <ExpiryToast minutesRemaining={minutesRemaining} onDismiss={countdownActions.dismissWarning} />
                </div>
            )}

            {/* Expired Modal — blocking, unavoidable */}
            {isExpired && <ExpiredModal onExit={() => navigate("/labs")} />}

            {/* Header */}
            <LabHeader
                instanceId={instanceId}
                labName={runtime.lab_name ?? undefined}
                status={runtime.status}
                powerState={runtime.power_state}
                formattedTime={formattedTime}
                minutesRemaining={minutesRemaining}
                connectionCount={entries.length}
                isReady={isReady}
                isRefreshing={false}
                isTerminating={isTerminating}
                onBack={handleBack}
                onRefresh={handleManualRefresh}
                onTerminate={handleTerminate}
            />

            {/* Error Banner — only for failed status */}
            {runtime.status === "failed" && runtime.error_message && (
                <div className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold">Launch failed</p>
                        <p className="mt-0.5 text-[12px] text-red-700 break-words">{runtime.error_message}</p>
                    </div>
                </div>
            )}

            {/* Workspace — provisioning overlay is now inside GuacamoleClient */}
            <LabWorkspace
                guide={guide}
                guideError={guideError}
                currentStepIndex={runtime.current_step_index ?? 0}
                connectionId={activeConnectionId}
                connectionTitle={activeEntry?.key ?? "Console"}
                isProvisioning={showProvisioningOverlay}
                provisioningMessage={provisioningMessage}
                provisioningStage={provisioningStage as ProvisioningStage}
                onStepChange={handleStepChange}
                onRunCommand={handleRunCommand}
            />
        </div>
    )
}