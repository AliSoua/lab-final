// src/components/LabInstance/Trainee/InstanceRun/sections/LabModals.tsx
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

const EXPIRY_WARNING_MINUTES = 5
const EXPIRY_CRITICAL_MINUTES = 1

interface ExpiryWarningModalProps {
    minutesRemaining: number
    onContinue: () => void
}

export function ExpiryWarningModal({ minutesRemaining, onContinue }: ExpiryWarningModalProps) {
    const isCritical = minutesRemaining <= EXPIRY_CRITICAL_MINUTES

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center gap-3">
                    <Clock className={cn("h-8 w-8", isCritical ? "text-red-600" : "text-amber-500")} />
                    <h3 className={cn("text-[16px] font-semibold", isCritical ? "text-red-900" : "text-amber-900")}>
                        {isCritical ? "Lab Expiring Soon!" : "Lab Time Running Out"}
                    </h3>
                </div>
                <p className="mt-3 text-[13px] text-[#727373]">
                    {isCritical
                        ? `Your lab will expire in ${minutesRemaining} minute. Save your work now!`
                        : `Your lab will expire in ${minutesRemaining} minutes.`
                    }
                </p>
                <button
                    onClick={onContinue}
                    className="mt-4 w-full rounded-lg bg-[#1ca9b1] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#17959c] transition"
                >
                    Continue Working
                </button>
            </div>
        </div>
    )
}

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