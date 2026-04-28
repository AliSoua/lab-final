// src/components/LabInstance/Trainee/InstanceRun/VMConsolePanel.tsx
import { Monitor, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { GuacamoleConsole } from "@/components/LabInstance/Trainee/InstanceRun/GuacamoleConsole"

interface VMConsolePanelProps {
    connectionId: string | null
    /** Connection name (e.g., "Kali Linux", "Windows Server"). NOT an IP. */
    title?: string
    isProvisioning?: boolean
    errorMessage?: string | null
}

export function VMConsolePanel({
    connectionId,
    title = "Console",
    isProvisioning,
    errorMessage,
}: VMConsolePanelProps) {
    // ── Error state (guide or runtime failure) ─────────────────────────
    if (errorMessage) {
        return (
            <div className="flex h-full items-center justify-center bg-[#1a1a1a] p-6">
                <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-red-800/30 bg-red-900/20 p-8 text-center">
                    <AlertCircle className="h-10 w-10 text-red-400" />
                    <div>
                        <h3 className="text-[15px] font-semibold text-red-200">
                            Connection Error
                        </h3>
                        <p className="mt-1 text-[13px] text-red-300/80">{errorMessage}</p>
                    </div>
                </div>
            </div>
        )
    }

    // ── Provisioning state ─────────────────────────────────────────────
    if (isProvisioning) {
        return (
            <div className="flex h-full items-center justify-center bg-[#1a1a1a] p-6">
                <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-[#333] bg-[#222] p-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#1ca9b1]" />
                    <div>
                        <h3 className="text-[15px] font-semibold text-white">
                            Preparing your lab...
                        </h3>
                        <p className="mt-1 text-[13px] text-[#888]">
                            The VM is booting and receiving a network address.
                            Guacamole sessions will appear here automatically.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // ── No connection available ────────────────────────────────────────
    if (!connectionId) {
        return (
            <div className="flex h-full items-center justify-center bg-[#1a1a1a] p-6">
                <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-[#333] bg-[#222] p-8 text-center">
                    <Monitor className="h-10 w-10 text-[#1ca9b1]" />
                    <div>
                        <h3 className="text-[15px] font-semibold text-white">
                            No remote connections available
                        </h3>
                        <p className="mt-1 text-[13px] text-[#888]">
                            This instance has no Guacamole connections yet.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // ── Active Guacamole session ───────────────────────────────────────
    return (
        <GuacamoleConsole
            connectionId={connectionId}
            title={title}
        />
    )
}