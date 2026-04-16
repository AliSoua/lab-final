// src/components/LabDefinition/detail/LabDetailSkeleton.tsx
import { cn } from "@/lib/utils"

export function LabDetailSkeleton() {
    return (
        <div className="min-h-screen bg-[#fafafa]">
            {/* Hero Skeleton */}
            <div
                className="relative overflow-hidden"
                style={{
                    background: "linear-gradient(160deg, #0d8f96 0%, #1ca9b1 55%, #2ec4cc 100%)",
                }}
            >
                <div className="relative mx-auto max-w-7xl px-4 py-16 lg:py-20 sm:px-6 lg:px-8">
                    <div className="animate-pulse">
                        {/* Breadcrumb */}
                        <div className="mb-6 h-4 w-32 rounded bg-white/20" />

                        {/* Title */}
                        <div className="mb-4 h-10 w-3/4 max-w-2xl rounded-lg bg-white/20" />

                        {/* Description */}
                        <div className="mb-2 h-4 w-1/2 max-w-xl rounded bg-white/20" />
                        <div className="mb-8 h-4 w-1/3 max-w-xl rounded bg-white/20" />

                        {/* Meta pills */}
                        <div className="flex flex-wrap gap-2">
                            <div className="h-8 w-24 rounded-full bg-white/20" />
                            <div className="h-8 w-28 rounded-full bg-white/20" />
                            <div className="h-8 w-20 rounded-full bg-white/20" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* About Section */}
                        <div className="animate-pulse rounded-xl border border-[#e8e8e8] bg-white p-6">
                            <div className="mb-4 h-6 w-32 rounded bg-[#f0f0f0]" />
                            <div className="space-y-3">
                                <div className="h-4 w-full rounded bg-[#f0f0f0]" />
                                <div className="h-4 w-full rounded bg-[#f0f0f0]" />
                                <div className="h-4 w-3/4 rounded bg-[#f0f0f0]" />
                            </div>
                        </div>

                        {/* Objectives Section */}
                        <div className="animate-pulse rounded-xl border border-[#e8e8e8] bg-white p-6">
                            <div className="mb-4 h-6 w-40 rounded bg-[#f0f0f0]" />
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="h-5 w-5 rounded-full bg-[#f0f0f0]" />
                                        <div className="h-4 w-full rounded bg-[#f0f0f0]" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* VMs Section */}
                        <div className="animate-pulse rounded-xl border border-[#e8e8e8] bg-white p-6">
                            <div className="mb-4 h-6 w-48 rounded bg-[#f0f0f0]" />
                            <div className="grid gap-4 sm:grid-cols-2">
                                {[1, 2].map((i) => (
                                    <div key={i} className="rounded-lg border border-[#e8e8e8] p-4">
                                        <div className="mb-2 h-5 w-3/4 rounded bg-[#f0f0f0]" />
                                        <div className="h-4 w-1/2 rounded bg-[#f0f0f0]" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Action Card */}
                        <div className="animate-pulse rounded-xl border border-[#e8e8e8] bg-white p-6">
                            <div className="mb-4 h-10 w-full rounded-lg bg-[#f0f0f0]" />
                            <div className="mb-4 h-4 w-full rounded bg-[#f0f0f0]" />
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <div className="h-4 w-20 rounded bg-[#f0f0f0]" />
                                    <div className="h-4 w-16 rounded bg-[#f0f0f0]" />
                                </div>
                                <div className="flex justify-between">
                                    <div className="h-4 w-24 rounded bg-[#f0f0f0]" />
                                    <div className="h-4 w-20 rounded bg-[#f0f0f0]" />
                                </div>
                                <div className="flex justify-between">
                                    <div className="h-4 w-16 rounded bg-[#f0f0f0]" />
                                    <div className="h-4 w-24 rounded bg-[#f0f0f0]" />
                                </div>
                            </div>
                        </div>

                        {/* Prerequisites Card */}
                        <div className="animate-pulse rounded-xl border border-[#e8e8e8] bg-white p-6">
                            <div className="mb-4 h-6 w-40 rounded bg-[#f0f0f0]" />
                            <div className="space-y-3">
                                {[1, 2].map((i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="h-4 w-4 rounded bg-[#f0f0f0]" />
                                        <div className="h-4 w-full rounded bg-[#f0f0f0]" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}