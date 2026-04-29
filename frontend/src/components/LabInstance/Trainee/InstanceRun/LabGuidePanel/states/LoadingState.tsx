// src/components/LabInstance/Trainee/InstanceRun/LabGuidePanel/states/LoadingState.tsx

export function LoadingState() {
    return (
        <div className="flex h-full items-center justify-center bg-[#f9f9f9]">
            <div className="flex flex-col items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#e8e8e8] border-t-[#1ca9b1]" />
                <p className="text-[13px] text-[#727373]">Loading guide…</p>
            </div>
        </div>
    )
}