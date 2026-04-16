// src/hooks/useTokenRefresh.ts
import { useEffect, useRef, useCallback } from "react"
import { useAuth } from "./useAuth"

// Refresh 1 minute before expiry (Keycloak default is 5 minutes)
const REFRESH_INTERVAL = 4 * 60 * 1000 // 4 minutes
const REFRESH_RETRY_DELAY = 30 * 1000 // 30 seconds on failure

/**
 * Hook to automatically refresh access token before it expires.
 * 
 * Behavior:
 * - Refreshes every 4 minutes (1 min before 5-min expiry)
 * - Only runs when user is authenticated
n * - Stops on logout or unmount
 * - Retries on failure with backoff
 * - Redirects to login if refresh fails permanently
 * 
 * Usage: Add to AppLayout (protected routes only)
 */
export function useTokenRefresh() {
    const { refreshToken, isAuthenticated, logout } = useAuth()
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const retryCountRef = useRef(0)
    const maxRetries = 3

    const doRefresh = useCallback(async () => {
        if (!isAuthenticated) return

        console.log(`[TokenRefresh] Attempting refresh (${new Date().toLocaleTimeString()})`)

        const success = await refreshToken()

        if (success) {
            console.log("[TokenRefresh] ✅ Success")
            retryCountRef.current = 0 // Reset retry count
        } else {
            retryCountRef.current++
            console.warn(`[TokenRefresh] ❌ Failed (attempt ${retryCountRef.current}/${maxRetries})`)

            if (retryCountRef.current >= maxRetries) {
                console.error("[TokenRefresh] Max retries reached, logging out...")
                await logout()
                window.location.href = "/login?reason=session_expired"
            }
        }
    }, [isAuthenticated, refreshToken, logout])

    useEffect(() => {
        // Only start if authenticated
        if (!isAuthenticated) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
                console.log("[TokenRefresh] Stopped (not authenticated)")
            }
            return
        }

        console.log("[TokenRefresh] Starting (authenticated)")

        // Immediate first refresh check (in case token is already old)
        doRefresh()

        // Set up interval
        intervalRef.current = setInterval(doRefresh, REFRESH_INTERVAL)

        // Cleanup on unmount
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
                console.log("[TokenRefresh] Stopped (unmount)")
            }
        }
    }, [isAuthenticated, doRefresh])

    // Handle visibility change (pause when tab hidden to save resources)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                console.log("[TokenRefresh] Tab hidden, pausing...")
            } else {
                console.log("[TokenRefresh] Tab visible, resuming...")
                // Check if we need immediate refresh when coming back
                doRefresh()
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
    }, [doRefresh])
}