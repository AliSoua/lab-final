import { useEffect, useRef, useState } from "react"
import Guacamole from "guacamole-common-js"
import { Loader2, AlertCircle } from "lucide-react"

interface GuacamoleClientProps {
    connectionId: string | null
    title: string
    isProvisioning: boolean
    errorMessage?: string | null
}

function getGuacWebSocketUrl(): string {
    const raw = import.meta.env.VITE_GUACAMOLE_WS_URL as string | undefined
    if (raw && (raw.startsWith("ws://") || raw.startsWith("wss://"))) {
        return raw
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = window.location.host
    const path = raw ? (raw.startsWith("/") ? raw : `/${raw}`) : "/guacamole"
    return `${protocol}//${host}${path}`
}

const GUAC_WS_BASE = getGuacWebSocketUrl()

export default function GuacamoleClient({
    connectionId,
    title,
    isProvisioning,
    errorMessage,
}: GuacamoleClientProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const clientRef = useRef<Guacamole.Client | null>(null)
    const tunnelRef = useRef<Guacamole.WebSocketTunnel | null>(null)
    const mouseRef = useRef<Guacamole.Mouse | null>(null)
    const keyboardRef = useRef<Guacamole.Keyboard | null>(null)
    const resizeObserverRef = useRef<ResizeObserver | null>(null)
    const isMouseOverRef = useRef(false)

    const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting")
    const [error, setError] = useState<string | null>(null)
    const [guacToken, setGuacToken] = useState<string | null>(null)
    const [tokenError, setTokenError] = useState<string | null>(null)

    // ── Fetch Guacamole token ────────────────────────────────────────────
    useEffect(() => {
        if (!connectionId) return

        const initToken = async () => {
            setTokenError(null)
            let token = localStorage.getItem("guacamole_token")
            const tokenExpiry = localStorage.getItem("guacamole_token_expiry")

            // Invalidate cached token if expired (Guacamole tokens last ~24h, we check 1h)
            if (token && tokenExpiry && Date.now() > parseInt(tokenExpiry, 10)) {
                token = null
                localStorage.removeItem("guacamole_token")
                localStorage.removeItem("guacamole_token_expiry")
            }

            if (!token) {
                try {
                    const res = await fetch("/guacamole/api/tokens", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: "username=sso&password=sso",
                    })
                    if (!res.ok) {
                        throw new Error(`Token fetch failed: ${res.status} ${res.statusText}`)
                    }
                    const data = await res.json()
                    token = data.authToken ?? data.token ?? null
                    if (token) {
                        localStorage.setItem("guacamole_token", token)
                        localStorage.setItem("guacamole_token_expiry", String(Date.now() + 3600000))
                    } else {
                        throw new Error("No token in response")
                    }
                } catch (e) {
                    const msg = e instanceof Error ? e.message : "Failed to fetch Guacamole token"
                    console.error("[Guacamole] Token fetch failed:", e)
                    setTokenError(msg)
                    return
                }
            }
            setGuacToken(token)
        }

        initToken()
    }, [connectionId])

    // ── Establish WebSocket tunnel ───────────────────────────────────────
    useEffect(() => {
        if (!connectionId || !containerRef.current || guacToken === null) return
        if (tokenError) return

        setStatus("connecting")
        setError(null)

        const tunnel = new Guacamole.WebSocketTunnel(
            `${GUAC_WS_BASE}/websocket-tunnel`
        )
        tunnelRef.current = tunnel

        const client = new Guacamole.Client(tunnel)
        clientRef.current = client

        // Attach display
        const display = client.getDisplay().getElement()
        display.style.width = "100%"
        display.style.height = "100%"
        display.tabIndex = -1 // Make focusable for keyboard
        containerRef.current.innerHTML = ""
        containerRef.current.appendChild(display)

        // Mouse — bound to display element
        const mouse = new Guacamole.Mouse(display)
        mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (state: any) => {
            client.sendMouseState(state)
        }
        mouseRef.current = mouse

        // Track mouse hover for keyboard filtering
        const onMouseEnter = () => { isMouseOverRef.current = true }
        const onMouseLeave = () => { isMouseOverRef.current = false }
        display.addEventListener("mouseenter", onMouseEnter)
        display.addEventListener("mouseleave", onMouseLeave)
        display.addEventListener("click", () => display.focus())

        // Keyboard — bound to document but filtered by mouse hover
        // This prevents typing in the guide panel from sending keystrokes to the VM
        const keyboard = new Guacamole.Keyboard(document)
        keyboard.onkeydown = (keysym: number) => {
            if (isMouseOverRef.current) client.sendKeyEvent(1, keysym)
        }
        keyboard.onkeyup = (keysym: number) => {
            if (isMouseOverRef.current) client.sendKeyEvent(0, keysym)
        }
        keyboardRef.current = keyboard

        // State changes
        client.onstatechange = (state: number) => {
            // Guacamole states: 0=idle, 1=connecting, 2=waiting, 3=connected, 4=disconnecting, 5=disconnected
            if (state === 3) {
                setStatus("connected")
            } else if (state === 4 || state === 5) {
                setError(state === 4 ? "Session disconnecting" : "Disconnected from session")
                setStatus("error")
            }
        }

        client.onerror = (err: any) => {
            const msg = err?.message || "Connection failed"
            setError(msg)
            setStatus("error")
        }

        // Tunnel-level errors — CRITICAL for catching protocol rejections
        tunnel.onerror = (status: any) => {
            const msg = typeof status === "number"
                ? `Tunnel error (HTTP ${status})`
                : (status?.message || "Tunnel connection failed — check connection ID format")
            setError(msg)
            setStatus("error")
        }

        // Resize observer — sends display size to Guacamole when container changes
        const resizeObserver = new ResizeObserver((entries) => {
            if (!clientRef.current) return
            for (const entry of entries) {
                const { width, height } = entry.contentRect
                if (width > 0 && height > 0) {
                    clientRef.current.sendSize(Math.round(width), Math.round(height))
                }
            }
        })
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }
        resizeObserverRef.current = resizeObserver

        // ── THE FIX: Use id=c/<connectionId> not connection=<connectionId> ──
        client.connect(`token=${guacToken}&id=c/${connectionId}`)

        return () => {
            // Cleanup resize observer
            resizeObserver.disconnect()
            resizeObserverRef.current = null

            // Cleanup mouse hover listeners
            display.removeEventListener("mouseenter", onMouseEnter)
            display.removeEventListener("mouseleave", onMouseLeave)

            // Cleanup keyboard
            if (keyboardRef.current) {
                keyboardRef.current.onkeydown = null
                keyboardRef.current.onkeyup = null
                keyboardRef.current = null
            }

            // Cleanup mouse
            if (mouseRef.current) {
                mouseRef.current.onmousedown = null
                mouseRef.current.onmouseup = null
                mouseRef.current.onmousemove = null
                mouseRef.current = null
            }

            // Disconnect client (also disconnects tunnel)
            if (clientRef.current) {
                clientRef.current.disconnect()
                clientRef.current = null
            }

            tunnelRef.current = null

            // Clear container
            if (containerRef.current) {
                containerRef.current.innerHTML = ""
            }
        }
    }, [connectionId, guacToken, tokenError])

    if (isProvisioning) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f9f9f9]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#1ca9b1]" />
                    <p className="text-[13px] text-[#727373]">Provisioning VM...</p>
                </div>
            </div>
        )
    }

    if (tokenError || error) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f9f9f9] p-6">
                <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                    <p className="text-[13px] text-red-700">{tokenError || error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-[12px] font-medium text-white hover:bg-red-700"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="relative h-full w-full bg-black">
            <div ref={containerRef} className="h-full w-full" />
            {status === "connecting" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                        <span className="text-[12px] text-white/80">Connecting...</span>
                    </div>
                </div>
            )}
            <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white/80">
                {title}
            </div>
            {errorMessage && (
                <div className="absolute top-2 right-2 max-w-xs rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    Guide load failed: {errorMessage}
                </div>
            )}
        </div>
    )
}