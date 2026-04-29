// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/GuideHeader.tsx

interface GuideHeaderProps {
    currentStepIndex: number
    totalSteps: number
}

export function GuideHeader({ currentStepIndex, totalSteps }: GuideHeaderProps) {
    const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0

    return (
        <div className="shrink-0 border-b border-[#e8e8e8] bg-white px-5 py-3">
            <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-[#3a3a3a]">Lab Guide</h2>
                <span className="text-[11px] text-[#727373]">
                    Step {currentStepIndex + 1} of {totalSteps}
                </span>
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-[#e8e8e8] overflow-hidden">
                <div
                    className="h-full rounded-full bg-[#1ca9b1] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}