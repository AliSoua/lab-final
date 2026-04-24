// src/components/LabInstance/run/GuacamoleConsole.tsx
import { useEffect, useState } from "react"
import { RefreshCw, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"
import { buildGuacamoleClientUrl } from "@/lib/guacamole"

interface GuacamoleConsoleProps {
    connectionId: string
    title?: string
    subtitle?: string
    className?: string
}

/**
 * Embedded Guacamole client. Authenticated transparently through the
 * Nginx `auth_request` → `/auth/guacamole-sso` flow + header-auth extension.
 *
 * Remounts the iframe when `connectionId` changes to force a clean Guacamole
 * client session for the new target.
 */
export function GuacamoleConsole({
    connectionId,
    title = "Lab Console",
    subtitle,
    className,
}: GuacamoleConsoleProps) {
    const [iframeKey, setIframeKey] = useState(0)

    // Force a reload whenever the target connection changes.
    useEffect(() => {
        setIframeKey((k) => k + 1)
    }, [connectionId])

    const url = buildGuacamoleClientUrl(connectionId)

    return (
        <div className={cn("flex h-full w-full flex-col bg-[#1a1a1a]", className)}>
            <div className="flex items-center justify-between gap-3 bg-[#1ca9b1] px-4 py-2 text-white shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                    <Monitor className="h-4 w-4 shrink-0" />
                    <span className="text-[13px] font-semibold truncate">{title}</span>
                    {subtitle && (
                        <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded truncate">
                            {subtitle}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setIframeKey((k) => k + 1)}
                    className={cn(
                        "flex items-center gap-1.5 rounded bg-white/20 px-2.5 py-1",
                        "text-[11px] font-medium hover:bg-white/30 transition"
                    )}
                    title="Reload Guacamole client"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reload
                </button>
            </div>

            <iframe
                key={iframeKey}
                src={url}
                className="flex-1 w-full border-0"
                title="Guacamole Remote Desktop"
                allow="clipboard-read; clipboard-write"
            />
        </div>
    )
}
