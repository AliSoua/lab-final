// src/components/LabInstance/Trainee/InstanceRun/hooks/useLabPolling.ts
import { useRef, useCallback, useEffect, useState } from "react"
import type { LabInstanceRuntimeResponse } from "@/types/LabInstance/Trainee/LabRuntime"

const POLL_INTERVAL_MS = 30_000
const POLL_INTERVAL_WITH_CONNECTIONS_MS = 60_000

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
    const [isRefreshing, setIsRefreshing] = useState(false)

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
        setIsRefreshing(true)

        try {
            const fresh = await refreshFnRef.current(instanceId)
            if (!isMountedRef.current) return
            onRefreshRef.current(fresh)
        } catch {
            // Silent fail on background poll
        } finally {
            inFlightRef.current = false
            if (isMountedRef.current) setIsRefreshing(false)
        }
    }, [instanceId])

    useEffect(() => {
        if (!instanceId || isBootstrapping) return

        // Run immediately
        tick()

        // Use slower interval when connections are established to reduce load
        // but keep polling for status/expiry updates
        const interval = hasConnections ? POLL_INTERVAL_WITH_CONNECTIONS_MS : POLL_INTERVAL_MS
        pollTimerRef.current = window.setInterval(tick, interval)

        return stopPolling
    }, [instanceId, isBootstrapping, hasConnections, tick, stopPolling])

    const manualRefresh = useCallback(async () => {
        if (!instanceId || inFlightRef.current) return
        inFlightRef.current = true
        setIsRefreshing(true)
        try {
            const fresh = await refreshFnRef.current(instanceId)
            if (isMountedRef.current) onRefreshRef.current(fresh)
            return fresh
        } finally {
            inFlightRef.current = false
            if (isMountedRef.current) setIsRefreshing(false)
        }
    }, [instanceId])

    return { manualRefresh, isRefreshing, stopPolling }
}