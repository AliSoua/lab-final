// src/hooks/LabInstance/Trainee/useLabInstanceEvents.ts
import { useState, useEffect, useRef, useCallback } from "react"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface LabInstanceEvent {
    id: string
    task_id: string
    lab_instance_id: string
    event_type: string
    event_code: string
    source: string
    severity: "info" | "warning" | "error" | "critical"
    message: string
    metadata: Record<string, unknown>
    created_at: string
}

export type ProvisioningStage =
    | "validated"
    | "vcenter_discovered"
    | "vm_cloned"
    | "vm_powered_on"
    | "ip_discovered"
    | "guacamole_connected"
    | "finalized"
    | null

interface UseLabInstanceEventsReturn {
    latestEvent: LabInstanceEvent | null
    provisioningMessage: string
    provisioningStage: ProvisioningStage
    isConnected: boolean
    isReady: boolean
    hasFailed: boolean
    failureMessage: string | null
    error: string | null
    close: () => void
}

const STAGE_MESSAGES: Record<string, string> = {
    validated: "Validating lab configuration...",
    vcenter_discovered: "Discovering vCenter...",
    vm_cloned: "Cloning virtual machine...",
    vm_powered_on: "Powering on virtual machine...",
    ip_discovered: "Discovering network address...",
    guacamole_connected: "Setting up remote connections...",
    finalized: "Finalizing lab environment...",
}

export function useLabInstanceEvents(
    instanceId: string | undefined,
    enabled: boolean
): UseLabInstanceEventsReturn {
    const [latestEvent, setLatestEvent] = useState<LabInstanceEvent | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const [hasFailed, setHasFailed] = useState(false)
    const [failureMessage, setFailureMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [provisioningStage, setProvisioningStage] = useState<ProvisioningStage>(null)

    const eventSourceRef = useRef<EventSource | null>(null)

    const close = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
            setIsConnected(false)
        }
    }, [])

    useEffect(() => {
        if (!instanceId || !enabled) {
            close()
            return
        }

        const url = `${API_BASE_URL}/lab-instances/${instanceId}/events`
        const es = new EventSource(url, {
            withCredentials: true,  // ← Sends cookies (access_token) automatically
        })

        eventSourceRef.current = es

        es.onopen = () => {
            setIsConnected(true)
            setError(null)
        }

        es.onmessage = (e) => {
            if (e.data.startsWith(":")) return

            try {
                const event: LabInstanceEvent = JSON.parse(e.data)
                setLatestEvent(event)

                if (event.event_type === "stage_persisted" && event.metadata?.stage) {
                    setProvisioningStage(event.metadata.stage as ProvisioningStage)
                }

                if (event.event_code === "INSTANCE_RUNNING") {
                    setIsReady(true)
                    setProvisioningStage("finalized")
                }

                if (event.event_code === "TASK_FAILED" || event.event_code === "INSTANCE_FAILED") {
                    setHasFailed(true)
                    setFailureMessage(event.message)
                }
            } catch {
                // Ignore malformed
            }
        }

        es.onerror = () => {
            setIsConnected(false)
            // EventSource auto-reconnects. If it stays down, the caller
            // can detect via isConnected + isReady + hasFailed state.
        }

        return () => {
            es.close()
            eventSourceRef.current = null
        }
    }, [instanceId, enabled, close])

    const provisioningMessage = latestEvent
        ? (STAGE_MESSAGES[provisioningStage ?? ""] ?? latestEvent.message)
        : "Initializing lab environment..."

    return {
        latestEvent,
        provisioningMessage,
        provisioningStage,
        isConnected,
        isReady,
        hasFailed,
        failureMessage,
        error,
        close,
    }
}