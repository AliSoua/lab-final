// src/components/LabInstance/Trainee/InstanceRun/sections/LabModals.tsx
import { Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useCallback } from "react"

const EXPIRY_WARNING_MINUTES = 5
const EXPIRY_CRITICAL_MINUTES = 1

/* ── Non-blocking Toast Warning ─────────────────────────────────────── */

interface ExpiryToastProps {
    minutesRemaining: number
    onDismiss: () => void
}

export function ExpiryToast({ minutesRemaining, onDismiss }: ExpiryToastProps) {
    const isCritical = minutesRemaining <= EXPIRY_CRITICAL_MINUTES

    // Auto-dismiss after 8 seconds unless critical
    useEffect(() => {
        if (isCritical) return
        const timer = window.setTimeout(onDismiss, 8000)
        return () => window.clearTimeout(timer)
    }, [isCritical, onDismiss])

    return (
        <div className={cn(
            "flex items-center gap-3 rounded-lg border px-4 py-2.5 shadow-sm animate-in slide-in-from-top-2",
            isCritical
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
        )}>
            <Clock className={cn("h-4 w-4 shrink-0", isCritical ? "text-red-600" : "text-amber-500")} />
            <p className="text-[12px] font-medium">
                {isCritical
                    ? `Lab expires in ${minutesRemaining} minute! Save your work.`
                    : `Lab expires in ${minutesRemaining} minutes.`
                }
            </p>
            <button
                onClick={onDismiss}
                className="ml-auto rounded p-0.5 hover:bg-black/5 transition-colors"
                aria-label="Dismiss warning"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

/* ── Blocking Expired Modal (unavoidable) ─────────────────────────── */

interface ExpiredModalProps {
    onExit: () => void
}

export function ExpiredModal({ onExit }: ExpiredModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-red-600" />
                    <h3 className="text-[16px] font-semibold text-red-900">Lab Session Expired</h3>
                </div>
                <p className="mt-3 text-[13px] text-[#727373]">
                    Your lab time has expired. You have been disconnected from the session.
                </p>
                <button
                    onClick={onExit}
                    className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-red-700 transition"
                >
                    Exit to Labs
                </button>
            </div>
        </div>
    )
}