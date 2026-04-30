// src/components/LabInstance/Trainee/InstanceRun/shared/FullPageStates.tsx
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react"

export function FullPageLoader({ message }: { message: string }) {
    return (
        <div className="flex h-full items-center justify-center bg-[#f9f9f9]">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#1ca9b1]" />
                <p className="text-[13px] text-[#727373]">{message}</p>
            </div>
        </div>
    )
}

interface FullPageErrorProps {
    message: string
    onBack: () => void
}

export function FullPageError({ message, onBack }: FullPageErrorProps) {
    return (
        <div className="flex h-full items-center justify-center bg-[#f9f9f9] p-6">
            <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <AlertCircle className="h-10 w-10 text-red-600" />
                <h2 className="text-[16px] font-semibold text-red-900">Unable to load lab instance</h2>
                <p className="text-[13px] text-red-700">{message}</p>
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 rounded-lg bg-[#1ca9b1] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#17959c] transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Labs
                </button>
            </div>
        </div>
    )
}