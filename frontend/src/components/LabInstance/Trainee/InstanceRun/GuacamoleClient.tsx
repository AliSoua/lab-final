// src/components/LabInstance/Trainee/InstanceRun/GuacamoleClient.tsx
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

    // If it's already a full ws:// / wss:// URL, use it directly
    if (raw && (raw.startsWith("ws://") || raw.startsWith("wss://"))) {
        return raw
    }

    // Otherwise treat it as a path (e.g. /guacamole) and derive host from current page
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
    const clientRef = useRef<any>(null)
    const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting")
    const [error, setError] = useState<string | null>(null)
    const [guacToken, setGuacToken] = useState<string | null>(null)

    // ── Fetch Guacamole token via nginx SSO proxy if not cached ───────────
    useEffect(() => {
        if (!connectionId) return

        const initToken = async () => {
            let token = localStorage.getItem("guacamole_token")
            if (!token) {
                try {
                    // nginx handles JWT validation via auth_request and passes X-Remote-User
                    const res = await fetch("/guacamole/api/tokens", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        // Header auth extension uses X-Remote-User from nginx;
                        // body can be empty/dummy because nginx SSO does the real auth
                        body: "username=sso&password=sso",
                    })
                    if (res.ok) {
                        const data = await res.json()
                        token = data.authToken ?? data.token ?? null
                        if (token) localStorage.setItem("guacamole_token", token)
                    }
                } catch (e) {
                    console.warn("[Guacamole] Token fetch failed:", e)
                }
            }
            setGuacToken(token)
        }

        initToken()
    }, [connectionId])

    // ── Establish WebSocket tunnel once we have token + connectionId ──────
    useEffect(() => {
        if (!connectionId || !containerRef.current || guacToken === null) return

        setStatus("connecting")
        setError(null)

        const tunnel = new Guacamole.WebSocketTunnel(
            `${GUAC_WS_BASE}/websocket-tunnel`
        )

        const client = new Guacamole.Client(tunnel)
        clientRef.current = client

        // Attach display
        const display = client.getDisplay().getElement()
        display.style.width = "100%"
        display.style.height = "100%"
        containerRef.current.innerHTML = ""
        containerRef.current.appendChild(display)

        // Mouse
        const mouse = new Guacamole.Mouse(display)
        mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (state: any) => {
            client.sendMouseState(state)
        }

        // Keyboard
        const keyboard = new Guacamole.Keyboard(document)
        keyboard.onkeydown = (keysym: number) => client.sendKeyEvent(1, keysym)
        keyboard.onkeyup = (keysym: number) => client.sendKeyEvent(0, keysym)

        // State changes
        client.onstatechange = (state: number) => {
            if (state === 3) setStatus("connected")
            if (state === 4) {
                setError("Disconnected from session")
                setStatus("error")
            }
        }

        client.onerror = (err: any) => {
            setError(err.message || "Connection failed")
            setStatus("error")
        }

        // Connect with token and connection ID
        client.connect(`token=${guacToken}&connection=${connectionId}`)

        return () => {
            keyboard.onkeydown = null
            keyboard.onkeyup = null
            client.disconnect()
            if (containerRef.current) containerRef.current.innerHTML = ""
        }
    }, [connectionId, guacToken])

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

    if (errorMessage || error) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f9f9f9] p-6">
                <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                    <p className="text-[13px] text-red-700">{errorMessage || error}</p>
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
        </div>
    )
}