import { useState, useEffect, useMemo, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
    AlertCircle,
    ArrowLeft,
    Loader2,
    Terminal,
    WifiOff,
    Clock,
    Power,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLabInstance } from "@/hooks/LabInstance/useLabInstance"
import { useLabGuideRuntime } from "@/hooks/LabInstance/useLabGuideRuntime"
import { ResizableLabWorkspace } from "@/components/LabInstance/run/ResizableLabWorkspace"
import { LabGuidePanel } from "@/components/LabInstance/run/LabGuidePanel"
import { VMConsolePanel } from "@/components/LabInstance/run/VMConsolePanel"
import type { LabInstance } from "@/types/LabInstance/LabInstance"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
const POLL_INTERVAL_MS = 30_000

async function silentRefresh(instanceId: string): Promise<LabInstance | null> {
    const token = localStorage.getItem("access_token")
    if (!token) return null
    try {
        const res = await fetch(
            `${API_BASE_URL}/lab-instances/${instanceId}/refresh`,
            { method: "POST", headers: { Authorization: `Bearer ${token}` } },
        )
        if (!res.ok) return null
        return (await res.json()) as LabInstance
    } catch {
        return null
    }
}

export default function RunLabPage() {
    const { instanceId } = useParams<{ instanceId: string }>()
    const navigate = useNavigate()
    const { getInstance } = useLabInstance()

    const [instance, setInstance] = useState<LabInstance | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [isInitialLoading, setIsInitialLoading] = useState(true)
    const [activeKey, setActiveKey] = useState<string | null>(null)

    // ── Guide Runtime State ─────────────────────────────────────────────
    const {
        steps,
        stepStates,
        currentStepIndex,
        isLoading: guideLoading,
        error: guideError,
        handleStepChange,
        handleRunCommand,
    } = useLabGuideRuntime(instance)

    // ── Connection Selection ────────────────────────────────────────────
    const connectionEntries = useMemo(() => {
        if (!instance?.guacamole_connections) return []
        return Object.entries(instance.guacamole_connections)
    }, [instance])

    useEffect(() => {
        if (connectionEntries.length === 0) return
        const keys = connectionEntries.map(([k]) => k)
        if (!activeKey || !keys.includes(activeKey)) {
            setActiveKey(keys[0])
        }
    }, [connectionEntries, activeKey])

    const activeConnectionId = useMemo(() => {
        if (!activeKey || !instance?.guacamole_connections) return null
        return instance.guacamole_connections[activeKey] ?? null
    }, [activeKey, instance])

    // ── Initial Fetch & Polling ─────────────────────────────────────────
    useEffect(() => {
        let cancelled = false
        if (!instanceId) return
            ; (async () => {
                try {
                    const data = await getInstance(instanceId)
                    if (!cancelled) setInstance(data)
                } catch (err) {
                    if (!cancelled) {
                        setLoadError(err instanceof Error ? err.message : "Failed to load instance")
                    }
                } finally {
                    if (!cancelled) setIsInitialLoading(false)
                }
            })()
        return () => { cancelled = true }
    }, [instanceId, getInstance])

    useEffect(() => {
        if (!instanceId || isInitialLoading) return
        const isTerminal = (inst: LabInstance | null) =>
            !inst || ["terminated", "stopped", "failed"].includes(inst.status)

        if (isTerminal(instance)) return

        let cancelled = false
        let inFlight = false
        let intervalId: number | null = null

        const tick = async () => {
            if (cancelled || inFlight) return
            inFlight = true
            try {
                const fresh = await silentRefresh(instanceId)
                if (cancelled || !fresh) return
                setInstance(fresh)
                if (isTerminal(fresh) && intervalId !== null) {
                    window.clearInterval(intervalId)
                    intervalId = null
                }
            } finally {
                inFlight = false
            }
        }

        intervalId = window.setInterval(tick, POLL_INTERVAL_MS)
        tick()
        return () => {
            cancelled = true
            if (intervalId !== null) window.clearInterval(intervalId)
        }
    }, [instanceId, isInitialLoading])

    // ── Derived State ───────────────────────────────────────────────────
    const isProvisioning = instance?.status === "provisioning"
    const hasConnections = connectionEntries.length > 0

    const timeRemaining = useMemo(() => {
        if (!instance?.expires_at) return null
        const diff = new Date(instance.expires_at).getTime() - Date.now()
        if (diff <= 0) return "Expired"
        const h = Math.floor(diff / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        return `${h}h ${m}m`
    }, [instance?.expires_at])

    // ── Loading & Error States ──────────────────────────────────────────
    if (isInitialLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f9f9f9]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#1ca9b1]" />
                    <p className="text-[13px] text-[#727373]">Loading lab environment...</p>
                </div>
            </div>
        )
    }

    if (loadError || !instance) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f9f9f9] p-6">
                <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                    <AlertCircle className="h-10 w-10 text-red-600" />
                    <h2 className="text-[16px] font-semibold text-red-900">
                        Unable to load lab instance
                    </h2>
                    <p className="text-[13px] text-red-700">{loadError || "Instance not found."}</p>
                    <button
                        onClick={() => navigate("/labs")}
                        className="flex items-center gap-2 rounded-lg bg-[#1ca9b1] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#17959c] transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Labs
                    </button>
                </div>
            </div>
        )
    }

    const headerTitle = instance.vm_name || "Lab Instance"
    const activeEntry = activeKey
        ? connectionEntries.find(([k]) => k === activeKey)
        : undefined

    return (
        <div className="flex h-full flex-col bg-[#f9f9f9]">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e8e8e8] bg-white px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => navigate(`/lab-instances/${instance.id}`)}
                        className="flex items-center gap-1.5 text-[12px] font-medium text-[#727373] hover:text-[#1ca9b1] transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Instance Details
                    </button>
                    <span className="text-[#c4c4c4]">•</span>
                    <h1 className="text-[14px] font-semibold text-[#3a3a3a] truncate">
                        {headerTitle}
                    </h1>
                    <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        instance.status === "running"
                            ? "bg-emerald-50 text-emerald-700"
                            : instance.status === "provisioning"
                                ? "bg-amber-50 text-amber-700"
                                : instance.status === "failed"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-slate-50 text-slate-700",
                    )}>
                        {instance.status}
                    </span>
                </div>

                <div className="flex items-center gap-4 text-[12px] text-[#727373]">
                    {instance.ip_address ? (
                        <div className="flex items-center gap-1.5">
                            <Terminal className="h-3.5 w-3.5" />
                            <span className="font-mono text-[11px]">{instance.ip_address}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <WifiOff className="h-3.5 w-3.5" />
                            <span>No IP</span>
                        </div>
                    )}
                    {timeRemaining && (
                        <div className="flex items-center gap-1.5 border-l border-[#e8e8e8] pl-4">
                            <Clock className="h-3.5 w-3.5" />
                            <span className={cn(timeRemaining === "Expired" && "text-red-600 font-medium")}>
                                {timeRemaining}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 border-l border-[#e8e8e8] pl-4">
                        <Power className="h-3.5 w-3.5" />
                        <span className="capitalize">{instance.power_state}</span>
                    </div>
                </div>
            </div>

            {/* ── Error Banner ───────────────────────────────────────────── */}
            {instance.status === "failed" && instance.error_message && (
                <div className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold">Launch failed</p>
                        <p className="mt-0.5 text-[12px] text-red-700 break-words">
                            {instance.error_message}
                        </p>
                    </div>
                </div>
            )}

            {/* ── Main Workspace: Guide Left + Console Right ───────────── */}
            <div className="flex-1 overflow-hidden">
                <ResizableLabWorkspace
                    defaultLeftWidth={42}
                    leftPanel={
                        <LabGuidePanel
                            steps={steps}
                            stepStates={stepStates}
                            currentStepIndex={currentStepIndex}
                            onStepChange={handleStepChange}
                            onRunCommand={handleRunCommand}
                            isLoading={guideLoading}
                        />
                    }
                    rightPanel={
                        <VMConsolePanel
                            connectionId={activeConnectionId}
                            title={activeEntry ? activeEntry[0] : "Console"}
                            subtitle={instance.ip_address || undefined}
                            isProvisioning={isProvisioning && !hasConnections}
                            errorMessage={guideError}
                        />
                    }
                />
            </div>
        </div>
    )
}