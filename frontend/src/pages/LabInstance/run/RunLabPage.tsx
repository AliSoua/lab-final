// src/pages/LabInstance/run/RunLabPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
    AlertCircle,
    ArrowLeft,
    Loader2,
    Monitor,
    Terminal,
    WifiOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLabInstance } from "@/hooks/LabInstance/useLabInstance"
import { ResizableSplit } from "@/components/LabGuide/PreviewGuideLab/ResizableSplit"
import { GuacamoleConsole } from "@/components/LabInstance/run/GuacamoleConsole"
import { RunLabConnectionsPanel } from "@/components/LabInstance/run/RunLabConnectionsPanel"
import type { LabInstance } from "@/types/LabInstance/LabInstance"

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

const POLL_INTERVAL_MS = 10_000

// Silent refresh — triggers backend vCenter sync + Guacamole connection
// creation without the toast noise that useLabInstance.refreshInstanceStatus
// surfaces on every call.
async function silentRefresh(instanceId: string): Promise<LabInstance | null> {
    const token = localStorage.getItem("access_token")
    if (!token) return null
    try {
        const res = await fetch(
            `${API_BASE_URL}/lab-definitions/lab-instances/${instanceId}/refresh`,
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
    const activeKeyRef = useRef<string | null>(null)

    useEffect(() => {
        activeKeyRef.current = activeKey
    }, [activeKey])

    // Initial fetch (uses hook so auth errors are toasted)
    useEffect(() => {
        let cancelled = false
        if (!instanceId) return
            ; (async () => {
                try {
                    const data = await getInstance(instanceId)
                    if (!cancelled) {
                        setInstance(data)
                    }
                } catch (err) {
                    if (!cancelled) {
                        setLoadError(
                            err instanceof Error ? err.message : "Failed to load instance",
                        )
                    }
                } finally {
                    if (!cancelled) setIsInitialLoading(false)
                }
            })()
        return () => {
            cancelled = true
        }
    }, [instanceId, getInstance])

    // Poll silently until we have connections or the instance stops.
    useEffect(() => {
        if (!instanceId || !instance) return
        if (["terminated", "stopped"].includes(instance.status)) return
        const hasConnections =
            !!instance.guacamole_connections &&
            Object.keys(instance.guacamole_connections).length > 0
        if (hasConnections && instance.status === "running") return

        const tick = async () => {
            const fresh = await silentRefresh(instanceId)
            if (fresh) setInstance(fresh)
        }
        const id = window.setInterval(tick, POLL_INTERVAL_MS)
        // Kick one off immediately so provisioning completes promptly.
        tick()
        return () => window.clearInterval(id)
    }, [instanceId, instance])

    const connectionEntries = useMemo(() => {
        if (!instance?.guacamole_connections) return []
        return Object.entries(instance.guacamole_connections)
    }, [instance])

    // Default the active connection to the first available once connections
    // appear, and keep it valid if the map changes.
    useEffect(() => {
        if (connectionEntries.length === 0) return
        const keys = connectionEntries.map(([k]) => k)
        if (!activeKeyRef.current || !keys.includes(activeKeyRef.current)) {
            setActiveKey(keys[0])
        }
    }, [connectionEntries])

    const activeConnectionId = useMemo(() => {
        if (!activeKey || !instance?.guacamole_connections) return null
        return instance.guacamole_connections[activeKey] ?? null
    }, [activeKey, instance])

    const isProvisioning = instance?.status === "provisioning"
    const hasConnections = connectionEntries.length > 0

    if (isInitialLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f9f9f9]">
                <Loader2 className="h-8 w-8 animate-spin text-[#1ca9b1]" />
            </div>
        )
    }

    if (loadError || !instance) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f9f9f9] p-6">
                <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-[16px] font-semibold text-red-900">
                            Unable to load lab instance
                        </h2>
                        <p className="mt-1 text-[13px] text-red-700">
                            {loadError || "Instance not found."}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/labs")}
                        className={cn(
                            "flex items-center gap-2 rounded-lg bg-[#1ca9b1] px-4 py-2",
                            "text-[13px] font-medium text-white hover:bg-[#17959c] transition",
                        )}
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
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e8e8e8] bg-white px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => navigate(`/lab-instances/${instance.id}`)}
                        className={cn(
                            "flex items-center gap-1.5 text-[12px] font-medium text-[#727373]",
                            "hover:text-[#1ca9b1] transition-colors",
                        )}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Instance Details
                    </button>
                    <span className="text-[#c4c4c4]">•</span>
                    <h1 className="text-[15px] font-semibold text-[#3a3a3a] truncate">
                        {headerTitle}
                    </h1>
                    <span
                        className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                            instance.status === "running"
                                ? "bg-emerald-50 text-emerald-700"
                                : instance.status === "provisioning"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-50 text-slate-700",
                        )}
                    >
                        {instance.status}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[#727373]">
                    {instance.ip_address ? (
                        <>
                            <Terminal className="h-3.5 w-3.5" />
                            <span className="font-mono">{instance.ip_address}</span>
                        </>
                    ) : (
                        <>
                            <WifiOff className="h-3.5 w-3.5" />
                            <span>No IP yet</span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {hasConnections && activeConnectionId ? (
                    <ResizableSplit
                        left={
                            <RunLabConnectionsPanel
                                instance={instance}
                                entries={connectionEntries}
                                activeKey={activeKey}
                                onSelect={setActiveKey}
                            />
                        }
                        right={
                            <GuacamoleConsole
                                connectionId={activeConnectionId}
                                title={activeEntry ? activeEntry[0] : "Console"}
                                subtitle={instance.ip_address || undefined}
                            />
                        }
                        defaultLeftWidth={35}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center p-6">
                        <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-dashed border-[#e8e8e8] bg-white p-8 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                                {isProvisioning ? (
                                    <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                                ) : (
                                    <Monitor className="h-6 w-6 text-amber-600" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-[15px] font-semibold text-[#3a3a3a]">
                                    {isProvisioning
                                        ? "Preparing your lab..."
                                        : "No remote connections available"}
                                </h2>
                                <p className="mt-1 text-[13px] text-[#727373]">
                                    {isProvisioning
                                        ? "The VM is booting and receiving a network address. Guacamole sessions will appear here automatically."
                                        : "This instance has no Guacamole connections yet."}
                                </p>
                            </div>
                            {isProvisioning && (
                                <div className="flex items-center gap-2 text-[11px] text-[#727373]">
                                    <Loader2 className="h-3 w-3 animate-spin text-[#1ca9b1]" />
                                    Polling every {POLL_INTERVAL_MS / 1000} seconds
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
