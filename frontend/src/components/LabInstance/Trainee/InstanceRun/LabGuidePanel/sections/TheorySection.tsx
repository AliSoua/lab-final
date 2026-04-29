// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/sections/TheorySection.tsx

import { TheoryContentRenderer } from "@/components/LabGuide/shared/TheoryContentRenderer"

interface TheorySectionProps {
    content?: string
}

export function TheorySection({ content }: TheorySectionProps) {
    if (!content) return null

    return (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
            <TheoryContentRenderer content={content} />
        </div>
    )
}