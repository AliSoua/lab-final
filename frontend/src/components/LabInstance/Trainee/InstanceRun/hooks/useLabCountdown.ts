// src/components/LabInstance/Trainee/InstanceRun/hooks/useLabCountdown.ts
import { useState, useEffect, useCallback, useRef } from "react"

const WARNING_MINUTES = 5
const CRITICAL_MINUTES = 1

export interface CountdownState {
    timeRemainingMs: number | null
    isExpired: boolean
    minutesRemaining: number | null
    formattedTime: string | null
    showWarning: boolean  // ← ADDED
}

export interface CountdownActions {
    dismissWarning: () => void
    reset: () => void
}

export function useLabCountdown(expiresAt: string | null): [CountdownState, CountdownActions] {
    const [timeRemainingMs, setTimeRemainingMs] = useState<number | null>(null)
    const [isExpired, setIsExpired] = useState(false)
    const [showWarning, setShowWarning] = useState(false)  // ← ADDED state
    const [hasWarned5Min, setHasWarned5Min] = useState(false)
    const [hasWarned1Min, setHasWarned1Min] = useState(false)
    const timerRef = useRef<number | null>(null)

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [])

    useEffect(() => {
        if (!expiresAt) {
            setTimeRemainingMs(null)
            setIsExpired(false)
            setShowWarning(false)  // ← Reset warning
            return
        }

        const tick = () => {
            const expiry = new Date(expiresAt).getTime()
            const now = Date.now()
            const remaining = expiry - now

            if (remaining <= 0) {
                setTimeRemainingMs(0)
                setIsExpired(true)
                setShowWarning(false)  // ← Hide warning when expired
                clearTimer()
                return
            }

            setTimeRemainingMs(remaining)
            setIsExpired(false)

            const mins = Math.ceil(remaining / 60000)
            if (mins <= CRITICAL_MINUTES && !hasWarned1Min) {
                setShowWarning(true)
                setHasWarned1Min(true)
            } else if (mins <= WARNING_MINUTES && !hasWarned5Min) {
                setShowWarning(true)
                setHasWarned5Min(true)
            }
        }

        tick()
        timerRef.current = window.setInterval(tick, 1000)

        return clearTimer
    }, [expiresAt, hasWarned5Min, hasWarned1Min, clearTimer])

    const formattedTime = useFormatTime(timeRemainingMs)

    const dismissWarning = useCallback(() => setShowWarning(false), [])
    const reset = useCallback(() => {
        setHasWarned5Min(false)
        setHasWarned1Min(false)
        setShowWarning(false)
        setIsExpired(false)
    }, [])

    return [
        {
            timeRemainingMs,
            isExpired,
            minutesRemaining: timeRemainingMs ? Math.ceil(timeRemainingMs / 60000) : null,
            formattedTime,
            showWarning,  // ← INCLUDED in return
        },
        { dismissWarning, reset }
    ]
}

function useFormatTime(ms: number | null): string | null {
    if (ms === null) return null
    if (ms <= 0) return "Expired"

    const totalSeconds = Math.floor(ms / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60

    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
}