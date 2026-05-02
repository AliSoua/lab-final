// src/components/LabInstance/Trainee/InstanceRun/GuacamoleClient.tsx
import { useEffect, useRef, useState, useCallback } from "react"
import Guacamole from "guacamole-common-js"
import {
    Loader2,
    AlertCircle,
    Clipboard,
    Maximize,
    Minimize,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Keyboard,
    X,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type ProvisioningStage =
    | "validated"
    | "vcenter_discovered"
    | "vm_cloned"
    | "vm_powered_on"
    | "ip_discovered"
    | "guacamole_connected"
    | "finalized"
    | null

interface GuacamoleClientProps {
    connectionId: string | null
    title: string
    isProvisioning: boolean
    provisioningMessage?: string
    provisioningStage?: ProvisioningStage
    errorMessage?: string | null
}

const STAGE_ORDER: ProvisioningStage[] = [
    "validated",
    "vcenter_discovered",
    "vm_cloned",
    "vm_powered_on",
    "ip_discovered",
    "guacamole_connected",
    "finalized",
]

const STAGE_LABELS: Record<string, string> = {
    validated: "Validate",
    vcenter_discovered: "vCenter",
    vm_cloned: "Clone",
    vm_powered_on: "Power On",
    ip_discovered: "Network",
    guacamole_connected: "Connect",
    finalized: "Ready",
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

/* ─── Toolbar Button ─── */
function ToolbarButton({
    icon: Icon,
    onClick,
    title,
    active,
}: {
    icon: React.ElementType
    onClick: () => void
    title: string
    active?: boolean
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                active
                    ? "bg-[#1ca9b1] text-white"
                    : "text-[#727373] hover:bg-[#f0f0f0] hover:text-[#3a3a3a]"
            )}
        >
            <Icon className="h-3.5 w-3.5" />
        </button>
    )
}

export default function GuacamoleClient({
    connectionId,
    title,
    isProvisioning,
    provisioningMessage,
    provisioningStage,
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
    const [reconnectTick, setReconnectTick] = useState(0)

    // ── UX State ───────────────────────────────────────────────────────
    const [clipboardOpen, setClipboardOpen] = useState(false)
    const [clipboardText, setClipboardText] = useState("")
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [scale, setScale] = useState(1)
    const [showShortcuts, setShowShortcuts] = useState(false)

    // ── Fullscreen listener ────────────────────────────────────────────
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener("fullscreenchange", handler)
        return () => document.removeEventListener("fullscreenchange", handler)
    }, [])

    // ── Reset zoom on connection change ────────────────────────────────
    useEffect(() => {
        setScale(1)
    }, [connectionId])

    // ── Keyboard shortcuts ─────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!e.ctrlKey || !e.altKey || !e.shiftKey || e.repeat) return

            switch (e.key.toLowerCase()) {
                case "c":
                    e.preventDefault()
                    setClipboardOpen(prev => !prev)
                    break
                case "f":
                    e.preventDefault()
                    toggleFullscreen()
                    break
                case "n":
                    e.preventDefault()
                    setScale(s => Math.min(s + 0.15, 3))
                    break
                case "m":
                    e.preventDefault()
                    setScale(s => Math.max(s - 0.15, 0.3))
                    break
                case "0":
                    e.preventDefault()
                    setScale(1)
                    break
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [])

    // ── Fetch Guacamole token ──────────────────────────────────────────
    useEffect(() => {
        if (!connectionId) return

        const initToken = async () => {
            setTokenError(null)
            let token = localStorage.getItem("guacamole_token")
            const tokenExpiry = localStorage.getItem("guacamole_token_expiry")

            if (token && tokenExpiry && Date.now() > parseInt(tokenExpiry, 10)) {
                token = null
                localStorage.removeItem("guacamole_token")
                localStorage.removeItem("guacamole_token_expiry")
            }

            if (!token) {
                try {
                    const res = await fetch("/guacamole/api/tokens", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: "username=sso&password=sso",
                    })
                    if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`)
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
    }, [connectionId, reconnectTick])

    // ── Establish WebSocket tunnel ─────────────────────────────────────
    useEffect(() => {
        if (!connectionId || !containerRef.current || guacToken === null) return
        if (tokenError) return

        setStatus("connecting")
        setError(null)

        const tunnel = new Guacamole.WebSocketTunnel(`${GUAC_WS_BASE}/websocket-tunnel`)
        tunnelRef.current = tunnel

        const client = new Guacamole.Client(tunnel)
        clientRef.current = client

        // Attach display
        const display = client.getDisplay().getElement()
        display.style.width = "100%"
        display.style.height = "100%"
        display.style.pointerEvents = "auto"
        display.tabIndex = -1
        containerRef.current.innerHTML = ""
        containerRef.current.appendChild(display)

        // Apply current zoom
        display.style.transform = `scale(${scale})`
        display.style.transformOrigin = "top left"

        // Mouse
        const mouse = new Guacamole.Mouse(display)
        mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (state: any) => {
            client.sendMouseState(state)
        }
        mouseRef.current = mouse

        // Hover tracking for keyboard
        const onMouseEnter = () => { isMouseOverRef.current = true }
        const onMouseLeave = () => { isMouseOverRef.current = false }
        display.addEventListener("mouseenter", onMouseEnter)
        display.addEventListener("mouseleave", onMouseLeave)
        display.addEventListener("click", () => display.focus())

        // Keyboard
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
            if (state === 3) setStatus("connected")
            else if (state === 4 || state === 5) {
                setError(state === 4 ? "Session disconnecting" : "Disconnected")
                setStatus("error")
            }
        }

        client.onerror = (err: any) => {
            setError(err?.message || "Connection failed")
            setStatus("error")
        }

        tunnel.onerror = (status: any) => {
            const msg = typeof status === "number"
                ? `Tunnel error (HTTP ${status})`
                : (status?.message || "Tunnel connection failed")
            setError(msg)
            setStatus("error")
        }

        // Clipboard from remote
        client.onclipboard = (stream: any, mimetype: string) => {
            if (!mimetype.startsWith("text/")) return
            const Reader = (Guacamole as any).StringReader
            if (!Reader) return
            const reader = new Reader(stream)
            let data = ""
            reader.ontext = (text: string) => { data += text }
            reader.onend = () => {
                setClipboardText(data)
                // Auto-sync to local clipboard if permitted
                if (navigator.clipboard && data) {
                    navigator.clipboard.writeText(data).catch(() => { })
                }
            }
        }

        // Resize observer
        const resizeObserver = new ResizeObserver((entries) => {
            if (!clientRef.current) return
            for (const entry of entries) {
                const { width, height } = entry.contentRect
                if (width > 0 && height > 0) {
                    clientRef.current.sendSize(Math.round(width / scale), Math.round(height / scale))
                }
            }
        })
        if (containerRef.current) resizeObserver.observe(containerRef.current)
        resizeObserverRef.current = resizeObserver

        client.connect(`token=${guacToken}&GUAC_TYPE=c&GUAC_DATA_SOURCE=postgresql&GUAC_ID=${connectionId}`)

        return () => {
            resizeObserver.disconnect()
            resizeObserverRef.current = null
            display.removeEventListener("mouseenter", onMouseEnter)
            display.removeEventListener("mouseleave", onMouseLeave)
            if (keyboardRef.current) {
                keyboardRef.current.onkeydown = null
                keyboardRef.current.onkeyup = null
                keyboardRef.current = null
            }
            if (mouseRef.current) {
                mouseRef.current.onmousedown = null
                mouseRef.current.onmouseup = null
                mouseRef.current.onmousemove = null
                mouseRef.current = null
            }
            if (clientRef.current) {
                clientRef.current.disconnect()
                clientRef.current = null
            }
            tunnelRef.current = null
            if (containerRef.current) containerRef.current.innerHTML = ""
        }
    }, [connectionId, guacToken, tokenError, reconnectTick, scale])

    // ── Apply zoom when scale changes ──────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return
        const display = containerRef.current.querySelector("div") as HTMLElement | null
        if (display) {
            display.style.transform = `scale(${scale})`
            display.style.transformOrigin = "top left"
        }
    }, [scale])

    // ── Helpers ────────────────────────────────────────────────────────
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen()
        } else {
            document.exitFullscreen()
        }
    }, [])

    const sendClipboardToRemote = useCallback((text: string) => {
        const client = clientRef.current as any
        if (!client || !text) return
        try {
            const stream = client.createClipboardStream("text/plain")
            const Writer = (Guacamole as any).StringWriter
            if (!Writer) return
            const writer = new Writer(stream)
            writer.sendText(text)
            writer.sendEnd()
        } catch (e) {
            console.error("[Guacamole] Failed to send clipboard:", e)
        }
    }, [])

    const handleReconnect = useCallback(() => {
        setError(null)
        setTokenError(null)
        setGuacToken(null)
        localStorage.removeItem("guacamole_token")
        localStorage.removeItem("guacamole_token_expiry")
        setReconnectTick(t => t + 1)
    }, [])

    // ── Stage stepper helper ───────────────────────────────────────────
    const currentStageIndex = provisioningStage ? STAGE_ORDER.indexOf(provisioningStage) : -1

    return (
        <div className="relative h-full w-full bg-black" ref={containerRef}>
            {/* Guacamole display mount point */}
            <div className="h-full w-full" />

            {/* ── Floating Toolbar ── */}
            {!isProvisioning && connectionId && status !== "error" && (
                <div className="absolute right-2 top-2 z-20 flex items-center gap-0.5 rounded-lg border border-[#e8e8e8] bg-white/95 px-1 py-1 shadow-sm backdrop-blur-sm">
                    <ToolbarButton
                        icon={Clipboard}
                        onClick={() => setClipboardOpen(prev => !prev)}
                        title="Clipboard (Ctrl+Alt+Shift+C)"
                        active={clipboardOpen}
                    />
                    <ToolbarButton
                        icon={ZoomOut}
                        onClick={() => setScale(s => Math.max(s - 0.15, 0.3))}
                        title="Zoom out (Ctrl+Alt+Shift+M)"
                    />
                    <ToolbarButton
                        icon={ZoomIn}
                        onClick={() => setScale(s => Math.min(s + 0.15, 3))}
                        title="Zoom in (Ctrl+Alt+Shift+N)"
                    />
                    <ToolbarButton
                        icon={isFullscreen ? Minimize : Maximize}
                        onClick={toggleFullscreen}
                        title="Fullscreen (Ctrl+Alt+Shift+F)"
                    />
                    <ToolbarButton
                        icon={Keyboard}
                        onClick={() => setShowShortcuts(true)}
                        title="Keyboard shortcuts"
                    />
                </div>
            )}

            {/* ── Clipboard Panel ── */}
            {clipboardOpen && (
                <div className="absolute right-2 top-12 z-30 w-80 rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-xl">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#727373]">
                            Clipboard Sync
                        </p>
                        <button
                            onClick={() => setClipboardOpen(false)}
                            className="rounded p-1 text-[#c4c4c4] hover:bg-[#f9f9f9] hover:text-[#3a3a3a]"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <textarea
                        className="h-32 w-full rounded-lg border border-[#e8e8e8] p-2 text-[12px] text-[#3a3a3a] focus:border-[#1ca9b1] focus:outline-none"
                        value={clipboardText}
                        onChange={(e) => setClipboardText(e.target.value)}
                        placeholder="Paste here to send to VM. Remote copies appear here."
                    />
                    <div className="mt-2 flex items-center justify-between">
                        <button
                            onClick={() =>
                                navigator.clipboard.readText().then((t) => {
                                    setClipboardText(t)
                                    sendClipboardToRemote(t)
                                })
                            }
                            className="text-[11px] font-medium text-[#1ca9b1] hover:underline"
                        >
                            Paste from PC
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigator.clipboard.writeText(clipboardText)}
                                className="text-[11px] font-medium text-[#727373] hover:text-[#3a3a3a]"
                            >
                                Copy to PC
                            </button>
                            <button
                                onClick={() => sendClipboardToRemote(clipboardText)}
                                className="rounded-md bg-[#1ca9b1] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#169199]"
                            >
                                Sync to VM
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Shortcuts Modal ── */}
            {showShortcuts && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50">
                    <div className="w-80 rounded-xl bg-white p-5 shadow-xl">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-[13px] font-semibold text-[#3a3a3a]">Keyboard Shortcuts</h3>
                            <button
                                onClick={() => setShowShortcuts(false)}
                                className="rounded p-1 text-[#c4c4c4] hover:bg-[#f9f9f9] hover:text-[#3a3a3a]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="space-y-2.5 text-[12px]">
                            {[
                                { keys: "Ctrl + Alt + Shift + C", action: "Toggle clipboard panel" },
                                { keys: "Ctrl + Alt + Shift + F", action: "Toggle fullscreen" },
                                { keys: "Ctrl + Alt + Shift + N", action: "Zoom in" },
                                { keys: "Ctrl + Alt + Shift + M", action: "Zoom out" },
                                { keys: "Ctrl + Alt + Shift + 0", action: "Reset zoom" },
                            ].map((item) => (
                                <div key={item.action} className="flex items-center justify-between text-[#727373]">
                                    <span className="rounded bg-[#f9f9f9] px-1.5 py-0.5 font-mono text-[11px] text-[#3a3a3a]">
                                        {item.keys}
                                    </span>
                                    <span>{item.action}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowShortcuts(false)}
                            className="mt-4 w-full rounded-lg bg-[#1ca9b1] py-2 text-[12px] font-medium text-white hover:bg-[#169199]"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* ── Provisioning overlay ── */}
            {isProvisioning && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#f9f9f9]/95 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4 max-w-md px-6">
                        <Loader2 className="h-8 w-8 animate-spin text-[#1ca9b1]" />
                        <p className="text-[14px] font-medium text-[#3a3a3a] text-center">
                            {provisioningMessage || "Initializing lab environment..."}
                        </p>

                        <div className="w-full mt-2">
                            <div className="flex items-center justify-between gap-1">
                                {STAGE_ORDER.map((stage, i) => {
                                    const reached = currentStageIndex >= i
                                    const current = currentStageIndex === i
                                    return (
                                        <div key={stage} className="flex flex-col items-center gap-1 flex-1">
                                            <div className={cn(
                                                "h-2 w-full rounded-full transition-all duration-500",
                                                reached ? "bg-[#1ca9b1]" : "bg-[#e8e8e8]",
                                                current && "ring-2 ring-[#1ca9b1] ring-offset-1"
                                            )} />
                                            <span className={cn(
                                                "text-[9px] font-medium uppercase tracking-wider",
                                                reached ? "text-[#1ca9b1]" : "text-[#c4c4c4]"
                                            )}>
                                                {STAGE_LABELS[stage || ""]}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Connection loading overlay ── */}
            {!isProvisioning && status === "connecting" && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                        <span className="text-[12px] text-white/80">Connecting to session...</span>
                    </div>
                </div>
            )}

            {/* ── Error states ── */}
            {(tokenError || error) && !isProvisioning && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#f9f9f9]/95 backdrop-blur-sm">
                    <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                        <p className="text-[13px] text-red-700">{tokenError || error}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleReconnect}
                                className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#1ca9b1] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#169199]"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reconnect
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-[12px] font-medium text-red-600 hover:bg-red-50"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bottom title label with status dot ── */}
            {connectionId && (
                <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white/80 pointer-events-none">
                    <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        status === "connected" && "bg-green-400",
                        status === "connecting" && "bg-amber-400 animate-pulse",
                        status === "error" && "bg-red-400"
                    )} />
                    <span className="truncate max-w-[200px]">{title}</span>
                    {scale !== 1 && (
                        <>
                            <span className="text-white/40">•</span>
                            <span className="text-white/60">{Math.round(scale * 100)}%</span>
                        </>
                    )}
                </div>
            )}

            {/* ── Guide error toast ── */}
            {errorMessage && (
                <div className="absolute top-2 right-2 max-w-xs rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 pointer-events-none">
                    Guide load failed: {errorMessage}
                </div>
            )}
        </div>
    )
}