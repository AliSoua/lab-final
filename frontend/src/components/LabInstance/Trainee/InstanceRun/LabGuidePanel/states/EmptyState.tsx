// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/states/EmptyState.tsx

import { BookOpen } from "lucide-react"

export function EmptyState() {
    return (
        <div className="flex h-full items-center justify-center bg-[#f9f9f9] p-6">
            <div className="text-center">
                <BookOpen className="h-10 w-10 text-[#c4c4c4] mx-auto mb-3" />
                <p className="text-[13px] text-[#727373]">No guide steps available.</p>
            </div>
        </div>
    )
}