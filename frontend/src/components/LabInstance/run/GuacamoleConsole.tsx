// src/components/LabInstance/run/GuacamoleConsole.tsx
import { useEffect, useRef, useState, useCallback } from "react"
import { RefreshCw, Monitor, Maximize2, Minimize2, Keyboard } from "lucide-react"
import { cn } from "@/lib/utils"
import { buildGuacamoleClientUrl } from "@/lib/guacamole"

interface GuacamoleConsoleProps {
    connectionId: string
    title?: string
    subtitle?: string
    className?: string
}

export function GuacamoleConsole({
    connectionId,
    title = "Lab Console",
    subtitle,
    className,
}: GuacamoleConsoleProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [iframeKey, setIframeKey] = useState(0)
    const [hasFocus, setHasFocus] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Force reload when connection changes
    useEffect(() => {
        setIframeKey((k) => k + 1)
    }, [connectionId])

    // CRITICAL FIX: Global focus management per Apache Guacamole FAQ
    // Refocus iframe on any page click/keydown unless user is in an input
    useEffect(() => {
        const iframe = iframeRef.current
        if (!iframe) return

        const refocusGuacamole = () => {
            const focused = document.activeElement
            // Don't steal focus from inputs, textareas, buttons, or selects
            if (
                focused &&
                focused !== document.body &&
                (focused.tagName === "INPUT" ||
                    focused.tagName === "TEXTAREA" ||
                    focused.tagName === "BUTTON" ||
                    focused.tagName === "SELECT" ||
                    focused.closest("[data-no-focus-steal]"))
            ) {
                return
            }
            iframe.focus()
            iframe.contentWindow?.focus()
        }

        document.addEventListener("click", refocusGuacamole)
        document.addEventListener("keydown", refocusGuacamole)

        // Initial focus
        setTimeout(refocusGuacamole, 500)

        return () => {
            document.removeEventListener("click", refocusGuacamole)
            document.removeEventListener("keydown", refocusGuacamole)
        }
    }, [iframeKey])

    // Track iframe focus state for UI indicator
    useEffect(() => {
        const iframe = iframeRef.current
        if (!iframe) return

        const onFocus = () => setHasFocus(true)
        const onBlur = () => setHasFocus(false)

        iframe.addEventListener("focus", onFocus)
        iframe.addEventListener("blur", onBlur)
        return () => {
            iframe.removeEventListener("focus", onFocus)
            iframe.removeEventListener("blur", onBlur)
        }
    }, [iframeKey])

    // Fullscreen toggle
    const toggleFullscreen = useCallback(() => {
        const el = containerRef.current
        if (!el) return
        if (!document.fullscreenElement) {
            el.requestFullscreen().catch(() => { })
        } else {
            document.exitFullscreen().catch(() => { })
        }
    }, [])

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener("fullscreenchange", handler)
        return () => document.removeEventListener("fullscreenchange", handler)
    }, [])

    const url = buildGuacamoleClientUrl(connectionId)

    return (
        <div
            ref={containerRef}
            className={cn(
                "flex h-full w-full flex-col bg-[#1a1a1a] relative",
                isFullscreen && "fixed inset-0 z-50",
                className
            )}
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 bg-[#1a1a1a] border-b border-[#333] px-4 py-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Monitor className="h-4 w-4 shrink-0 text-[#1ca9b1]" />
                    <span className="text-[13px] font-semibold text-white truncate">
                        {title}
                    </span>
                    {subtitle && (
                        <span className="text-[11px] bg-[#1ca9b1]/20 text-[#1ca9b1] px-2 py-0.5 rounded truncate">
                            {subtitle}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Keyboard focus indicator */}
                    <div
                        className={cn(
                            "flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                            hasFocus
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-amber-500/15 text-amber-400"
                        )}
                        title={hasFocus ? "Keyboard input active" : "Click to activate keyboard"}
                    >
                        <Keyboard className="h-3 w-3" />
                        {hasFocus ? "Input active" : "Click to type"}
                    </div>

                    <button
                        onClick={() => setIframeKey((k) => k + 1)}
                        className={cn(
                            "flex items-center gap-1.5 rounded bg-[#2a2a2a] px-2.5 py-1.5",
                            "text-[11px] font-medium text-[#aaa] hover:bg-[#333] hover:text-white transition"
                        )}
                        title="Reload connection"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        className={cn(
                            "flex items-center gap-1.5 rounded bg-[#2a2a2a] px-2.5 py-1.5",
                            "text-[11px] font-medium text-[#aaa] hover:bg-[#333] hover:text-white transition"
                        )}
                        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="h-3.5 w-3.5" />
                        ) : (
                            <Maximize2 className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Iframe */}
            <iframe
                ref={iframeRef}
                key={iframeKey}
                src={url}
                className="flex-1 w-full border-0 outline-none"
                title="Guacamole Remote Desktop"
                tabIndex={0}
                allow="clipboard-read; clipboard-write; fullscreen"
                onLoad={(e) => {
                    e.currentTarget.focus()
                    e.currentTarget.contentWindow?.focus()
                }}
            />
        </div>
    )
}