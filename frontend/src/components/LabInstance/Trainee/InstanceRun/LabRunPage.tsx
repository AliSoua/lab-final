// src/components/LabInstance/Trainee/InstanceRun/LabRunPage.tsx
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useTraineeLabRuntime } from "@/hooks/LabInstance/Trainee/useTraineeLabRuntime"
import { useLabInstanceEvents } from "@/hooks/LabInstance/Trainee/useLabInstanceEvents"
import { useLabCountdown } from "./hooks/useLabCountdown"
import { useLabConnections } from "./hooks/useLabConnections"
import type { LabInstanceRuntimeResponse } from "@/types/LabInstance/Trainee/LabRuntime"
import type { GuideVersion } from "@/types/LabGuide"
import { FullPageLoader, FullPageError } from "./shared/FullPageStates"
import { LabHeader } from "./sections/LabHeader"
import { LabWorkspace } from "./sections/LabWorkspace"
import { ExpiryWarningModal, ExpiredModal } from "./sections/LabModals"
import { AlertCircle, Loader2 } from "lucide-react"

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

    // ── Countdown ─────────────────────────────────────────────────────
    const [expiresAt, setExpiresAt] = useState<string | null>(null)
    const [countdownState, countdownActions] = useLabCountdown(expiresAt)
    const { isExpired, formattedTime, minutesRemaining } = countdownState

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
    } = useLabInstanceEvents(instanceId, needsProvisioning && !hasConnections)

    // When SSE signals ready, fetch full state to get connections
    useEffect(() => {
        if (sseReady && !hasConnections) {
            refreshInstance(instanceId)
                .then((fresh) => {
                    setRuntime(fresh)
                    if (fresh.expires_at) setExpiresAt(fresh.expires_at)
                })
                .catch(() => {
                    // Error handled by hook
                })
                .finally(() => {
                    closeSse()
                })
        }
    }, [sseReady, hasConnections, instanceId, refreshInstance, closeSse])

    // ── Bootstrap: Load once ──────────────────────────────────────────
    useEffect(() => {
        let cancelled = false

        const bootstrap = async () => {
            try {
                const rt = await refreshInstance(instanceId)
                if (cancelled) return

                setRuntime(rt)
                if (rt.expires_at) setExpiresAt(rt.expires_at)

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
            const timer = window.setTimeout(() => {
                navigate("/labs")
            }, 5000)
            return () => window.clearTimeout(timer)
        }
    }, [isExpired, navigate])

    // ── Handlers ──────────────────────────────────────────────────────
    const handleBack = useCallback(() => navigate(`/lab-instances/${instanceId}`), [navigate, instanceId])

    const handleManualRefresh = useCallback(async () => {
        try {
            const fresh = await refreshInstance(instanceId)
            setRuntime(fresh)
            if (fresh.expires_at) setExpiresAt(fresh.expires_at)
            return fresh
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

    // Determine if we should show the provisioning overlay
    const showProvisioning = needsProvisioning && !hasConnections && !sseFailed

    return (
        <div className="flex h-full flex-col bg-[#f9f9f9]">
            {/* Modals */}
            {countdownState.showWarning && minutesRemaining !== null && (
                <ExpiryWarningModal minutesRemaining={minutesRemaining} onContinue={countdownActions.dismissWarning} />
            )}
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
                isRefreshing={false}
                isTerminating={isTerminating}
                onBack={handleBack}
                onRefresh={handleManualRefresh}
                onTerminate={handleTerminate}
            />

            {/* Error Banner */}
            {runtime.status === "failed" && runtime.error_message && (
                <div className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold">Launch failed</p>
                        <p className="mt-0.5 text-[12px] text-red-700 break-words">{runtime.error_message}</p>
                    </div>
                </div>
            )}

            {/* SSE Provisioning Banner (replaces silent polling) */}
            {showProvisioning && (
                <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-[#1ca9b1]/20 bg-[#1ca9b1]/5 px-4 py-3 text-[#1ca9b1]">
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold">Provisioning lab</p>
                        <p className="mt-0.5 text-[12px] text-[#1ca9b1]/80 break-words">
                            {provisioningMessage}
                            {sseConnected && (
                                <span className="ml-2 inline-flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            )}
                        </p>
                        {provisioningStage && (
                            <div className="mt-2 flex gap-1">
                                {["validated", "vcenter_discovered", "vm_cloned", "vm_powered_on", "ip_discovered", "guacamole_connected", "finalized"].map((stage, i) => {
                                    const reached = ["validated", "vcenter_discovered", "vm_cloned", "vm_powered_on", "ip_discovered", "guacamole_connected", "finalized"].indexOf(provisioningStage ?? "") >= i
                                    return (
                                        <div
                                            key={stage}
                                            className={`h-1 flex-1 rounded-full ${reached ? "bg-[#1ca9b1]" : "bg-[#1ca9b1]/20"}`}
                                        />
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Workspace */}
            <LabWorkspace
                guide={guide}
                guideError={guideError}
                currentStepIndex={runtime.current_step_index ?? 0}
                connectionId={activeConnectionId}
                connectionTitle={activeEntry?.key ?? "Console"}
                isProvisioning={showProvisioning}
                onStepChange={handleStepChange}
                onRunCommand={handleRunCommand}
            />
        </div>
    )
}