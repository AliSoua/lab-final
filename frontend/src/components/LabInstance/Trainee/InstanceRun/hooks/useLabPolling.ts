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

    // Keep latest callbacks in refs so tick() never changes identity
    const onRefreshRef = useRef(onRefresh)
    const refreshFnRef = useRef(refreshFn)
    useEffect(() => {
        onRefreshRef.current = onRefresh
        refreshFnRef.current = refreshFn
    })

    const stopPolling = useCallback(() => {
        if (pollTimerRef.current !== null) {
            window.clearInterval(pollTimerRef.current)
            pollTimerRef.current = null
        }
    }, [])

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
            stopPolling()
        }
    }, [stopPolling])

    const tick = useCallback(async () => {
        if (!instanceId || inFlightRef.current) return
        inFlightRef.current = true

        try {
            const fresh = await refreshFnRef.current(instanceId)
            if (!isMountedRef.current) return
            onRefreshRef.current(fresh)
        } catch {
            // Silent fail on background poll
        } finally {
            inFlightRef.current = false
        }
    }, [instanceId]) // ← ONLY depends on instanceId

    useEffect(() => {
        if (!instanceId || isBootstrapping) return
        if (hasConnections) return // stop polling once connections ready

        tick()
        pollTimerRef.current = window.setInterval(tick, POLL_INTERVAL_MS)

        return stopPolling
    }, [instanceId, isBootstrapping, hasConnections, tick, stopPolling])

    const manualRefresh = useCallback(async () => {
        if (!instanceId || inFlightRef.current) return
        inFlightRef.current = true
        try {
            const fresh = await refreshFnRef.current(instanceId)
            if (isMountedRef.current) onRefreshRef.current(fresh)
            return fresh
        } finally {
            inFlightRef.current = false
        }
    }, [instanceId])

    return { manualRefresh, isRefreshing: inFlightRef.current, stopPolling }
}