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

    useEffect(() => {
        if (!connectionId || !containerRef.current) return

        setStatus("connecting")
        setError(null)

        // WebSocket tunnel to Guacamole proxy
        const tunnel = new Guacamole.WebSocketTunnel(
            `${import.meta.env.VITE_GUACAMOLE_WS_URL}/websocket-tunnel`
        )

        const client = new Guacamole.Client(tunnel)
        clientRef.current = client

        // Attach display
        const display = client.getDisplay().getElement()
        display.style.width = "100%"
        display.style.height = "100%"
        containerRef.current.innerHTML = ""
        containerRef.current.appendChild(display)

        // Mouse handling
        const mouse = new Guacamole.Mouse(display)
        mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (state: any) => {
            client.sendMouseState(state)
        }

        // Keyboard handling — attached to document for full capture
        const keyboard = new Guacamole.Keyboard(document)
        keyboard.onkeydown = (keysym: number) => client.sendKeyEvent(1, keysym)
        keyboard.onkeyup = (keysym: number) => client.sendKeyEvent(0, keysym)

        // State changes
        client.onstatechange = (state: number) => {
            if (state === 3) setStatus("connected")      // CONNECTED
            if (state === 4) {                          // DISCONNECTED
                setError("Disconnected from session")
                setStatus("error")
            }
        }

        client.onerror = (err: any) => {
            setError(err.message || "Connection failed")
            setStatus("error")
        }

        // Connect with token
        const token = localStorage.getItem("guacamole_token") || ""
        client.connect(`token=${token}&connection=${connectionId}`)

        return () => {
            keyboard.onkeydown = null
            keyboard.onkeyup = null
            client.disconnect()
            if (containerRef.current) containerRef.current.innerHTML = ""
        }
    }, [connectionId])

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