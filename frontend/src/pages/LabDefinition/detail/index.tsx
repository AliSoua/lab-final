// src/pages/LabDefinition/detail/index.tsx
import { useParams, useNavigate } from "react-router-dom"
import { AlertCircle, RefreshCw, Play, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLabDetail } from "@/hooks/LabDefinition/useLabDetail"
import { LabDetailHeader } from "@/components/LabDefinition/detail/LabDetailHeader"
import { LabObjectives } from "@/components/LabDefinition/detail/LabObjectives"
import { LabPrerequisites } from "@/components/LabDefinition/detail/LabPrerequisites"
import { LabVMs } from "@/components/LabDefinition/detail/LabVMs"
import { LabGuidePreview } from "@/components/LabDefinition/detail/LabGuidePreview"
import { LabInfoCard } from "@/components/LabDefinition/detail/LabInfoCard"
import { LabDetailSkeleton } from "@/components/LabDefinition/detail/LabDetailSkeleton"

export default function LabDetailPage() {
    const { slug } = useParams<{ slug: string }>()
    const navigate = useNavigate()

    const { lab, isLoading, error, refetch } = useLabDetail(slug)

    const handleStartLab = (labId: string) => {
        // TODO: Implement lab session initiation
        console.log("Starting lab:", labId)
        // navigate(`/labs/${slug}/session`)
    }

    if (isLoading) {
        return <LabDetailSkeleton />
    }

    if (error || !lab) {
        return (
            <div className="min-h-screen bg-[#fafafa]">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-[18px] font-semibold text-red-900">
                                {error?.includes("not found")
                                    ? "Lab Not Found"
                                    : "Failed to Load Lab"}
                            </h2>
                            <p className="mt-2 max-w-md text-[14px] text-red-700">
                                {error || "The lab you're looking for doesn't exist or you don't have permission to view it."}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            {error && !error.includes("not found") && (
                                <button
                                    onClick={() => refetch()}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg bg-white px-5 py-2.5",
                                        "text-[13px] font-medium text-red-700",
                                        "border border-red-200 hover:bg-red-100",
                                        "transition-all duration-200"
                                    )}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Try Again
                                </button>
                            )}
                            <button
                                onClick={() => navigate("/labs")}
                                className={cn(
                                    "flex items-center gap-2 rounded-lg bg-[#1ca9b1] px-5 py-2.5",
                                    "text-[13px] font-medium text-white",
                                    "hover:bg-[#17959c]",
                                    "transition-all duration-200"
                                )}
                            >
                                Browse Labs
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#fafafa]">
            {/* Header Section */}
            <LabDetailHeader lab={lab} onStartLab={handleStartLab} />

            {/* Main Content */}
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Full Description */}
                        {lab.description && (
                            <div className="rounded-xl border border-[#e8e8e8] bg-white p-6">
                                <h2 className="mb-4 text-[16px] font-semibold text-[#3a3a3a]">
                                    About This Lab
                                </h2>
                                <div className="prose prose-sm max-w-none text-[#727373]">
                                    {lab.description.split("\n").map((paragraph, idx) => (
                                        <p key={idx} className="mb-4 last:mb-0 leading-[1.7]">
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Objectives */}
                        {lab.objectives && lab.objectives.length > 0 && (
                            <LabObjectives objectives={lab.objectives} />
                        )}

                        {/* VMs Configuration */}
                        {lab.vms && lab.vms.length > 0 && (
                            <LabVMs vms={lab.vms} />
                        )}

                        {/* Guide Preview */}
                        {lab.guide_blocks && lab.guide_blocks.length > 0 && (
                            <LabGuidePreview guideBlocks={lab.guide_blocks} />
                        )}
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="space-y-6">
                        {/* Start Lab CTA */}
                        <div className="rounded-xl border border-[#e8e8e8] bg-white p-6">
                            <button
                                onClick={() => handleStartLab(lab.id)}
                                className={cn(
                                    "group mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1ca9b1] px-6 py-3",
                                    "text-[14px] font-semibold tracking-wide text-white",
                                    "shadow-lg shadow-[#1ca9b1]/30 transition-all duration-200",
                                    "hover:bg-[#17959c] hover:shadow-xl hover:shadow-[#1ca9b1]/40"
                                )}
                            >
                                <Play className="h-4 w-4 fill-current" />
                                Start Lab Now
                            </button>

                            <p className="text-center text-[12px] text-[#727373]">
                                Duration: {lab.duration_minutes} minutes
                            </p>
                        </div>

                        {/* Lab Info */}
                        <LabInfoCard lab={lab} />

                        {/* Prerequisites */}
                        {lab.prerequisites && lab.prerequisites.length > 0 && (
                            <LabPrerequisites prerequisites={lab.prerequisites} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}