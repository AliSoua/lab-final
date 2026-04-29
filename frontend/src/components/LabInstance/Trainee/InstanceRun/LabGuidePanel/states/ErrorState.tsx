// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/states/ErrorState.tsx

import { AlertCircle } from "lucide-react"

interface ErrorStateProps {
    message: string
}

export function ErrorState({ message }: ErrorStateProps) {
    return (
        <div className="flex h-full items-center justify-center bg-[#f9f9f9] p-6">
            <div className="flex max-w-sm flex-col items-center gap-3 text-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="text-[13px] font-medium text-red-800">Guide Error</p>
                <p className="text-[12px] text-red-600">{message}</p>
            </div>
        </div>
    )
}