// src/components/LabInstance/Trainee/InstanceRun/hooks/useLabPolling.ts
import { useRef, useCallback, useEffect } from "react"
import type { LabInstanceRuntimeResponse } from "@/types/LabInstance/Trainee/LabRuntime"

const POLL_INTERVAL_MS = 30_000

interface PollingOptions {
    instanceId: string | undefined
    isBootstrapping: boolean
    hasConnections: boolean
    onRefresh: (data: LabInstanceRuntimeResponse) => void
    refreshFn: (id: string) => Promise<LabInstanceRuntimeResponse>
}

export function useLabPolling({
    instanceId,
    isBootstrapping,
    hasConnections,
    onRefresh,
    refreshFn,
}: PollingOptions) {
    const inFlightRef = useRef(false)
    const isMountedRef = useRef(true)
    const pollTimerRef = useRef<number | null>(null)

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
            stopPolling()
        }
    }, [])

    const stopPolling = useCallback(() => {
        if (pollTimerRef.current !== null) {
            window.clearInterval(pollTimerRef.current)
            pollTimerRef.current = null
        }
    }, [])

    const tick = useCallback(async () => {
        if (!instanceId || inFlightRef.current) return
        inFlightRef.current = true

        try {
            const fresh = await refreshFn(instanceId)
            if (!isMountedRef.current) return
            onRefresh(fresh)
        } catch {
            // Silent fail on background poll
        } finally {
            inFlightRef.current = false
        }
    }, [instanceId, refreshFn, onRefresh])

    useEffect(() => {
        if (!instanceId || isBootstrapping) return
        if (hasConnections) return // ← STOP polling once connections ready

        tick()
        pollTimerRef.current = window.setInterval(tick, POLL_INTERVAL_MS)

        return stopPolling
    }, [instanceId, isBootstrapping, hasConnections, tick, stopPolling])

    const manualRefresh = useCallback(async () => {
        if (!instanceId || inFlightRef.current) return
        inFlightRef.current = true
        try {
            const fresh = await refreshFn(instanceId)
            if (isMountedRef.current) onRefresh(fresh)
        } finally {
            inFlightRef.current = false
        }
    }, [instanceId, refreshFn, onRefresh])

    return { manualRefresh, isRefreshing: inFlightRef.current, stopPolling }
}