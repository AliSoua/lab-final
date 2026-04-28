// src/pages/LabDefinition/detail/index.tsx
import { useParams, useNavigate } from "react-router-dom"
import { RefreshCw, ArrowRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLabDetail } from "@/hooks/LabDefinition/useLabDetail"
import { useLabInstance } from "@/hooks/LabInstance/useLabInstance"
import { LabDetailHeader } from "@/components/LabDefinition/detail/LabDetailHeader"
import { LabInfoCard } from "@/components/LabDefinition/detail/LabInfoCard"
import { LabDetailSkeleton } from "@/components/LabDefinition/detail/LabDetailSkeleton"
import type { LabDetail } from "@/types/LabDefinition/LabDetail"

export default function LabDetailPage() {
    const { slug } = useParams<{ slug: string }>()
    const navigate = useNavigate()

    const { lab, isLoading: isLabLoading, error, refetch } = useLabDetail(slug)
    const { launchLabInstance, isLoading: isLaunching } = useLabInstance()

    const handleStartLab = async (labId: string) => {
        try {
            const instance = await launchLabInstance({
                lab_definition_id: labId,
            })
            navigate(`/lab-instances/${instance.id}/run`)
        } catch {
            // Error is already toasted by the hook
        }
    }

    if (isLabLoading) {
        return <LabDetailSkeleton />
    }

    if (error || !lab) {
        return (
            <div className="min-h-screen bg-[#fafafa]">
                <div className="mx-auto max-w-7xl px-6 py-16 lg:px-14">
                    <div className="flex flex-col items-center gap-4 rounded-xl border border-[#e8e8e8] bg-white py-16 text-center">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                            Error
                        </p>
                        <h2 className="font-serif font-light text-2xl text-[#1a1a1a]">
                            {error?.includes("not found")
                                ? "Lab Not Found"
                                : "Failed to Load Lab"}
                        </h2>
                        <p className="max-w-md text-[13px] text-[#727373]">
                            {error || "The lab you're looking for doesn't exist or you don't have permission to view it."}
                        </p>
                        <div className="mt-2 flex gap-3">
                            {error && !error.includes("not found") && (
                                <button
                                    onClick={() => refetch()}
                                    className={cn(
                                        "flex h-10 items-center gap-2 rounded-lg border border-[#e8e8e8] px-5",
                                        "text-[13px] font-medium text-[#727373]",
                                        "hover:border-[#c4c4c4] hover:text-[#1a1a1a]",
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
                                    "flex h-10 items-center gap-2 rounded-lg bg-[#1ca9b1] px-5",
                                    "text-[13px] font-medium text-white",
                                    "hover:bg-[#17959c]",
                                    "transition-colors duration-200"
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
            {/* Header */}
            <LabDetailHeader lab={lab} />

            {/* Main Content */}
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-14">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
                    {/* Left Column — Merged Content Card */}
                    <div className="lg:col-span-2">
                        <div className="rounded-xl border border-[#e8e8e8] bg-white p-6 lg:p-8">
                            {/* Overview */}
                            {lab.description && (
                                <section className="mb-10">
                                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                                        Overview
                                    </p>
                                    <h2 className="mb-4 font-serif font-light text-xl tracking-tight text-[#1a1a1a]">
                                        About This Lab
                                    </h2>
                                    <div className="space-y-4 text-[13px] leading-[1.7] text-[#727373]">
                                        {lab.description.split("\n").map((paragraph, idx) => (
                                            <p key={idx}>{paragraph}</p>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Objectives */}
                            {lab.objectives && lab.objectives.length > 0 && (
                                <section className="mb-10">
                                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                                        Outcomes
                                    </p>
                                    <h2 className="mb-4 font-serif font-light text-xl tracking-tight text-[#1a1a1a]">
                                        Learning Objectives
                                    </h2>
                                    <div className="space-y-3">
                                        {lab.objectives.map((objective, index) => (
                                            <div
                                                key={index}
                                                className={cn(
                                                    "flex items-start gap-4 rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-4",
                                                    "transition-colors duration-200 hover:border-[#c4c4c4]"
                                                )}
                                            >
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#1ca9b1]/30 text-[10px] font-semibold text-[#1ca9b1]">
                                                    {index + 1}
                                                </span>
                                                <p className="text-[13px] leading-[1.6] text-[#3a3a3a]">
                                                    {objective}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Prerequisites */}
                            {lab.prerequisites && lab.prerequisites.length > 0 && (
                                <section>
                                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#1ca9b1]">
                                        Requirements
                                    </p>
                                    <h2 className="mb-4 font-serif font-light text-xl tracking-tight text-[#1a1a1a]">
                                        Prerequisites
                                    </h2>
                                    <ul className="space-y-3">
                                        {lab.prerequisites.map((prerequisite, index) => (
                                            <li
                                                key={index}
                                                className="flex items-start gap-3 text-[13px] leading-[1.6] text-[#3a3a3a]"
                                            >
                                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#a0a0a0]" />
                                                <span>{prerequisite}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </div>
                    </div>

                    {/* Right Column — Sticky Sidebar */}
                    <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
                        {/* Start CTA */}
                        <div className="rounded-xl border border-[#e8e8e8] bg-white p-6">
                            <button
                                onClick={() => handleStartLab(lab.id)}
                                disabled={isLaunching}
                                className={cn(
                                    "mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg",
                                    "text-[13px] font-semibold text-white",
                                    "transition-colors duration-200",
                                    isLaunching
                                        ? "cursor-not-allowed bg-[#1ca9b1]/70"
                                        : "bg-[#1ca9b1] hover:bg-[#17959c]"
                                )}
                            >
                                {isLaunching ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Launching...
                                    </>
                                ) : (
                                    <>Start Lab Now</>
                                )}
                            </button>
                            <p className="text-center text-[12px] text-[#a0a0a0]">
                                {lab.duration_minutes} minutes
                            </p>
                        </div>

                        <LabInfoCard lab={lab} />
                    </div>
                </div>
            </div>
        </div>
    )
}