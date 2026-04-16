// src/hooks/useAuth.tsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef
} from "react"

import type { User, LoginResponse, CheckAuthResponse, TokenResponse } from "@/types"

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

// Token refresh configuration
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000 // 4 minutes (1 min before 5-min expiry)
const TOKEN_REFRESH_RETRY_DELAY = 30 * 1000 // 30 seconds on failure
const MAX_REFRESH_RETRIES = 3

interface AuthContextType {
    user: User | null
    isLoading: boolean
    isAuthenticated: boolean
    login: (username: string, password: string) => Promise<boolean>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    // Token refresh refs
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const retryCountRef = useRef(0)
    const isRefreshingRef = useRef(false)

    // Decode JWT payload (no verification)
    const decodeToken = (token: string): any => {
        try {
            const parts = token.split(".")
            if (parts.length !== 3) return null

            const payload = parts[1]
            const padded =
                payload + "=".repeat((4 - (payload.length % 4)) % 4)

            return JSON.parse(atob(padded))
        } catch {
            return null
        }
    }

    // Extract roles
    const extractRoles = (token: string): string[] => {
        const payload = decodeToken(token)
        return payload?.realm_access?.roles || []
    }

    // REFRESH TOKEN function
    const performRefresh = useCallback(async (): Promise<boolean> => {
        if (isRefreshingRef.current) {
            console.log("[Auth] Refresh already in progress, skipping...")
            return false
        }

        const refreshToken = localStorage.getItem("refresh_token")
        if (!refreshToken) {
            console.log("[Auth] No refresh token available")
            return false
        }

        isRefreshingRef.current = true
        console.log(`[Auth] Refreshing token (${new Date().toLocaleTimeString()})`)

        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({ refresh_token: refreshToken })
            })

            if (!response.ok) {
                throw new Error(`Refresh failed: ${response.status}`)
            }

            const data: TokenResponse = await response.json()
            localStorage.setItem("access_token", data.access_token)
            localStorage.setItem("refresh_token", data.refresh_token)

            retryCountRef.current = 0
            console.log("[Auth] ✅ Token refreshed successfully")
            return true
        } catch (error) {
            console.error("[Auth] ❌ Token refresh failed:", error)
            return false
        } finally {
            isRefreshingRef.current = false
        }
    }, [])

    // Setup token refresh interval
    const startTokenRefresh = useCallback(() => {
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current)
        }

        console.log("[Auth] Starting token refresh interval (4 minutes)")

        // Immediate first refresh
        performRefresh()

        // Set up interval
        refreshIntervalRef.current = setInterval(async () => {
            const success = await performRefresh()

            if (!success) {
                retryCountRef.current++
                console.warn(`[Auth] Refresh failed (attempt ${retryCountRef.current}/${MAX_REFRESH_RETRIES})`)

                if (retryCountRef.current >= MAX_REFRESH_RETRIES) {
                    console.error("[Auth] Max retries reached, logging out...")
                    await logout()
                    window.location.href = "/login?reason=session_expired"
                }
            } else {
                retryCountRef.current = 0
            }
        }, TOKEN_REFRESH_INTERVAL)
    }, [performRefresh])

    // Stop token refresh
    const stopTokenRefresh = useCallback(() => {
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current)
            refreshIntervalRef.current = null
            console.log("[Auth] Stopped token refresh")
        }
    }, [])

    // Check auth on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("access_token")

            if (!token) {
                setIsLoading(false)
                return
            }

            try {
                const response = await fetch(`${API_BASE_URL}/auth/check`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json"
                    }
                })

                if (!response.ok) {
                    throw new Error("Invalid token")
                }

                const data: CheckAuthResponse = await response.json()

                if (data.logged_in) {
                    const roles = extractRoles(token)
                    const primaryRole =
                        roles.find((r) =>
                            ["admin", "moderator", "trainee"].includes(r)
                        ) || "trainee"

                    setUser({
                        id: data.user.sub,
                        sub: data.user.sub,
                        username: data.user.preferred_username,
                        email: data.user.email,
                        fullName: data.user.name,
                        firstName: data.user.given_name,
                        lastName: data.user.family_name,
                        role: primaryRole as User["role"],
                        emailVerified: data.user.email_verified
                    })

                    setIsAuthenticated(true)
                    // ✅ Start refresh for ALL authenticated users
                    startTokenRefresh()
                } else {
                    // Token invalid, clear it
                    localStorage.removeItem("access_token")
                    localStorage.removeItem("refresh_token")
                }
            } catch (error) {
                console.error("Auth check failed:", error)
                localStorage.removeItem("access_token")
                localStorage.removeItem("refresh_token")
            } finally {
                setIsLoading(false)
            }
        }

        checkAuth()

        // Cleanup on unmount
        return () => {
            stopTokenRefresh()
        }
    }, [startTokenRefresh, stopTokenRefresh])

    // Handle visibility change (refresh when tab becomes visible after being hidden)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && isAuthenticated) {
                console.log("[Auth] Tab visible, checking token...")
                performRefresh()
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
    }, [isAuthenticated, performRefresh])

    // LOGIN
    const login = useCallback(
        async (username: string, password: string): Promise<boolean> => {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json"
                    },
                    body: JSON.stringify({ username, password })
                })

                if (!response.ok) return false

                const data: LoginResponse = await response.json()

                localStorage.setItem("access_token", data.access_token)
                localStorage.setItem("refresh_token", data.refresh_token)

                const checkResponse = await fetch(`${API_BASE_URL}/auth/check`, {
                    headers: {
                        Authorization: `Bearer ${data.access_token}`,
                        Accept: "application/json"
                    }
                })

                if (!checkResponse.ok) return false

                const userData: CheckAuthResponse = await checkResponse.json()

                const roles = extractRoles(data.access_token)
                const primaryRole =
                    roles.find((r) =>
                        ["admin", "moderator", "trainee"].includes(r)
                    ) || "trainee"

                setUser({
                    id: userData.user.sub,
                    sub: userData.user.sub,
                    username: userData.user.preferred_username,
                    email: userData.user.email,
                    fullName: userData.user.name,
                    firstName: userData.user.given_name,
                    lastName: userData.user.family_name,
                    role: primaryRole as User["role"],
                    emailVerified: userData.user.email_verified
                })

                setIsAuthenticated(true)

                // ✅ Start refresh after login for ALL users
                startTokenRefresh()

                return true
            } catch (error) {
                console.error("Login failed:", error)
                return false
            }
        },
        [startTokenRefresh]
    )

    // LOGOUT
    const logout = useCallback(async () => {
        // Stop refresh first
        stopTokenRefresh()

        const token = localStorage.getItem("access_token")
        const refreshToken = localStorage.getItem("refresh_token")

        if (token) {
            try {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ refresh_token: refreshToken })
                })
            } catch (error) {
                console.error("Logout error:", error)
            }
        }

        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")

        setUser(null)
        setIsAuthenticated(false)
        retryCountRef.current = 0
    }, [stopTokenRefresh])

    return (
        <AuthContext.Provider
            value={{ user, isLoading, isAuthenticated, login, logout }}
        >
            {children}
        </AuthContext.Provider>
    )
}

// Hook
export function useAuth() {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }

    return context
}