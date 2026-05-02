// src/components/LabInstance/Trainee/InstanceRun/hooks/useLabCountdown.ts
import { useState, useEffect, useCallback, useRef } from "react"

const WARNING_MINUTES = 5
const CRITICAL_MINUTES = 1

export interface CountdownState {
    timeRemainingMs: number | null
    isExpired: boolean
    minutesRemaining: number | null
    formattedTime: string | null
    showWarning: boolean
}

export interface CountdownActions {
    dismissWarning: () => void
    reset: () => void
}

export function useLabCountdown(
    expiresAt: string | null,
    enabled: boolean = true
): [CountdownState, CountdownActions] {
    const [timeRemainingMs, setTimeRemainingMs] = useState<number | null>(null)
    const [isExpired, setIsExpired] = useState(false)
    const [showWarning, setShowWarning] = useState(false)

    const hasWarned5MinRef = useRef(false)
    const hasWarned1MinRef = useRef(false)
    const timerRef = useRef<number | null>(null)
    const frozenExpiresAtRef = useRef<string | null>(null)

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [])

    // Freeze expiresAt on first valid value — never update from subsequent refreshes
    useEffect(() => {
        if (expiresAt && !frozenExpiresAtRef.current) {
            frozenExpiresAtRef.current = expiresAt
        }
    }, [expiresAt])

    // Reset warning flags when explicitly disabled then re-enabled
    useEffect(() => {
        if (!enabled) {
            hasWarned5MinRef.current = false
            hasWarned1MinRef.current = false
            setShowWarning(false)
            setIsExpired(false)
            setTimeRemainingMs(null)
            clearTimer()
        }
    }, [enabled, clearTimer])

    useEffect(() => {
        if (!enabled || !frozenExpiresAtRef.current) {
            setTimeRemainingMs(null)
            setIsExpired(false)
            setShowWarning(false)
            clearTimer()
            return
        }

        const tick = () => {
            const expiry = new Date(frozenExpiresAtRef.current!).getTime()
            const now = Date.now()
            const remaining = expiry - now

            if (remaining <= 0) {
                setTimeRemainingMs(0)
                setIsExpired(true)
                setShowWarning(false)
                clearTimer()
                return
            }

            setTimeRemainingMs(remaining)

            const mins = remaining / 60000

            if (mins <= CRITICAL_MINUTES && !hasWarned1MinRef.current) {
                setShowWarning(true)
                hasWarned1MinRef.current = true
            } else if (mins <= WARNING_MINUTES && !hasWarned5MinRef.current) {
                setShowWarning(true)
                hasWarned5MinRef.current = true
            }
        }

        tick()
        timerRef.current = window.setInterval(tick, 1000)

        return clearTimer
    }, [enabled, clearTimer])

    const formattedTime = formatCountdownTime(timeRemainingMs)

    const dismissWarning = useCallback(() => setShowWarning(false), [])
    const reset = useCallback(() => {
        frozenExpiresAtRef.current = null
        hasWarned5MinRef.current = false
        hasWarned1MinRef.current = false
        setShowWarning(false)
        setIsExpired(false)
        setTimeRemainingMs(null)
    }, [])

    return [
        {
            timeRemainingMs,
            isExpired,
            minutesRemaining: timeRemainingMs !== null ? Math.ceil(timeRemainingMs / 60000) : null,
            formattedTime,
            showWarning,
        },
        { dismissWarning, reset }
    ]
}

function formatCountdownTime(ms: number | null): string | null {
    if (ms === null) return null
    if (ms <= 0) return "Expired"

    const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60

    const ss = s.toString().padStart(2, "0")

    if (h > 0) {
        const mm = m.toString().padStart(2, "0")
        return `${h}:${mm}:${ss}`
    }

    return `${m}:${ss}`
}