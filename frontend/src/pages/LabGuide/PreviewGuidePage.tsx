// src/pages/LabGuide/PreviewGuidePage.tsx
import { useState, useEffect, useCallback } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Loader2, AlertCircle, GitBranch, Layers, Lock } from "lucide-react"
import { useLabGuides } from "@/hooks/LabGuide/useLabGuides"
import { useGuideVersions } from "@/hooks/LabGuide/useGuideVersions"
import { ResizableSplit } from "@/components/LabGuide/PreviewGuideLab/ResizableSplit"
import { GuidePanel } from "@/components/LabGuide/PreviewGuideLab/GuidePanel"
import { VersionSelector } from "@/components/LabGuide/PreviewGuideLab/VersionSelector"
import { VMConsole } from "@/components/LabGuide/PreviewGuideLab/VMConsole"
import type { LabGuide, GuideVersion } from "@/types/LabGuide"

export default function PreviewGuidePage() {
    const { guideId } = useParams<{ guideId: string }>()
    const [searchParams, setSearchParams] = useSearchParams()
    const { fetchGuide, isLoading: guideLoading } = useLabGuides()
    const { fetchVersion, isLoading: versionLoading } = useGuideVersions()

    const [guide, setGuide] = useState<LabGuide | null>(null)
    const [activeVersion, setActiveVersion] = useState<GuideVersion | null>(null)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [terminalLines, setTerminalLines] = useState<string[]>([
        "Welcome to the lab environment.",
        "Select a step and click 'Run' to execute commands here.",
        "",
    ])

    // Load guide and determine which version to preview
    const loadGuide = useCallback(async () => {
        if (!guideId) return
        try {
            const data = await fetchGuide(guideId)
            if (!data) return

            setGuide(data)

            // Check URL param for specific version, fallback to current_version
            const versionIdFromUrl = searchParams.get("version")
            if (versionIdFromUrl) {
                const version = await fetchVersion(guideId, versionIdFromUrl)
                if (version) setActiveVersion(version)
            } else if (data.current_version) {
                setActiveVersion(data.current_version)
            }
        } catch {
            // Error handled by hook
        }
    }, [guideId, fetchGuide, fetchVersion, searchParams])

    useEffect(() => {
        loadGuide()
    }, [loadGuide])

    const handleVersionChange = async (versionId: string) => {
        if (!guideId) return
        setSearchParams({ version: versionId })
        const version = await fetchVersion(guideId, versionId)
        if (version) {
            setActiveVersion(version)
            setCurrentStepIndex(0)
        }
    }

    const handleRunCommand = (command: string, label?: string) => {
        const timestamp = new Date().toLocaleTimeString()
        setTerminalLines((prev) => [
            ...prev,
            `[${timestamp}] $ ${label || command}`,
            `> Executing: ${command}...`,
            `> Command completed successfully.`,
            "",
        ])
    }

    const handleStepChange = (index: number) => {
        setCurrentStepIndex(index)
    }

    const isLoading = guideLoading || versionLoading

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f9f9f9]">
                <Loader2 className="h-8 w-8 animate-spin text-[#1ca9b1]" />
            </div>
        )
    }

    if (!guide) {
        return (
            <div className="flex h-full items-center justify-center bg-[#f9f9f9]">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-[#c4c4c4] mx-auto mb-3" />
                    <h2 className="text-lg font-semibold text-[#3a3a3a]">Guide not found</h2>
                    <p className="text-sm text-[#727373] mt-1">The requested guide could not be loaded.</p>
                </div>
            </div>
        )
    }

    // No version available
    if (!activeVersion) {
        return (
            <div className="flex flex-col h-full bg-[#f9f9f9]">
                <div className="bg-white border-b border-[#e8e8e8] px-6 py-4 shrink-0">
                    <h1 className="text-lg font-semibold text-[#3a3a3a]">{guide.title}</h1>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Lock className="h-12 w-12 text-[#c4c4c4] mx-auto mb-3" />
                        <h2 className="text-lg font-semibold text-[#3a3a3a]">No Version Available</h2>
                        <p className="text-sm text-[#727373] mt-1 max-w-sm mx-auto">
                            This guide has no published or draft versions yet. Create Version 1 to preview content.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const steps = activeVersion.steps || []
    const currentStep = steps[currentStepIndex]
    const targetVm = currentStep?.title || "lab-vm"

    return (
        <div className="flex flex-col h-full bg-[#f9f9f9]">
            {/* Header */}
            <div className="bg-white border-b border-[#e8e8e8] px-6 py-4 shrink-0">
                <div className="flex items-center justify-between w-full px-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-lg font-semibold text-[#3a3a3a] truncate max-w-md">
                                {guide.title}
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-[#727373] flex items-center gap-1">
                                    <Layers className="h-3 w-3" />
                                    {steps.length} steps
                                </span>
                                <span className="text-[#c4c4c4]">•</span>
                                <span className="text-xs text-[#727373] flex items-center gap-1">
                                    <GitBranch className="h-3 w-3" />
                                    v{activeVersion.version_number}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Version Selector */}
                        <VersionSelector
                            guideId={guide.id}
                            currentVersionId={activeVersion.id}
                            currentVersionNumber={activeVersion.version_number}
                            isPublished={activeVersion.is_published}
                            totalVersions={guide.total_versions}
                            onVersionChange={handleVersionChange}
                        />

                        <span className={cn(
                            "text-[10px] px-2 py-1 rounded-md font-medium uppercase tracking-wider",
                            activeVersion.is_published
                                ? "bg-green-50 text-green-600"
                                : "bg-amber-50 text-amber-600"
                        )}>
                            {activeVersion.is_published ? "Published" : "Draft"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Resizable Split */}
            <div className="flex-1 overflow-hidden">
                <ResizableSplit
                    left={
                        <GuidePanel
                            steps={steps}
                            currentStepIndex={currentStepIndex}
                            onStepChange={handleStepChange}
                            onRunCommand={handleRunCommand}
                        />
                    }
                    right={
                        <VMConsole
                            vmName={targetVm}
                            lines={terminalLines}
                        />
                    }
                    defaultLeftWidth={50}
                />
            </div>
        </div>
    )
}