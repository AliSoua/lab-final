// src/components/LabInstance/Trainee/InstanceDetail/InstanceSkeleton.tsx
export function InstanceSkeleton() {
    return (
        <div className="min-h-screen bg-[#fafafa]">
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-14">
                <div className="animate-pulse">
                    {/* Back link */}
                    <div className="mb-4 h-4 w-32 rounded bg-[#f0f0f0]" />
                    {/* Eyebrow */}
                    <div className="mb-2 h-3 w-24 rounded bg-[#f0f0f0]" />
                    {/* Title */}
                    <div className="mb-3 h-8 w-1/2 rounded bg-[#f0f0f0]" />
                    {/* Meta */}
                    <div className="mb-10 flex gap-3">
                        <div className="h-5 w-20 rounded bg-[#f0f0f0]" />
                        <div className="h-5 w-24 rounded bg-[#f0f0f0]" />
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                        <div className="space-y-8 lg:col-span-2">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="rounded-xl border border-[#e8e8e8] bg-white p-6"
                                >
                                    <div className="mb-2 h-3 w-16 rounded bg-[#f0f0f0]" />
                                    <div className="mb-6 h-6 w-40 rounded bg-[#f0f0f0]" />
                                    <div className="space-y-3">
                                        <div className="h-4 w-full rounded bg-[#f0f0f0]" />
                                        <div className="h-4 w-2/3 rounded bg-[#f0f0f0]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-6">
                            <div className="rounded-xl border border-[#e8e8e8] bg-white p-6">
                                <div className="mb-4 h-11 w-full rounded-lg bg-[#f0f0f0]" />
                                <div className="h-3 w-full rounded bg-[#f0f0f0]" />
                            </div>
                            <div className="rounded-xl border border-[#e8e8e8] bg-white p-6">
                                <div className="mb-4 h-3 w-20 rounded bg-[#f0f0f0]" />
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <div className="h-4 w-16 rounded bg-[#f0f0f0]" />
                                        <div className="h-4 w-12 rounded bg-[#f0f0f0]" />
                                    </div>
                                    <div className="flex justify-between">
                                        <div className="h-4 w-14 rounded bg-[#f0f0f0]" />
                                        <div className="h-4 w-10 rounded bg-[#f0f0f0]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}